import mongoose from 'mongoose';
import ExamType from '../models/ExamType.js';
import Exam from '../models/Exam.js';
import ExamScore from '../models/ExamScore.js';
import Enrollment from '../models/Enrollment.js';
import Student from '../models/Student.js';
import Subject from '../models/Subject.js';

const isId = (id) => mongoose.isValidObjectId(id);

export const getExamTypes = async (req, res) => {
  try {
    const types = await ExamType.find({}).sort({ typeName: 1 }).lean();
    res.json(types);
  } catch (err) {
    console.error('getExamTypes error', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const ensureExams = async (req, res) => {
  try {
    const { academicYearId, gradeSectionId } = req.body;
    if (!isId(academicYearId) || !isId(gradeSectionId)) {
      return res.status(400).json({ message: 'academicYearId and gradeSectionId are required' });
    }

    const types = await ExamType.find({}).lean();
    const ops = types.map((t) => (
      Exam.updateOne(
        { examType: t._id, academicYear: academicYearId, gradeSection: gradeSectionId },
        { $setOnInsert: { examType: t._id, academicYear: academicYearId, gradeSection: gradeSectionId } },
        { upsert: true }
      )
    ));
    await Promise.all(ops);

    const exams = await Exam.find({ academicYear: academicYearId, gradeSection: gradeSectionId })
      .populate('examType', 'typeName')
      .lean();
    res.json(exams.map(e => ({ examId: e._id, examTypeId: e.examType?._id || e.examType, typeName: e.examType?.typeName })));
  } catch (err) {
    console.error('ensureExams error', err);
    if (err.code === 11000) return res.status(409).json({ message: 'Duplicate exam combination' });
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getExamGrid = async (req, res) => {
  try {
    const { academicYearId, gradeSectionId, subjectId } = req.query;
    if (!isId(academicYearId) || !isId(gradeSectionId) || !isId(subjectId)) {
      return res.status(400).json({ message: 'academicYearId, gradeSectionId and subjectId are required' });
    }

    // Ensure exams exist for the given AY + section
    const types = await ExamType.find({}).sort({ typeName: 1 }).lean();
    const ensureOps = types.map((t) => (
      Exam.updateOne(
        { examType: t._id, academicYear: academicYearId, gradeSection: gradeSectionId },
        { $setOnInsert: { examType: t._id, academicYear: academicYearId, gradeSection: gradeSectionId } },
        { upsert: true }
      )
    ));
    await Promise.all(ensureOps);

    const exams = await Exam.find({ academicYear: academicYearId, gradeSection: gradeSectionId })
      .populate('examType', 'typeName')
      .lean();
    const columns = exams
      .map(e => ({ examId: e._id, examTypeId: e.examType?._id || e.examType, typeName: e.examType?.typeName }))
      .sort((a, b) => a.typeName.localeCompare(b.typeName));

    // Active students in this section and academic year
    const enrolls = await Enrollment.find({ academicYear: academicYearId, gradeSection: gradeSectionId, status: 'active' }).select('student').lean();
    const studentIds = [...new Set(enrolls.map(e => String(e.student)))];
    const studentsDocs = await Student.find({ _id: { $in: studentIds } }).select('fullName').lean();
    const students = studentsDocs
      .map(s => ({ studentId: s._id, fullName: s.fullName }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    const examIds = exams.map(e => e._id);
    const scores = await ExamScore.find({ subject: subjectId, exam: { $in: examIds }, student: { $in: studentIds } })
      .select('student exam subject scoreObtained')
      .lean();

    res.json({ students, columns, scores });
  } catch (err) {
    console.error('getExamGrid error', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const upsertScore = async (req, res) => {
  try {
    const { studentId, examId, subjectId, scoreObtained } = req.body || {};
    if (!isId(studentId) || !isId(examId) || !isId(subjectId)) {
      return res.status(400).json({ message: 'studentId, examId, subjectId are required' });
    }
    const scoreNum = Number(scoreObtained);
    if (!Number.isFinite(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      return res.status(400).json({ message: 'scoreObtained must be between 0 and 100' });
    }

    const exam = await Exam.findById(examId).lean();
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // coherence: student must be actively enrolled in same AY + section
    const active = await Enrollment.findOne({ student: studentId, academicYear: exam.academicYear, gradeSection: exam.gradeSection, status: 'active' }).lean();
    if (!active) return res.status(409).json({ message: 'Student is not active in this section/year' });

    const updated = await ExamScore.findOneAndUpdate(
      { student: studentId, exam: examId, subject: subjectId },
      { $set: { scoreObtained: scoreNum } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({ message: 'Saved', score: updated });
  } catch (err) {
    console.error('upsertScore error', err);
    if (err.code === 11000) return res.status(409).json({ message: 'Duplicate score combination' });
    res.status(500).json({ message: 'Server Error' });
  }
};

// Basic subject summary (rank per subject). Overall summary will be expanded on the Result page.
export const getSummary = async (req, res) => {
  try {
    const { academicYearId, gradeSectionId } = req.query;
    if (!isId(academicYearId) || !isId(gradeSectionId)) {
      return res.status(400).json({ message: 'academicYearId and gradeSectionId are required' });
    }

    const mode = (req.query.mode || 'subject').toLowerCase();
    const subjectId = req.query.subjectId && isId(req.query.subjectId) ? req.query.subjectId : null;
    const examTypeId = req.query.examTypeId && isId(req.query.examTypeId) ? req.query.examTypeId : null;
    const topN = req.query.topN ? Math.max(parseInt(req.query.topN) || 0, 0) : 0;
    const bottomN = req.query.bottomN ? Math.max(parseInt(req.query.bottomN) || 0, 0) : 0;

    // Common set: exams, students
    const exams = await Exam.find({ academicYear: academicYearId, gradeSection: gradeSectionId }).select('_id examType').lean();
    const examIds = exams.map(e => e._id);
    if (!examIds.length) return res.json({ results: [], classAverage: 0 });

    const enrolls = await Enrollment.find({ academicYear: academicYearId, gradeSection: gradeSectionId, status: 'active' }).select('student').lean();
    const studentIds = [...new Set(enrolls.map(e => String(e.student)))];
    if (!studentIds.length) return res.json({ results: [], classAverage: 0 });

    const studentsDocs = await Student.find({ _id: { $in: studentIds } }).select('fullName').lean();
    const nameMap = Object.fromEntries(studentsDocs.map(s => [String(s._id), s.fullName]));

  let pipelineMatch = { exam: { $in: examIds }, student: { $in: studentIds.map(id => new mongoose.Types.ObjectId(id)) } };
  let denomPerStudent = null; // for averages per mode
  let subjectIdsForReport = [];

    if (mode === 'subject') {
      if (!subjectId) {
        return res.status(400).json({ message: 'subjectId is required for mode=subject' });
      }
      pipelineMatch = { ...pipelineMatch, subject: new mongoose.Types.ObjectId(subjectId) };
      // For breakdown columns, limit to just this subject
      subjectIdsForReport = [new mongoose.Types.ObjectId(subjectId)];
      // Average for subject mode will equal the subject total (weights sum to 100)
      denomPerStudent = { type: 'subjects', count: 1 };
    } else if (mode === 'overall') {
      // include all subjects assigned to this gradeSection
      const gs = await (await import('../models/GradeSection.js')).default.findById(gradeSectionId).select('subjects').lean();
      const subjectIds = (gs?.subjects || []).map(id => new mongoose.Types.ObjectId(id));
      if (!subjectIds.length) return res.json({ results: [], classAverage: 0, subjects: [] });
      pipelineMatch = { ...pipelineMatch, subject: { $in: subjectIds } };
      // denominator = number of subjects included (constant across students)
      var subjectsCount = subjectIds.length; // var so closure picks it below
      denomPerStudent = { type: 'subjects', count: subjectsCount };
      subjectIdsForReport = subjectIds;
  } else if (mode === 'examtype' || mode === 'exam-type') {
      if (!examTypeId) return res.status(400).json({ message: 'examTypeId is required for mode=examType' });
      const examIdsForType = exams.filter(e => String(e.examType) === String(examTypeId)).map(e => e._id);
      if (!examIdsForType.length) return res.json({ results: [], classAverage: 0, subjects: [] });
      pipelineMatch = { ...pipelineMatch, exam: { $in: examIdsForType } };
      if (subjectId) {
        pipelineMatch = { ...pipelineMatch, subject: new mongoose.Types.ObjectId(subjectId) };
        subjectIdsForReport = [new mongoose.Types.ObjectId(subjectId)];
      } else {
        const gs = await (await import('../models/GradeSection.js')).default.findById(gradeSectionId).select('subjects').lean();
        subjectIdsForReport = (gs?.subjects || []).map(id => new mongoose.Types.ObjectId(id));
      }
      // if subject provided, denom = 1 subject; else denom = number of subjects assigned
      if (subjectId) {
        denomPerStudent = { type: 'subjects', count: 1 };
      } else {
        const subjectsCount = subjectIdsForReport?.length || 0;
        denomPerStudent = { type: 'subjects', count: subjectsCount || 1 };
      }
    } else {
      // other modes handled after common guards below
    }

    // Handle special modes that need different pipelines early
    if (mode === 'trend') {
      // Trend: Mid vs Final totals per student (optionally per specific subject or across all assigned subjects)
      const types = await ExamType.find({}).select('_id typeName').lean();
      const midType = types.find(t => /mid/i.test(t.typeName || ''));
      const finalType = types.find(t => /final/i.test(t.typeName || ''));
      if (!midType || !finalType) return res.json({ results: [], classAverage: 0 });
      const midExamIds = exams.filter(e => String(e.examType) === String(midType._id)).map(e => e._id);
      const finalExamIds = exams.filter(e => String(e.examType) === String(finalType._id)).map(e => e._id);
      if (!midExamIds.length && !finalExamIds.length) return res.json({ results: [], classAverage: 0 });

      let subIds = [];
      if (subjectId) {
        subIds = [new mongoose.Types.ObjectId(subjectId)];
      } else {
        const gs = await (await import('../models/GradeSection.js')).default.findById(gradeSectionId).select('subjects').lean();
        subIds = (gs?.subjects || []).map(id => new mongoose.Types.ObjectId(id));
      }
      if (!subIds.length) return res.json({ results: [], classAverage: 0 });

      const baseMatch = { student: { $in: studentIds.map(id => new mongoose.Types.ObjectId(id)) }, subject: { $in: subIds } };
      const midAgg = await ExamScore.aggregate([
        { $match: { ...baseMatch, exam: { $in: midExamIds } } },
        { $group: { _id: '$student', total: { $sum: '$scoreObtained' } } }
      ]);
      const finalAgg = await ExamScore.aggregate([
        { $match: { ...baseMatch, exam: { $in: finalExamIds } } },
        { $group: { _id: '$student', total: { $sum: '$scoreObtained' } } }
      ]);
      const midMap = Object.fromEntries(midAgg.map(r => [String(r._id), r.total]));
      const finalMap = Object.fromEntries(finalAgg.map(r => [String(r._id), r.total]));

      let results = studentIds.map(sid => {
        const mid = Number(midMap[sid] || 0);
        const fin = Number(finalMap[sid] || 0);
        const delta = fin - mid;
        return { studentId: sid, fullName: nameMap[sid] || 'Student', mid, final: fin, delta };
      });
      results = results.sort((a, b) => b.delta - a.delta).map((r, i) => ({ ...r, rank: i + 1 }));
      const classAverage = results.length ? (results.reduce((a, b) => a + b.delta, 0) / results.length) : 0;
      return res.json({ results, classAverage, subjects: [] });
    }

    if (mode === 'difficulty') {
      // Difficulty: class average per subject (across assigned subjects), irrespective of exam type
      const gs = await (await import('../models/GradeSection.js')).default.findById(gradeSectionId).select('subjects').lean();
      const subjectIds = (gs?.subjects || []).map(id => new mongoose.Types.ObjectId(id));
      if (!subjectIds.length) return res.json({ results: [], classAverage: 0, subjects: [] });
      const baseMatch = { exam: { $in: examIds }, student: { $in: studentIds.map(id => new mongoose.Types.ObjectId(id)) }, subject: { $in: subjectIds } };
      // First, per-student totals per subject
      const perStuSub = await ExamScore.aggregate([
        { $match: baseMatch },
        { $group: { _id: { student: '$student', subject: '$subject' }, total: { $sum: '$scoreObtained' } } }
      ]);
      // Then average per subject (mean across students who have scores)
      const perSubGroups = new Map(); // subjectId -> { sum, count }
      for (const row of perStuSub) {
        const sub = String(row._id.subject);
        const ent = perSubGroups.get(sub) || { sum: 0, count: 0 };
        ent.sum += Number(row.total || 0);
        ent.count += 1;
        perSubGroups.set(sub, ent);
      }
      const subDocs = await Subject.find({ _id: { $in: subjectIds } }).select('subjectName').lean();
      const nameMapSub = Object.fromEntries(subDocs.map(s => [String(s._id), s.subjectName]));
      const subjects = subjectIds.map(id => {
        const key = String(id);
        const { sum = 0, count = 0 } = perSubGroups.get(key) || {};
        const average = count ? sum / count : 0;
        return { _id: id, subjectName: nameMapSub[key] || 'Subject', average, count };
      });
      // ClassAverage here could be mean of subject averages (optional); we keep it simple
      const classAverage = subjects.length ? (subjects.reduce((a, b) => a + b.average, 0) / subjects.length) : 0;
      return res.json({ results: [], classAverage, subjects });
    }

    // 1) Per-subject totals per student (default aggregation path)
    const perSubject = await ExamScore.aggregate([
      { $match: pipelineMatch },
      { $group: { _id: { student: '$student', subject: '$subject' }, total: { $sum: '$scoreObtained' } } }
    ]);

    // 2) Build subject meta (id + name) in stable order
    let subjectMeta = [];
    if (subjectIdsForReport && subjectIdsForReport.length) {
      const subDocs = await Subject.find({ _id: { $in: subjectIdsForReport } }).select('subjectName').lean();
      const nameMapSub = Object.fromEntries(subDocs.map(s => [String(s._id), s.subjectName]));
      subjectMeta = subjectIdsForReport.map(id => ({ _id: id, subjectName: nameMapSub[String(id)] || 'Subject' }));
    }

    // 3) Index per-subject totals
    const perMap = new Map(); // key: studentId -> Map(subjectId -> total)
    for (const row of perSubject) {
      const sid = String(row._id.student);
      const sub = String(row._id.subject);
      let inner = perMap.get(sid);
      if (!inner) { inner = new Map(); perMap.set(sid, inner); }
      inner.set(sub, row.total || 0);
    }

    // 4) Build scores grouped only by student (for totals)
    const scores = await ExamScore.aggregate([
      { $match: pipelineMatch },
      { $group: { _id: '$student', total: { $sum: '$scoreObtained' }, examCount: { $sum: 1 } } }
    ]);

    // Build results
    let results = scores.map(s => {
      const sid = String(s._id);
      let avg = 0;
      if (denomPerStudent?.type === 'subjects') {
        const d = denomPerStudent.count || 1;
        avg = d ? (s.total / d) : 0;
      }
      // subjectScores array in the order of subjectMeta
      const subjectScores = subjectMeta.map(sm => ({ subjectId: sm._id, total: (perMap.get(sid)?.get(String(sm._id)) ?? 0) }));
      return { studentId: s._id, fullName: nameMap[sid] || 'Student', total: s.total, average: avg, subjectScores };
    });

    // Sort by total desc and rank
    results.sort((a, b) => b.total - a.total);
    results = results.map((r, idx) => ({ ...r, rank: idx + 1 }));

    // Apply topN / bottomN slicing if provided
    if (topN > 0) {
      results = results.slice(0, topN);
    } else if (bottomN > 0) {
      // take the last N of the desc-sorted list, keep display ascending among those for clarity
      const lastN = results.slice(Math.max(results.length - bottomN, 0));
      results = lastN.sort((a, b) => a.total - b.total);
    }

  const classAverage = results.length ? (results.reduce((a, b) => a + (b.average || 0), 0) / results.length) : 0;
  res.json({ results, classAverage, subjects: subjectMeta });
  } catch (err) {
    console.error('getSummary error', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Transcript: per-student, per-subject scores across exam types for a given AY + GradeSection
export const getTranscript = async (req, res) => {
  try {
    const { academicYearId, gradeSectionId, studentId } = req.query;
    if (!isId(academicYearId) || !isId(gradeSectionId) || !isId(studentId)) {
      return res.status(400).json({ message: 'academicYearId, gradeSectionId and studentId are required' });
    }

    // Validate student and optional enrollment coherence
    const student = await Student.findById(studentId).select('fullName studentId').lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Exams for this AY + section and their types
    const exams = await Exam.find({ academicYear: academicYearId, gradeSection: gradeSectionId })
      .select('_id examType')
      .lean();
    if (!exams.length) return res.json({ student, examTypes: [], subjects: [], rows: [], overall: { total: 0, average: 0 } });

    const examTypeIds = [...new Set(exams.map(e => String(e.examType)))];
    const examTypesDocs = await ExamType.find({ _id: { $in: examTypeIds } }).select('typeName').lean();
    const examTypeNameMap = Object.fromEntries(examTypesDocs.map(t => [String(t._id), t.typeName]));
    // Order by typeName asc for stable columns
    const examTypes = examTypeIds
      .map(id => ({ _id: id, typeName: examTypeNameMap[id] || 'Exam' }))
      .sort((a, b) => (a.typeName || '').localeCompare(b.typeName || ''));

    const examIds = exams.map(e => e._id);

    // Subjects assigned to this gradeSection
    const GradeSection = (await import('../models/GradeSection.js')).default;
    const gs = await GradeSection.findById(gradeSectionId).select('subjects').lean();
    const subjectIds = (gs?.subjects || []).map(id => new mongoose.Types.ObjectId(id));
    if (!subjectIds.length) return res.json({ student, examTypes, subjects: [], rows: [], overall: { total: 0, average: 0 } });

    const subjectDocs = await Subject.find({ _id: { $in: subjectIds } }).select('subjectName').lean();
    const subjectNameMap = Object.fromEntries(subjectDocs.map(s => [String(s._id), s.subjectName]));
    const subjects = subjectIds.map(id => ({ _id: id, subjectName: subjectNameMap[String(id)] || 'Subject' }));

    // Scores for this student across those exams and subjects
    const scores = await ExamScore.find({ student: studentId, exam: { $in: examIds }, subject: { $in: subjectIds } })
      .select('subject exam scoreObtained')
      .lean();

    // Map examId -> examTypeId
    const examIdToTypeId = Object.fromEntries(exams.map(e => [String(e._id), String(e.examType)]));

    // Build per subject per examType totals
    const rows = subjects.map(su => {
      const subjectIdStr = String(su._id);
      const examsMap = {};
      for (const et of examTypes) examsMap[String(et._id)] = 0; // initialize
      for (const sc of scores) {
        if (String(sc.subject) !== subjectIdStr) continue;
        const etId = examIdToTypeId[String(sc.exam)];
        if (!etId) continue;
        examsMap[etId] = (examsMap[etId] || 0) + Number(sc.scoreObtained || 0);
      }
      const perExamList = examTypes.map(et => ({ examTypeId: et._id, typeName: et.typeName, score: Number(examsMap[String(et._id)] || 0) }));
      const total = perExamList.reduce((a, b) => a + (b.score || 0), 0);
      const average = subjects.length ? total : 0; // subject average equals total (weights sum across exams to 100)
      return { subjectId: su._id, subjectName: su.subjectName, exams: perExamList, total, average };
    });

    const overallTotal = rows.reduce((a, b) => a + (b.total || 0), 0);
    const overallAverage = subjects.length ? (overallTotal / subjects.length) : 0;

    return res.json({ student, examTypes, subjects, rows, overall: { total: overallTotal, average: overallAverage } });
  } catch (err) {
    console.error('getTranscript error', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

export default {
  getExamTypes,
  ensureExams,
  getExamGrid,
  upsertScore,
  getSummary,
  getTranscript
};
