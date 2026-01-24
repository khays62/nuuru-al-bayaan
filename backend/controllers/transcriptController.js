import mongoose from 'mongoose';
import Student from '../models/Student.js';

const inferTemplateVersionForContext = async ({ academicYearId, gradeSectionId, studentId }) => {
  const ayOk = mongoose.isValidObjectId(academicYearId);
  const gsOk = mongoose.isValidObjectId(gradeSectionId);
  const stOk = mongoose.isValidObjectId(studentId);
  if (!ayOk || !gsOk) return null;

  const Exam = (await import('../models/Exam.js')).default;
  const ExamScore = (await import('../models/ExamScore.js')).default;

  const ay = new mongoose.Types.ObjectId(academicYearId);
  const gs = new mongoose.Types.ObjectId(gradeSectionId);

  // Prefer templateVersion where THIS student has scores for this AY+Section.
  if (stOk) {
    const sid = new mongoose.Types.ObjectId(studentId);
    const agg = await ExamScore.aggregate([
      { $match: { student: sid } },
      { $lookup: { from: 'exams', localField: 'exam', foreignField: '_id', as: 'examDoc' } },
      { $unwind: '$examDoc' },
      { $match: { 'examDoc.academicYear': ay, 'examDoc.gradeSection': gs } },
      { $group: { _id: '$examDoc.templateVersion', scoreCount: { $sum: 1 } } },
      { $sort: { scoreCount: -1, _id: -1 } },
      { $limit: 1 }
    ]);
    if (agg?.[0]?._id != null) return Number(agg[0]._id);
  }

  // Otherwise choose the version with most scores in the class for this AY+Section.
  const classAgg = await Exam.aggregate([
    { $match: { academicYear: ay, gradeSection: gs } },
    { $lookup: { from: 'examscores', localField: '_id', foreignField: 'exam', as: 'scores' } },
    { $addFields: { scoreCount: { $size: '$scores' } } },
    { $group: { _id: '$templateVersion', scoreCount: { $sum: '$scoreCount' }, examsCount: { $sum: 1 } } },
    { $sort: { scoreCount: -1, examsCount: -1, _id: -1 } },
    { $limit: 1 }
  ]);
  if (classAgg?.[0]?._id != null) return Number(classAgg[0]._id);

  // If no scores, use latest templateVersion present.
  const anyExam = await Exam.findOne({ academicYear: ay, gradeSection: gs })
    .sort({ templateVersion: -1 })
    .select('templateVersion')
    .lean();
  if (anyExam?.templateVersion != null) return Number(anyExam.templateVersion);

  return null;
};

