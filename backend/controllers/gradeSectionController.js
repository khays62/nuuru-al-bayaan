import mongoose from 'mongoose';
import GradeSection from '../models/GradeSection.js';
import Subject from '../models/Subject.js';
import Shift from '../models/Shift.js';
import Grade from '../models/Grade.js';
import Enrollment from '../models/Enrollment.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import { parsePagination } from '../utils/pagination.js';
import { publishRealtime } from '../utils/realtimeBus.js';
// Note: Cohort and AcademicYear are no longer part of GradeSection. Uniformity per AY
// is enforced at Enrollment layer, not at GS layer.

function buildSort(sortParam) {
  if (!sortParam) return { createdAt: -1 };
  const [field, dirStr] = sortParam.split(':');
  const dir = dirStr === 'asc' ? 1 : -1;
  if (field === 'gradeName') return { 'grade.gradeName': dir };
  return { [field]: dir };
}

// GET /api/grades/sections
export const listGradeSections = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', grade, shift, section, sort } = req.query;
    const { pageNum, limitNum, skip } = parsePagination({ page, limit }, { defaultPage: 1, defaultLimit: 10, maxLimit: 100 });
    const sortObj = buildSort(sort);

    const match = {};

    // Teacher-safe scope: list only assigned gradeSections
    if (req.user?.role === 'teacher') {
      const teacherId = req.user?.teacherRef;
      if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
        return res.status(403).json({ message: 'Teacher account is missing teacherRef' });
      }
      const rows = await TeacherAssignment.find({ teacher: teacherId }).select('gradeSection').lean();
      const ids = [...new Set((rows || []).map(r => String(r.gradeSection)))].filter(mongoose.isValidObjectId);
      if (!ids.length) {
        return res.json({ data: [], meta: { page: 1, limit: limitNum, total: 0, totalPages: 1, sortBy: (sort||'createdAt:desc').split(':')[0], sortDir: (sort||'createdAt:desc').split(':')[1] || 'desc' } });
      }
      match._id = { $in: ids.map(id => new mongoose.Types.ObjectId(id)) };
    }
    if (grade) match.grade = new mongoose.Types.ObjectId(grade);
    if (shift) match.shift = new mongoose.Types.ObjectId(shift);
    if (section) match.section = section;

    const pipeline = [
      { $match: match },
      { $lookup: { from: 'grades', localField: 'grade', foreignField: '_id', as: 'grade' } },
      { $unwind: '$grade' },
      { $lookup: { from: 'shifts', localField: 'shift', foreignField: '_id', as: 'shift' } },
      { $unwind: '$shift' },
    ];
    if (search) {
      const safeQ = String(search).trim().slice(0, 64);
      const safe = safeQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      pipeline.push({ $match: { $or: [
        { 'grade.gradeName': { $regex: safe, $options: 'i' } },
        { section: { $regex: safe, $options: 'i' } }
      ] } });
    }
    pipeline.push({ $sort: sortObj });
    pipeline.push(
      {
        $facet: {
          data: [ { $skip: skip }, { $limit: limitNum } ],
          totalCount: [ { $count: 'count' } ]
        }
      }
    );

    const result = await GradeSection.aggregate(pipeline);
    const data = result[0]?.data || [];
    const total = result[0]?.totalCount?.[0]?.count || 0;
    const totalPages = Math.max(Math.ceil(total / limitNum), 1);

    // shape: populate-like response for frontend
    res.json({
      data: data.map(doc => ({
        _id: doc._id,
        section: doc.section,
        grade: { _id: doc.grade._id, gradeName: doc.grade.gradeName },
        shift: { _id: doc.shift._id, shiftName: doc.shift.shiftName },
        subjects: doc.subjects || [],
        capacity: doc.capacity || undefined,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
      meta: { page: pageNum, limit: limitNum, total, totalPages, sortBy: (sort||'createdAt:desc').split(':')[0], sortDir: (sort||'createdAt:desc').split(':')[1] || 'desc' }
    });
  } catch (err) {
    console.error('List grade sections error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/grades/sections/:id
export const getGradeSection = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

    if (req.user?.role === 'teacher') {
      const teacherId = req.user?.teacherRef;
      if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
        return res.status(403).json({ message: 'Teacher account is missing teacherRef' });
      }
      const ok = await TeacherAssignment.exists({ teacher: teacherId, gradeSection: id });
      if (!ok) return res.status(403).json({ message: 'Not assigned to this class' });
    }

    const cls = await GradeSection.findById(id)
      .populate('grade', 'gradeName')
      .populate('shift', 'shiftName')
      .populate('subjects', 'subjectName');
    if (!cls) return res.status(404).json({ message: 'Not found' });
    res.json(cls);
  } catch (err) {
    console.error('Get grade section error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/grades/sections
export const createGradeSection = async (req, res) => {
  try {
    let { grade, shift, section, subjects = [], capacity } = req.body;
    if (!grade || !shift) return res.status(400).json({ message: 'grade and shift are required' });

    const [gradeDoc, shiftDoc] = await Promise.all([
      Grade.findById(grade),
      Shift.findById(shift)
    ]);
    if (!gradeDoc) return res.status(400).json({ message: 'Invalid grade' });
    if (!shiftDoc) return res.status(400).json({ message: 'Invalid shift' });

  // Default section if empty
  if (!section || String(section).trim() === '') section = '1';

    // Subjects validation: ensure they belong to this grade
    if (subjects.length) {
      const subjectDocs = await Subject.find({ _id: { $in: subjects } });
      const foundIds = subjectDocs.map(s => s._id.toString());
      const missing = subjects.filter(id => !foundIds.includes(id));
      if (missing.length) return res.status(400).json({ message: 'Some subjects not found', missing });
      const valid = [];
      const removed = [];
      for (const s of subjectDocs) {
        const grades = (s.grades || []).map(g => g.toString());
        if (grades.includes(grade.toString())) valid.push(s._id); else removed.push(s.subjectName || s._id.toString());
      }
      subjects = valid;
      if (removed.length) req._removedSubjects = removed;
    }

    let created;
    try {
      created = await GradeSection.create({ section, capacity, grade, shift, subjects });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: 'Section already exists for this Grade/Shift/Section' });
      throw err;
    }

    const populated = await GradeSection.findById(created._id)
      .populate('grade', 'gradeName')
      .populate('shift', 'shiftName')
      .populate('subjects', 'subjectName');

    publishRealtime({ type: 'gradeSections:changed', id: String(created._id), ts: Date.now() });

    res.status(201).json({ data: populated, removedSubjects: req._removedSubjects || [] });
  } catch (err) {
    console.error('Create grade section error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/grades/sections/:id
export const updateGradeSection = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
    let { grade, shift, section, subjects = [], capacity } = req.body;
    const cls = await GradeSection.findById(id);
    if (!cls) return res.status(404).json({ message: 'Not found' });

    // Guard: structural lock if enrollments exist
    const enrollmentExists = await Enrollment.exists({ gradeSection: id });
    const structuralRequested = {
      grade: grade !== undefined && grade.toString() !== cls.grade.toString(),
      shift: shift !== undefined && shift.toString() !== cls.shift.toString()
    };
    if (enrollmentExists && (structuralRequested.grade || structuralRequested.shift)) {
      return res.status(409).json({
        message: 'Cannot modify grade or shift after students have been enrolled in this section.',
        code: 'CLASS_STRUCTURAL_LOCKED',
        blocked: Object.keys(structuralRequested).filter(k => structuralRequested[k])
      });
    }
    if (shift) {
      const shiftDoc = await Shift.findById(shift);
      if (!shiftDoc) return res.status(400).json({ message: 'Invalid shift' });
    }
    const gradeChanged = grade && grade.toString() !== cls.grade.toString();
    let removedSubjects = [];

    if (subjects && subjects.length) {
      const subjectDocs = await Subject.find({ _id: { $in: subjects } });
      const foundIds = subjectDocs.map(s => s._id.toString());
      const missing = subjects.filter(id => !foundIds.includes(id));
      if (missing.length) return res.status(400).json({ message: 'Some subjects not found', missing });
      const valid = [];
      for (const s of subjectDocs) {
        const grades = (s.grades || []).map(g => g.toString());
        const targetGrade = grade ? grade.toString() : cls.grade.toString();
        if (grades.includes(targetGrade)) valid.push(s._id); else removedSubjects.push(s.subjectName || s._id.toString());
      }
      subjects = valid;
    }

    if (gradeChanged && (!subjects || !subjects.length)) {
      if (cls.subjects && cls.subjects.length) {
        const subjectDocs = await Subject.find({ _id: { $in: cls.subjects } });
        const valid = [];
        for (const s of subjectDocs) {
          const grades = (s.grades || []).map(g => g.toString());
          if (grades.includes(grade.toString())) valid.push(s._id); else removedSubjects.push(s.subjectName || s._id.toString());
        }
        subjects = valid;
      }
    }

  if (capacity !== undefined) cls.capacity = capacity; // allowed
  let sectionChanged = false;
  if (section !== undefined && String(section).trim() !== '') { cls.section = section; sectionChanged = true; }
    if (grade !== undefined && !enrollmentExists) cls.grade = grade;
    if (shift !== undefined && !enrollmentExists) cls.shift = shift;
    // Before applying subject changes, compute which subjects are being removed
    let removedCandidateIds = [];
    if (subjects !== undefined) {
      const prev = (cls.subjects || []).map(id => id.toString());
      const next = (subjects || []).map(id => id.toString());
      removedCandidateIds = prev.filter(id => !next.includes(id));

      // Guard: prevent removing subjects that already have scores recorded for this class (any AY)
      if (removedCandidateIds.length) {
        try {
          const Exam = (await import('../models/Exam.js')).default;
          const ExamScore = (await import('../models/ExamScore.js')).default;
          const exams = await Exam.find({ gradeSection: cls._id }).select('_id').lean();
          const examIds = exams.map(e => e._id);
          if (examIds.length) {
            const count = await ExamScore.countDocuments({ exam: { $in: examIds }, subject: { $in: removedCandidateIds } });
            if (count > 0) {
              const subDocs = await Subject.find({ _id: { $in: removedCandidateIds } }).select('subjectName').lean();
              const blockedSubjects = subDocs.map(s => ({ _id: s._id, subjectName: s.subjectName }));
              return res.status(409).json({
                message: 'Cannot remove subjects that already have recorded scores in this class.',
                code: 'SUBJECTS_HAVE_SCORES',
                blockedSubjects
              });
            }
          }
        } catch (guardErr) {
          console.error('Subject removal guard error', guardErr);
          return res.status(500).json({ message: 'Server error' });
        }
      }

      cls.subjects = subjects;
    }

    // className removed from schema; labels are computed on the fly from grade+section on the client.

    try {
      await cls.save();
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: 'Section already exists for this Grade/Shift/Section' });
      throw err;
    }

    const populated = await GradeSection.findById(cls._id)
      .populate('grade', 'gradeName')
      .populate('shift', 'shiftName')
      .populate('subjects', 'subjectName')

    publishRealtime({ type: 'gradeSections:changed', id: String(cls._id), ts: Date.now() });
    res.json({ data: populated, removedSubjects, resyncNeeded: false });
  } catch (err) {
    console.error('Update grade section error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/grades/sections/:id/resync-cohort
export const resyncGradeSectionCohort = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
    const cls = await GradeSection.findById(id).select('_id');
    if (!cls) return res.status(404).json({ message: 'Not found' });
    // GS no longer carries cohort; resync sets active enrollments' cohort to null
    const targetCohort = null;
    const result = await Enrollment.updateMany(
      { gradeSection: id, status: 'active' },
      { $set: { cohort: targetCohort } }
    );

    publishRealtime({ type: 'students:changed', ts: Date.now() });
    publishRealtime({ type: 'gradeSections:changed', id: String(id), ts: Date.now() });
    res.json({ ok: true, matched: result.matchedCount ?? result.n, modified: result.modifiedCount ?? result.nModified, cohort: targetCohort });
  } catch (err) {
    console.error('Resync cohort error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/grades/sections/:id
export const deleteGradeSection = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

  const cls = await GradeSection.findById(id);
  if (!cls) return res.status(404).json({ message: 'Not found' });

  const activeCount = await Enrollment.countDocuments({ gradeSection: id, status: 'active' });
    if (activeCount > 0) {
      return res.status(409).json({
        message: 'Cannot delete section while active students are enrolled',
        code: 'CLASS_HAS_ACTIVE_ENROLLMENTS',
        activeCount
      });
    }

  await GradeSection.deleteOne({ _id: id });
    publishRealtime({ type: 'gradeSections:changed', id: String(id), ts: Date.now() });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete grade section error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
