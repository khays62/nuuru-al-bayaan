import mongoose from 'mongoose';
import Enrollment from '../models/Enrollment.js';
import Student from '../models/Student.js';
import GradeSection from '../models/GradeSection.js';
import TransferLog from '../models/TransferLog.js';
import { parsePagination } from '../utils/pagination.js';
import { publishRealtime } from '../utils/realtimeBus.js';

// GET /api/transfers/candidates
// Lists only ACTIVE students with ACTIVE latest enrollment, with optional filters and search
export const listTransferCandidates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      academicYear,
      grade,
      shift,
      gradeSectionId,
      sort
    } = req.query;

    const { pageNum, limitNum, skip } = parsePagination({ page, limit }, { defaultPage: 1, defaultLimit: 10, maxLimit: 100 });

    // Sorting defaults
    let sortField = 'studentCreatedAt';
    let sortDir = -1;
    if (sort) {
      const [f, d] = String(sort).split(':');
      const allowed = ['fullName', 'studentId', 'admissionDate', 'createdAt'];
      if (allowed.includes(f)) {
        sortField = f === 'createdAt' ? 'studentCreatedAt' : f;
        sortDir = d === 'asc' ? 1 : -1;
      }
    }

    // Enforce ACTIVE enrollment only
    const enrollmentMatch = { status: { $in: ['active'] } };
    const sectionId = gradeSectionId || req.query.classId; // legacy alias
    if (sectionId && mongoose.isValidObjectId(sectionId)) enrollmentMatch.gradeSection = new mongoose.Types.ObjectId(sectionId);
    if (academicYear && mongoose.isValidObjectId(academicYear)) enrollmentMatch.academicYear = new mongoose.Types.ObjectId(academicYear);
    if (grade && mongoose.isValidObjectId(grade)) enrollmentMatch.grade = new mongoose.Types.ObjectId(grade);
    if (shift && mongoose.isValidObjectId(shift)) enrollmentMatch.shift = new mongoose.Types.ObjectId(shift);

    // Search by name or studentId (case-insensitive)
    let searchStage = [];
    if (search) {
      const regex = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      searchStage = [
        { $match: { $or: [ { 'student.fullName': { $regex: regex } }, { 'student.studentId': { $regex: regex } } ] } }
      ];
    }

    const pipeline = [
      { $match: enrollmentMatch },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$student', latest: { $first: '$$ROOT' } } },
      // Join student and enforce Active status only
      { $lookup: { from: 'students', localField: '_id', foreignField: '_id', as: 'student' } },
      { $unwind: '$student' },
      { $match: { 'student.status': 'Active' } },
      ...searchStage,
      // Join class and lookups
      { $lookup: { from: 'gradesections', localField: 'latest.gradeSection', foreignField: '_id', as: 'class' } },
      { $unwind: { path: '$class', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'cohorts', localField: 'latest.cohort', foreignField: '_id', as: 'cohort' } },
      { $unwind: { path: '$cohort', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'grades', localField: 'class.grade', foreignField: '_id', as: 'grade' } },
      { $lookup: { from: 'shifts', localField: 'class.shift', foreignField: '_id', as: 'shift' } },
      { $lookup: { from: 'academicyears', localField: 'latest.academicYear', foreignField: '_id', as: 'ay' } },
      { $addFields: {
        grade: { $arrayElemAt: ['$grade.gradeName', 0] },
        shift: { $arrayElemAt: ['$shift.shiftName', 0] },
        academicYear: { $arrayElemAt: ['$ay.yearName', 0] },
      } },
      { $project: {
        _id: '$student._id',
        studentId: '$student.studentId',
        fullName: '$student.fullName',
        gender: '$student.gender',
        admissionDate: '$student.admissionDate',
        status: '$student.status',
        gradeDisplay: {
          $cond: [
            { $ifNull: ['$class._id', false] },
            { $concat: [
              { $ifNull: ['$grade', 'Grade'] }, ' - Sec ', { $ifNull: ['$class.section', '1'] },
              ' (', { $ifNull: ['$academicYear', ''] }, ' - ', { $ifNull: ['$shift', ''] }, ')'
            ] },
            null
          ]
        },
        section: '$class.section',
        cohort: '$cohort.name',
        contactNumber: '$student.contactNumber',
        gradeSectionId: '$class._id',
        grade: 1,
        shift: 1,
        academicYear: 1,
        studentCreatedAt: '$student.createdAt'
      } },
      { $sort: { [sortField]: sortDir, _id: 1 } },
      { $facet: { meta: [ { $count: 'total' } ], data: [ { $skip: skip }, { $limit: limitNum } ] } },
      { $unwind: { path: '$meta', preserveNullAndEmptyArrays: true } },
      { $addFields: { total: { $ifNull: ['$meta.total', 0] } } },
      { $project: { meta: 0 } }
    ];

    const result = await Enrollment.aggregate(pipeline);
    const aggregated = result[0] || { data: [], total: 0 };
    const totalPages = Math.ceil((aggregated.total || 0) / limitNum) || 1;
    return res.json({
      data: aggregated.data,
      meta: {
        page: pageNum,
        limit: limitNum,
        total: aggregated.total || 0,
        totalPages,
        sortBy: sortField === 'studentCreatedAt' ? 'createdAt' : sortField,
        sortDir: sortDir === 1 ? 'asc' : 'desc'
      }
    });
  } catch (err) {
    console.error('listTransferCandidates error', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// PATCH /api/transfers/:id
// Wrapper that ensures student is Active then delegates to student transfer handler
export const performTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });
    const stu = await Student.findById(id).select('status');
    if (!stu) return res.status(404).json({ message: 'Student not found' });
    if (stu.status !== 'Active') return res.status(400).json({ message: 'Only Active students can be transferred' });

    const { gradeSectionId, enrollmentId } = req.body || {};
    const targetAYRaw = (
      req.body?.targetAcademicYear ??
      req.body?.academicYearId ??
      req.body?.academicYear ??
      req.body?.targetAcademicYearName ??
      req.body?.academicYearName ??
      req.body?.yearName
    );
    if (!mongoose.isValidObjectId(gradeSectionId)) return res.status(400).json({ message: 'Invalid gradeSectionId' });

    const target = await GradeSection.findById(gradeSectionId).populate(['grade', 'shift']);
    if (!target) return res.status(404).json({ message: 'Target section not found' });

    if (typeof target.capacity === 'number' && target.capacity > 0) {
      const currentCount = await Enrollment.countDocuments({ gradeSection: target._id, status: 'active' });
      if (currentCount >= target.capacity) {
        return res.status(409).json({ message: 'Target section is full. Cannot transfer.' });
      }
    }

    let enrollment;
    if (enrollmentId) {
      if (!mongoose.isValidObjectId(enrollmentId)) return res.status(400).json({ message: 'Invalid enrollmentId' });
      enrollment = await Enrollment.findOne({ _id: enrollmentId, student: id });
    } else {
      enrollment = await Enrollment.findOne({ student: id }).sort({ createdAt: -1 });
    }
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    if (enrollment.status !== 'active') {
      return res.status(400).json({ message: 'Only active enrollments can be transferred' });
    }

    let targetAcademicYearId = null;
    if (targetAYRaw) {
      if (mongoose.isValidObjectId(targetAYRaw)) {
        targetAcademicYearId = String(targetAYRaw);
      } else if (typeof targetAYRaw === 'string' && targetAYRaw.trim()) {
        try {
          const AcademicYear = (await import('../models/AcademicYear.js')).default;
          const ayDoc = await AcademicYear.findOne({ yearName: targetAYRaw.trim() }).select('_id').lean();
          if (ayDoc?._id) targetAcademicYearId = String(ayDoc._id);
        } catch (ayErr) {
          console.warn('AY lookup by yearName failed:', ayErr);
        }
      }
      if (!targetAcademicYearId) {
        return res.status(400).json({ message: 'Invalid target Academic Year (provide valid ObjectId or yearName).', provided: targetAYRaw });
      }
    }

    if (targetAcademicYearId && String(targetAcademicYearId) !== String(enrollment.academicYear)) {
      const AcademicYear = (await import('../models/AcademicYear.js')).default;
      const [curAyDoc, tgtAyDoc] = await Promise.all([
        AcademicYear.findById(enrollment.academicYear).select('yearName').lean(),
        AcademicYear.findById(targetAcademicYearId).select('yearName').lean()
      ]);
      const parseStart = (yn) => {
        if (!yn || typeof yn !== 'string') return null;
        const m = yn.match(/^(\d{4})/);
        return m ? parseInt(m[1], 10) : null;
      };
      const curStart = parseStart(curAyDoc?.yearName);
      const tgtStart = parseStart(tgtAyDoc?.yearName);
      if (curStart == null || tgtStart == null) {
        return res.status(400).json({ message: 'Invalid Academic Year naming (YYYY-YYYY). Cannot compare ordering.' });
      }

      const existsInTargetAY = await Enrollment.findOne({ student: id, academicYear: targetAcademicYearId });

      if (tgtStart < curStart) {
        if (!existsInTargetAY) {
          return res.status(409).json({ message: 'Return not possible: no previous enrollment in the target AY.' });
        }
        if (String(existsInTargetAY.gradeSection) !== String(target._id)) {
          return res.status(409).json({ message: 'Return requires the original Grade/Shift/Section for that AY.' });
        }

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const now = new Date();
          await Enrollment.updateOne({ _id: enrollment._id }, { $set: { status: 'transferred', leftAt: now } }, { session });
          await Enrollment.updateOne({ _id: existsInTargetAY._id }, { $set: { status: 'active' }, $unset: { leftAt: '' } }, { session });
          await session.commitTransaction();
          session.endSession();

          try {
            const last = await TransferLog.findOne({ student: id }).sort({ date: -1, createdAt: -1 }).lean();
            if (last && String(last.fromGradeSection) === String(target._id) && String(last.toGradeSection) === String(enrollment.gradeSection) && !last.reverted) {
              const created = await TransferLog.create({
                student: id,
                fromGradeSection: enrollment.gradeSection,
                toGradeSection: target._id,
                byUser: req.user?._id || null,
                date: new Date(),
                reason: req.body?.reason || 'Revert',
                reverted: true,
                revertOf: last._id
              });
              await TransferLog.updateOne({ _id: last._id }, { $set: { reverted: true } });
              publishRealtime({ type: 'transfers:changed', id: String(id), ts: Date.now() });
              publishRealtime({ type: 'students:changed', id: String(id), ts: Date.now() });
              return res.json({ message: 'Returned to previous Academic Year.', enrollment: { ...existsInTargetAY.toObject?.() || existsInTargetAY, status: 'active' }, transferLog: created });
            } else {
              const created = await TransferLog.create({
                student: id,
                fromGradeSection: enrollment.gradeSection,
                toGradeSection: target._id,
                byUser: req.user?._id || null,
                date: new Date(),
                reason: req.body?.reason || 'Revert'
              });
              publishRealtime({ type: 'transfers:changed', id: String(id), ts: Date.now() });
              publishRealtime({ type: 'students:changed', id: String(id), ts: Date.now() });
              return res.json({ message: 'Returned to previous Academic Year.', enrollment: { ...existsInTargetAY.toObject?.() || existsInTargetAY, status: 'active' }, transferLog: created });
            }
          } catch (logErr) {
            console.warn('Return log warning:', logErr);
            publishRealtime({ type: 'transfers:changed', id: String(id), ts: Date.now() });
            publishRealtime({ type: 'students:changed', id: String(id), ts: Date.now() });
            return res.json({ message: 'Returned to previous Academic Year.', enrollment: { ...existsInTargetAY.toObject?.() || existsInTargetAY, status: 'active' } });
          }
        } catch (retErr) {
          await session.abortTransaction();
          session.endSession();
          console.error('Return to previous AY error', retErr);
          return res.status(500).json({ message: 'Server Error' });
        }
      }

      if (tgtStart > curStart) {
        if (existsInTargetAY) {
          return res.status(409).json({ message: 'Student already has an enrollment in the target Academic Year.' });
        }
      }
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const now = new Date();
        await Enrollment.updateOne({ _id: enrollment._id }, { $set: { status: 'transferred', leftAt: now } }, { session });
        const created = await Enrollment.create([{
          student: enrollment.student,
          gradeSection: target._id,
          academicYear: targetAcademicYearId,
          grade: target.grade._id,
          shift: target.shift._id,
          cohort: enrollment.cohort || undefined,
          status: 'active',
          sequenceInYear: 1,
          joinedAt: now
        }], { session });

        await session.commitTransaction();
        session.endSession();

        try {
          await TransferLog.create({
            student: enrollment.student,
            fromGradeSection: enrollment.gradeSection,
            toGradeSection: target._id,
            byUser: req.user?._id || null,
            date: new Date(),
            reason: req.body?.reason || 'Transfer'
          });
        } catch (logErr) {
          console.warn('Transfer log write warning (cross-AY):', logErr);
        }

        publishRealtime({ type: 'transfers:changed', id: String(id), ts: Date.now() });
        publishRealtime({ type: 'students:changed', id: String(id), ts: Date.now() });
        return res.json({ message: 'Enrollment transferred to future Academic Year (scores not migrated).', enrollment: created[0] });
      } catch (xErr) {
        await session.abortTransaction();
        session.endSession();
        console.error('Cross-AY transfer error', xErr);
        return res.status(500).json({ message: 'Server Error' });
      }
    }

    if (String(enrollment.gradeSection) === String(target._id)) {
      return res.json({ message: 'No changes: already in this section', enrollment });
    }

    const sourceSectionId = enrollment.gradeSection;
    const sourceGradeId = enrollment.grade;
    enrollment.gradeSection = target._id;
    enrollment.grade = target.grade._id;
    enrollment.shift = target.shift._id;
    await enrollment.save();

    try {
      if (String(sourceSectionId) !== String(target._id) && String(sourceGradeId) === String(target.grade._id)) {
        const Exam = (await import('../models/Exam.js')).default;
        const ExamType = (await import('../models/ExamType.js')).default;
        const ExamScore = (await import('../models/ExamScore.js')).default;

        let types = await ExamType.find({ isActive: true }).select('_id templateVersion').lean();
        if (!types.length) types = await ExamType.find({ templateVersion: 1 }).select('_id templateVersion').lean();
        const version = Number(types?.[0]?.templateVersion || 1);

        const ensureOps = types.map(t => (
          Exam.updateOne(
            { examType: t._id, academicYear: enrollment.academicYear, gradeSection: target._id, templateVersion: version },
            { $setOnInsert: { examType: t._id, academicYear: enrollment.academicYear, gradeSection: target._id, templateVersion: version } },
            { upsert: true }
          )
        ));
        await Promise.all(ensureOps);

        const sourceExams = await Exam.find({ academicYear: enrollment.academicYear, gradeSection: sourceSectionId, templateVersion: version }).select('_id examType').lean();
        const targetExams = await Exam.find({ academicYear: enrollment.academicYear, gradeSection: target._id, templateVersion: version }).select('_id examType').lean();
        const targetByType = new Map(targetExams.map(e => [String(e.examType), String(e._id)]));

        for (const se of sourceExams) {
          const tgtExamId = targetByType.get(String(se.examType));
          if (!tgtExamId) continue;
          await (await import('../models/ExamScore.js')).default.updateMany(
            { student: enrollment.student, exam: se._id },
            { $set: { exam: tgtExamId } }
          );
        }
      }
    } catch (migErr) {
      console.warn('Exam score migration warning:', migErr);
    }

    let transferLogDoc = null;
    try {
      const last = await TransferLog.findOne({ student: enrollment.student }).sort({ date: -1, createdAt: -1 }).lean();
      if (last && String(last.fromGradeSection) === String(target._id) && String(last.toGradeSection) === String(sourceSectionId) && !last.reverted) {
        const created = await TransferLog.create({
          student: enrollment.student,
          fromGradeSection: sourceSectionId,
          toGradeSection: target._id,
          byUser: req.user?._id || null,
          date: new Date(),
          reason: req.body?.reason || 'Revert',
          reverted: true,
          revertOf: last._id
        });
        await TransferLog.updateOne({ _id: last._id }, { $set: { reverted: true } });
        transferLogDoc = created;
      } else {
        transferLogDoc = await TransferLog.create({
          student: enrollment.student,
          fromGradeSection: sourceSectionId,
          toGradeSection: target._id,
          byUser: req.user?._id || null,
          date: new Date(),
          reason: req.body?.reason || 'Transfer'
        });
      }
    } catch (logErr) {
      console.warn('Transfer log write warning:', logErr);
    }

    publishRealtime({ type: 'transfers:changed', id: String(id), ts: Date.now() });
    publishRealtime({ type: 'students:changed', id: String(id), ts: Date.now() });
    return res.json({ message: 'Enrollment transferred', enrollment, transferLog: transferLogDoc });
  } catch (err) {
    console.error('performTransfer error', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// GET /api/transfers/logs
// Global transfers listing with pagination and optional search by student
export const listAllTransferLogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const { pageNum, limitNum, skip } = parsePagination({ page, limit }, { defaultPage: 1, defaultLimit: 10, maxLimit: 100 });

    const match = {};
    const pipeline = [
      { $match: match },
      { $sort: { date: -1, createdAt: -1 } },
      // Join student
      { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'student' } },
      { $unwind: '$student' },
      // Optional search by fullName or studentId
      ...(search ? [{ $match: { $or: [
        { 'student.fullName': { $regex: new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } },
        { 'student.studentId': { $regex: new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } }
      ] } }] : []),
      // Join sections with grade/shift for from/to labels
      { $lookup: { from: 'gradesections', localField: 'fromGradeSection', foreignField: '_id', as: 'from' } },
      { $unwind: '$from' },
      { $lookup: { from: 'grades', localField: 'from.grade', foreignField: '_id', as: 'fromGrade' } },
      { $lookup: { from: 'shifts', localField: 'from.shift', foreignField: '_id', as: 'fromShift' } },
      { $addFields: { fromGradeName: { $arrayElemAt: ['$fromGrade.gradeName', 0] }, fromShiftName: { $arrayElemAt: ['$fromShift.shiftName', 0] } } },
      { $lookup: { from: 'gradesections', localField: 'toGradeSection', foreignField: '_id', as: 'to' } },
      { $unwind: { path: '$to', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'grades', localField: 'to.grade', foreignField: '_id', as: 'toGrade' } },
      { $lookup: { from: 'shifts', localField: 'to.shift', foreignField: '_id', as: 'toShift' } },
      { $addFields: { toGradeName: { $arrayElemAt: ['$toGrade.gradeName', 0] }, toShiftName: { $arrayElemAt: ['$toShift.shiftName', 0] } } },
      { $project: {
        _id: 1,
        date: 1,
        reason: 1,
        reverted: 1,
        revertOf: 1,
        student: { _id: '$student._id', fullName: '$student.fullName', studentId: '$student.studentId' },
        from: { section: '$from.section', grade: '$fromGradeName', shift: '$fromShiftName' },
        to: { section: '$to.section', grade: '$toGradeName', shift: '$toShiftName' }
      } },
      { $facet: { meta: [ { $count: 'total' } ], data: [ { $skip: skip }, { $limit: limitNum } ] } },
      { $unwind: { path: '$meta', preserveNullAndEmptyArrays: true } },
      { $addFields: { total: { $ifNull: ['$meta.total', 0] } } },
      { $project: { meta: 0 } }
    ];

    const agg = await TransferLog.aggregate(pipeline);
    const out = agg[0] || { data: [], total: 0 };
    const totalPages = Math.ceil((out.total || 0) / limitNum) || 1;
    return res.json({ data: out.data, meta: { page: pageNum, limit: limitNum, total: out.total || 0, totalPages } });
  } catch (err) {
    console.error('listAllTransferLogs error', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

export default {
  listTransferCandidates,
  performTransfer,
  listAllTransferLogs,
};