// @desc    Aggregated full transcript across all enrollments (multi-year)
// @route   GET /api/students/:id/full-transcript (mounted in student routes for compatibility)
// @route   GET /api/transcripts/students/:id/full-transcript (new router)
export const getFullTranscript = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });
    const student = await Student.findById(id).select('fullName studentId').lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const Enrollment = (await import('../models/Enrollment.js')).default;
    // Fetch all enrollments (oldest first for chronological display)
    const enrollments = await Enrollment.find({ student: id })
      .sort({ joinedAt: 1, createdAt: 1 })
      .populate([
        { path: 'gradeSection', populate: [ { path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' } ] },
        { path: 'academicYear', select: 'yearName' },
        { path: 'grade', select: 'gradeName' },
        { path: 'shift', select: 'shiftName' }
      ])
      .lean();

    // Bring in transfers (no pagination) for context
    const TransferLog = (await import('../models/TransferLog.js')).default;
    const userModelRegisteredFT = !!mongoose.models.User;
    let transfersQuery = TransferLog.find({ student: id })
      .sort({ date: 1, createdAt: 1 })
      .populate({ path: 'fromGradeSection', populate: [ { path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' } ] })
      .populate({ path: 'toGradeSection', populate: [ { path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' } ] });
    if (userModelRegisteredFT) {
      transfersQuery = transfersQuery.populate({ path: 'byUser', select: 'fullName email' });
    }
    const transfers = await transfersQuery.lean();

    // Helper to build transcript for one enrollment (templateVersion-aware)
    const Exam = (await import('../models/Exam.js')).default;
    const ExamType = (await import('../models/ExamType.js')).default;
    const ExamScore = (await import('../models/ExamScore.js')).default;
    const GradeSection = (await import('../models/GradeSection.js')).default;
    const Subject = (await import('../models/Subject.js')).default;


    const enrollmentTranscripts = [];
    for (const enr of enrollments) {
      const academicYearId = String(enr.academicYear?._id || enr.academicYear);
      const gradeSectionId = String(enr.gradeSection?._id || enr.gradeSection);
      if (!academicYearId || !gradeSectionId) continue;

      const version = await inferTemplateVersionForContext({ academicYearId, gradeSectionId, studentId: id });

      // Exams for this AY + section + resolved templateVersion
      const examsQuery = { academicYear: academicYearId, gradeSection: gradeSectionId };
      if (version != null) examsQuery.templateVersion = version;
      const exams = await Exam.find(examsQuery).select('_id examType templateVersion').lean();
      if (!exams.length) {
        enrollmentTranscripts.push({ enrollmentId: enr._id, transcript: { examTypes: [], subjects: [], rows: [], overall: { total: 0, average: 0 }, templateVersion: version } });
        continue;
      }
      const examTypeIds = [...new Set(exams.map(e => String(e.examType)))];
      const examTypesDocs = await ExamType.find({ _id: { $in: examTypeIds } }).select('typeName order maxScore').lean();
      const examTypeMap = Object.fromEntries(examTypesDocs.map(t => [String(t._id), { typeName: t.typeName, order: t.order, maxScore: t.maxScore }]));
      const examTypes = examTypeIds
        .map(eid => ({ _id: eid, typeName: examTypeMap[eid]?.typeName || 'Exam', order: examTypeMap[eid]?.order || 0, maxScore: examTypeMap[eid]?.maxScore || 0 }))
        .sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)) || (a.typeName || '').localeCompare(b.typeName || ''));
      const examIds = exams.map(e => e._id);
      const gsDoc = await GradeSection.findById(gradeSectionId).select('subjects').lean();
      const subjectIds = (gsDoc?.subjects || []).map(sid => new mongoose.Types.ObjectId(sid));
      if (!subjectIds.length) {
        enrollmentTranscripts.push({ enrollmentId: enr._id, transcript: { examTypes, subjects: [], rows: [], overall: { total: 0, average: 0 }, templateVersion: version } });
        continue;
      }
      const subjectDocs = await Subject.find({ _id: { $in: subjectIds } }).select('subjectName').lean();
      const subjectNameMap = Object.fromEntries(subjectDocs.map(s => [String(s._id), s.subjectName]));
      const subjects = subjectIds.map(sid => ({ _id: sid, subjectName: subjectNameMap[String(sid)] || 'Subject' }));
      const scores = await ExamScore.find({ student: id, exam: { $in: examIds }, subject: { $in: subjectIds } }).select('subject exam scoreObtained').lean();
      const examIdToTypeId = Object.fromEntries(exams.map(e => [String(e._id), String(e.examType)]));
      const rows = subjects.map(su => {
        const subjectIdStr = String(su._id);
        const perMap = {};
        for (const et of examTypes) perMap[String(et._id)] = 0;
        for (const sc of scores) {
          if (String(sc.subject) !== subjectIdStr) continue;
          const etId = examIdToTypeId[String(sc.exam)];
          if (!etId) continue;
          perMap[etId] += Number(sc.scoreObtained || 0);
        }
        const perExamList = examTypes.map(et => ({ examTypeId: et._id, typeName: et.typeName, score: Number(perMap[String(et._id)] || 0) }));
        const total = perExamList.reduce((a,b)=> a + (b.score||0), 0);
        const average = subjects.length ? total : 0;
        return { subjectId: su._id, subjectName: su.subjectName, exams: perExamList, total, average };
      });
      const overallTotal = rows.reduce((a,b)=> a + (b.total||0), 0);
      const overallAverage = subjects.length ? (overallTotal / subjects.length) : 0;
      enrollmentTranscripts.push({ enrollmentId: enr._id, transcript: { examTypes, subjects, rows, overall: { total: overallTotal, average: overallAverage }, templateVersion: version } });
    }

    // Merge transcripts back into enrollment objects
    const transcriptByEnrollment = new Map(
      enrollmentTranscripts.map(et => [String(et.enrollmentId), et.transcript])
    );
    const enrichedEnrollments = enrollments.map(en => {
      const enrichedGradeSection = (en.gradeSection && en.gradeSection.section)
        ? {
            _id: en.gradeSection._id,
            section: en.gradeSection.section,
            grade: en.gradeSection.grade?.gradeName || en.grade?.gradeName,
            shift: en.gradeSection.shift?.shiftName || en.shift?.shiftName
          }
        : en.gradeSection;
      return {
        enrollmentId: en._id,
        academicYear: en.academicYear?.yearName
          ? { _id: en.academicYear._id, yearName: en.academicYear.yearName }
          : en.academicYear,
        gradeSection: enrichedGradeSection,
        joinedAt: en.joinedAt,
        leftAt: en.leftAt,
        status: en.status,
        transcript: transcriptByEnrollment.get(String(en._id)) || {
          examTypes: [],
          subjects: [],
          rows: [],
          overall: { total: 0, average: 0 }
        }
      };
    });

    // Simple cumulative summary (sum totals across enrollments)
    let cumulativeTotal = 0; let cumulativeSubjects = new Set();
    enrichedEnrollments.forEach(en => {
      cumulativeTotal += en.transcript.overall.total || 0;
      (en.transcript.subjects || []).forEach(s => cumulativeSubjects.add(String(s._id)));
    });
    const cumulativeAverage = enrichedEnrollments.length ? (cumulativeTotal / (cumulativeSubjects.size || 1)) : 0;

    res.json({
      student,
      enrollments: enrichedEnrollments,
      transfers,
      summary: {
        enrollmentCount: enrichedEnrollments.length,
        distinctSubjects: cumulativeSubjects.size,
        cumulativeTotal,
        cumulativeAverage
      }
    });
  } catch (err) {
    console.error('getFullTranscript error', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Overall multi-level summary for a student (fair, weighted)
// @route   GET /api/transcripts/students/:id/overall-summary
// Response: { student, overallTotal, weightedAverage, levels: [{ enrollmentId, total, average, rank, subjectsCount, classSize }],
//             percentileWeighted, rankLatestOutOf, rankLatest }
export const getOverallSummary = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });
    const student = await Student.findById(id).select('fullName studentId').lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const Enrollment = (await import('../models/Enrollment.js')).default;
    // Oldest → latest for stable ordering
    const enrollments = await Enrollment.find({ student: id })
      .sort({ joinedAt: 1, createdAt: 1 })
      .select('_id academicYear gradeSection joinedAt createdAt')
      .lean();
    if (!enrollments.length) {
      return res.json({ student, overallTotal: 0, weightedAverage: 0, levels: [], percentileWeighted: 0, rankLatestOutOf: 0, rankLatest: null });
    }

    // For each enrollment, call exam summary (overall) to get total/average/rank + subjects list and class size
    // Minimal aggregation using ExamScore per enrollment (decoupled from examController).
    const Exam = (await import('../models/Exam.js')).default;
    const ExamScore = (await import('../models/ExamScore.js')).default;
    const GradeSection = (await import('../models/GradeSection.js')).default;

    const levels = [];
    for (const en of enrollments) {
      const academicYearId = String(en.academicYear?._id || en.academicYear);
      const gradeSectionId = String(en.gradeSection?._id || en.gradeSection);
      if (!academicYearId || !gradeSectionId) continue;

      const version = await inferTemplateVersionForContext({ academicYearId, gradeSectionId, studentId: id });
      const examsQuery = { academicYear: academicYearId, gradeSection: gradeSectionId };
      if (version != null) examsQuery.templateVersion = version;
      const exams = await Exam.find(examsQuery).select('_id').lean();
      const examIds = exams.map(e => e._id);
      if (!examIds.length) {
        levels.push({ enrollmentId: en._id, total: 0, average: 0, rank: null, subjectsCount: 0, classSize: 0 });
        continue;
      }
      const gs = await GradeSection.findById(gradeSectionId).select('subjects').lean();
      const subjectIds = (gs?.subjects || []).map(id => new mongoose.Types.ObjectId(id));
      const subjectsCount = subjectIds.length;
      // Determine class members (active by default)
      const EnrollmentModel = (await import('../models/Enrollment.js')).default;
      const enrolls = await EnrollmentModel.find({ academicYear: academicYearId, gradeSection: gradeSectionId, status: { $in: ['active'] } }).select('student').lean();
      const classStudentIds = [...new Set(enrolls.map(e => String(e.student)))];
      const classSize = classStudentIds.length;
      // Totals per student
      let studentTotals = [];
      if (subjectsCount && classSize) {
        const scores = await ExamScore.aggregate([
          { $match: { exam: { $in: examIds }, subject: { $in: subjectIds }, student: { $in: classStudentIds.map(s => new mongoose.Types.ObjectId(s)) } } },
          { $group: { _id: '$student', total: { $sum: '$scoreObtained' } } }
        ]);
        studentTotals = scores.map(s => ({ studentId: String(s._id), total: Number(s.total || 0) }));
      }
      // Sort and rank
      studentTotals.sort((a, b) => b.total - a.total);
      const rankMap = new Map(studentTotals.map((r, idx) => [r.studentId, idx + 1]));
      const meTotal = (await ExamScore.aggregate([
        { $match: { exam: { $in: examIds }, subject: { $in: subjectIds }, student: new mongoose.Types.ObjectId(id) } },
        { $group: { _id: '$student', total: { $sum: '$scoreObtained' } } }
      ]))[0]?.total || 0;
      // average per level: total / subjectsCount
      const meAvg = subjectsCount ? (Number(meTotal) / subjectsCount) : 0;
      const meRank = rankMap.get(String(id)) || null;
      levels.push({ enrollmentId: en._id, total: Number(meTotal || 0), average: meAvg, rank: meRank, subjectsCount, classSize });
    }

    const overallTotal = levels.reduce((a, b) => a + (b.total || 0), 0);
    const subjectsSum = levels.reduce((a, b) => a + (b.subjectsCount || 0), 0);
    const weightedAverage = subjectsSum ? (overallTotal / subjectsSum) : 0;

    // Weighted percentile across levels (weights = subjectsCount). percentile_i = 1 - (rank-1)/classSize
    const parts = levels.filter(l => Number.isFinite(l.rank) && l.classSize > 0).map(l => {
      const percentile = 1 - ((Number(l.rank) - 1) / Number(l.classSize));
      const w = Number(l.subjectsCount || 0);
      return { percentile, w };
    });
    const wSum = parts.reduce((a, b) => a + b.w, 0);
    const percentileWeighted = wSum ? (parts.reduce((a, b) => a + (b.percentile * b.w), 0) / wSum) : 0;
    const latest = levels[levels.length - 1] || { classSize: 0 };
    const rankLatestOutOf = latest.classSize || 0;
    const rankLatest = latest.rank || null;
    // Convert weighted percentile to display rank within latest class size (optional helper for UI)
    const rankFromWeightedInLatest = rankLatestOutOf ? (Math.round((1 - percentileWeighted) * rankLatestOutOf) + 1) : null;
    // ---------------------------------------------------------------------
    // Cumulative multi-level rank within latest class (based on overallTotal)
    // ---------------------------------------------------------------------
    // Efficient cumulative rank: aggregate total scores across entire history per roster student (single pass)
    let cumulativeRank = null; let cumulativeRankOutOf = 0;
    try {
      const latestEnrollment = enrollments[enrollments.length - 1];
      if (latestEnrollment) {
        const latestAYId = String(latestEnrollment.academicYear?._id || latestEnrollment.academicYear);
        const latestGSId = String(latestEnrollment.gradeSection?._id || latestEnrollment.gradeSection);
        if (latestAYId && latestGSId && mongoose.isValidObjectId(latestAYId) && mongoose.isValidObjectId(latestGSId)) {
          const EnrollmentModel = (await import('../models/Enrollment.js')).default;
          const ExamScore = (await import('../models/ExamScore.js')).default;
          const rosterStatuses = ['active','inactive','promoted','graduated','transferred','withdrawn'];
          const rosterEnrollments = await EnrollmentModel.find({ academicYear: latestAYId, gradeSection: latestGSId, status: { $in: rosterStatuses } }).select('student').lean();
          const rosterStudentIds = [...new Set(rosterEnrollments.map(r => String(r.student)))];
          cumulativeRankOutOf = rosterStudentIds.length;
          if (rosterStudentIds.length) {
            const agg = await ExamScore.aggregate([
              { $match: { student: { $in: rosterStudentIds.map(s => new mongoose.Types.ObjectId(s)) } } },
              { $group: { _id: '$student', total: { $sum: '$scoreObtained' } } }
            ]);
            const list = agg.map(a => ({ studentId: String(a._id), overallTotal: Number(a.total || 0) }));
            list.sort((a,b)=> b.overallTotal - a.overallTotal);
            const rankMap = new Map(list.map((r, idx) => [r.studentId, idx + 1]));
            cumulativeRank = rankMap.get(String(id)) || null;
          }
        }
      }
    } catch (e) {
      console.error('cumulative rank computation error', e);
    }

    return res.json({
      student,
      levels,
      overallTotal,
      weightedAverage,
      percentileWeighted,
      rankLatestOutOf,
      rankLatest,
      rankFromWeightedInLatest,
      cumulativeRank,
      cumulativeRankOutOf
    });
  } catch (err) {
    console.error('getOverallSummary error', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Overall fair ranks for all students in a class (latest class comparison using weighted percentile across their histories)
// @route   GET /api/transcripts/classes/:academicYearId/:gradeSectionId/overall-ranks
// Query: enrollmentStatus? (default 'active')
// Response: { results: [{ studentId, fullName, percentileWeighted, rank, rankOutOf, overallTotal, weightedAverage }], rankOutOf }
export const getClassOverallRanks = async (req, res) => {
  try {
    const { academicYearId, gradeSectionId } = req.params;
    const enrollmentStatus = (req.query.enrollmentStatus || 'active').toLowerCase();
    const mode = String(req.query.mode || 'fair').toLowerCase(); // 'fair' (weighted percentile) | 'cumulative'
    if (!mongoose.isValidObjectId(academicYearId) || !mongoose.isValidObjectId(gradeSectionId)) {
      return res.status(400).json({ message: 'academicYearId and gradeSectionId are required' });
    }

    const Enrollment = (await import('../models/Enrollment.js')).default;
    const StudentModel = (await import('../models/Student.js')).default; // needed here for name map
    const Exam = (await import('../models/Exam.js')).default;
    const ExamScore = (await import('../models/ExamScore.js')).default;
    const GradeSection = (await import('../models/GradeSection.js')).default;

    // Determine class roster
    let statusFilter = ['active'];
    if (['all','inactive','promoted','graduated','transferred','withdrawn'].includes(enrollmentStatus)) {
      statusFilter = enrollmentStatus === 'all' ? ['active','inactive','promoted','graduated','transferred','withdrawn'] : [enrollmentStatus];
    }
    const enrolls = await Enrollment.find({ academicYear: academicYearId, gradeSection: gradeSectionId, status: { $in: statusFilter } }).select('student').lean();
    const studentIds = [...new Set(enrolls.map(e => String(e.student)))];
    if (!studentIds.length) return res.json({ results: [], rankOutOf: 0 });

    const studentsDocs = await StudentModel.find({ _id: { $in: studentIds } }).select('fullName').lean();
    const nameMap = Object.fromEntries(studentsDocs.map(s => [String(s._id), s.fullName]));

    // For each student, compute their multi-level metrics
    const results = [];
    for (const sid of studentIds) {
      // Fetch all enrollments for this student (chronological)
      const personEnrollments = await Enrollment.find({ student: sid })
        .sort({ joinedAt: 1, createdAt: 1 })
        .select('_id academicYear gradeSection')
        .lean();
      let levels = [];
      for (const en of personEnrollments) {
        const ayId = String(en.academicYear?._id || en.academicYear);
        const gsId = String(en.gradeSection?._id || en.gradeSection);
        if (!ayId || !gsId) continue;

        const version = await inferTemplateVersionForContext({ academicYearId: ayId, gradeSectionId: gsId, studentId: sid });
        const examsQuery = { academicYear: ayId, gradeSection: gsId };
        if (version != null) examsQuery.templateVersion = version;
        const exams = await Exam.find(examsQuery).select('_id').lean();
        const examIds = exams.map(e => e._id);
        if (!examIds.length) { levels.push({ total: 0, subjectsCount: 0, classSize: 0, rank: null }); continue; }
        const gs = await GradeSection.findById(gsId).select('subjects').lean();
        const subjectIds = (gs?.subjects || []).map(id => new mongoose.Types.ObjectId(id));
        const subjectsCount = subjectIds.length;
        const enrollsClass = await Enrollment.find({ academicYear: ayId, gradeSection: gsId, status: { $in: ['active'] } }).select('student').lean();
        const classStudentIds = [...new Set(enrollsClass.map(e => String(e.student)))];
        const classSize = classStudentIds.length;
        const totalsAgg = await ExamScore.aggregate([
          { $match: { exam: { $in: examIds }, subject: { $in: subjectIds }, student: { $in: classStudentIds.map(x => new mongoose.Types.ObjectId(x)) } } },
          { $group: { _id: '$student', total: { $sum: '$scoreObtained' } } }
        ]);
        const sorted = totalsAgg.map(t => ({ studentId: String(t._id), total: Number(t.total || 0) })).sort((a,b)=> b.total - a.total);
        const rankMap = new Map(sorted.map((r, idx)=> [r.studentId, idx + 1]));
        const meAgg = await ExamScore.aggregate([
          { $match: { exam: { $in: examIds }, subject: { $in: subjectIds }, student: new mongoose.Types.ObjectId(sid) } },
          { $group: { _id: '$student', total: { $sum: '$scoreObtained' } } }
        ]);
        const meTotal = Number(meAgg[0]?.total || 0);
        const meRank = rankMap.get(String(sid)) || null;
        levels.push({ total: meTotal, subjectsCount, classSize, rank: meRank });
      }
      const overallTotal = levels.reduce((a,b)=> a + (b.total||0), 0);
      const subjectsSum = levels.reduce((a,b)=> a + (b.subjectsCount||0), 0);
      const weightedAverage = subjectsSum ? (overallTotal / subjectsSum) : 0;
      if (mode === 'cumulative') {
        // Rank by overallTotal desc (pure cumulative across levels)
        results.push({ studentId: sid, fullName: nameMap[sid] || 'Student', overallTotal, weightedAverage });
      } else {
        // fair (default): weighted percentile across levels
        const parts = levels.filter(l => Number.isFinite(l.rank) && l.classSize > 0).map(l => {
          const percentile = 1 - ((Number(l.rank) - 1) / Number(l.classSize));
          const w = Number(l.subjectsCount || 0);
          return { percentile, w };
        });
        const wSum = parts.reduce((a,b)=> a + b.w, 0);
        const percentileWeighted = wSum ? (parts.reduce((a,b)=> a + (b.percentile * b.w), 0) / wSum) : 0;
        results.push({ studentId: sid, fullName: nameMap[sid] || 'Student', percentileWeighted, overallTotal, weightedAverage });
      }
    }

    // Sort and rank
    if (mode === 'cumulative') {
      results.sort((a,b)=> b.overallTotal - a.overallTotal);
    } else {
      results.sort((a,b)=> b.percentileWeighted - a.percentileWeighted);
    }
    const rankOutOf = results.length;
    const ranked = results.map((r, idx)=> ({ ...r, rank: idx + 1, rankOutOf }));
    return res.json({ results: ranked, rankOutOf });
  } catch (err) {
    console.error('getClassOverallRanks error', err);
    res.status(500).json({ message: 'Server Error' });
  }
};
