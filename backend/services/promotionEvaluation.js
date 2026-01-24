import Exam from '../models/Exam.js';
import ExamType from '../models/ExamType.js';
import ExamScore from '../models/ExamScore.js';

// Compute overall averages for students based on their current enrollment's AY+GS
// - Weighted: Mid-term 40%, Final 60%
// - Missing component counts as 0 for that part
// - Average across all subjects in the student's current GradeSection
// Params:
//   enrollments: Array of enrollment docs (lean) with fields { student, academicYear, gradeSection: { _id, subjects: [] } }
// Returns Map(String(studentId) -> { overallAvg: Number, failedSubjects: Number })
export async function computeOverallAverages(enrollments = []) {
  if (!Array.isArray(enrollments) || enrollments.length === 0) return new Map();

  const byStudent = new Map();
  const pairKeys = new Set(); // unique (ay|gs)
  const studentIds = [];
  for (const e of enrollments) {
    if (!e || !e.student || !e.academicYear || !e.gradeSection) continue;
    const sid = String(e.student);
    studentIds.push(e.student);
    byStudent.set(sid, e);
    const ayId = typeof e.academicYear === 'object' && e.academicYear !== null ? e.academicYear._id : e.academicYear;
    const gsId = typeof e.gradeSection === 'object' && e.gradeSection !== null ? (e.gradeSection._id || e.gradeSection) : e.gradeSection;
    if (!ayId || !gsId) continue;
    const key = `${ayId}|${gsId}`;
    pairKeys.add(key);
  }
  if (byStudent.size === 0) return new Map();

  // Resolve ExamType ids for Mid-term and Final from the ACTIVE template version
  // (prevents ambiguous selection when multiple versions exist)
  let types = await ExamType.find({ isActive: true }).lean();
  if (!types.length) types = await ExamType.find({ templateVersion: 1 }).lean();
  const midType = types.find(t => String(t.typeName || '').toLowerCase().includes('mid'));
  const finalType = types.find(t => String(t.typeName || '').toLowerCase().includes('final'));

  const version = Number(types?.[0]?.templateVersion || 1);

  // Build AY+GS → exam ids map per type
  const pairs = Array.from(pairKeys).map(k => {
    const [ay, gs] = k.split('|');
    return { academicYear: ay, gradeSection: gs };
  });
  let exams = [];
  if (pairs.length > 0) {
    const orConds = [];
    for (const p of pairs) {
      if (midType) orConds.push({ academicYear: p.academicYear, gradeSection: p.gradeSection, examType: midType._id, templateVersion: version });
      if (finalType) orConds.push({ academicYear: p.academicYear, gradeSection: p.gradeSection, examType: finalType._id, templateVersion: version });
    }
    if (orConds.length > 0) {
      exams = await Exam.find({ $or: orConds }).lean();
    }
  }
  const midExamByPair = new Map();
  const finalExamByPair = new Map();
  for (const ex of exams) {
    const key = `${ex.academicYear}|${ex.gradeSection}`;
    if (midType && String(ex.examType) === String(midType._id)) midExamByPair.set(key, String(ex._id));
    if (finalType && String(ex.examType) === String(finalType._id)) finalExamByPair.set(key, String(ex._id));
  }

  // Gather all relevant exam ids for the selected pairs
  const relevantExamIds = Array.from(new Set([
    ...Array.from(midExamByPair.values()),
    ...Array.from(finalExamByPair.values())
  ].filter(Boolean)));

  // Fetch scores only for relevant students and relevant exams
  let scoreDocs = [];
  if (studentIds.length > 0 && relevantExamIds.length > 0) {
    scoreDocs = await ExamScore.find({ student: { $in: studentIds }, exam: { $in: relevantExamIds } }).lean();
  }

  // Build fast lookup: (student|exam|subject) → score
  const scoreMap = new Map();
  for (const s of scoreDocs) {
    const key = `${s.student}|${s.exam}|${s.subject}`;
    scoreMap.set(key, s.scoreObtained || 0);
  }

  // Compute per-student averages
  const result = new Map();
  const debugPerStudent = []; // only populated if PROMOTION_DEBUG=1
  for (const [sid, enr] of byStudent.entries()) {
    const gsId = String(typeof enr.gradeSection === 'object' ? (enr.gradeSection._id || enr.gradeSection) : enr.gradeSection);
    const ayId = String(typeof enr.academicYear === 'object' ? (enr.academicYear._id || enr.academicYear) : enr.academicYear);
    const pairKey = `${ayId}|${gsId}`;
    const midExamId = midExamByPair.get(pairKey);
    const finalExamId = finalExamByPair.get(pairKey);
    const subjects = Array.isArray(enr.gradeSection.subjects) ? enr.gradeSection.subjects : [];

    if (!subjects || subjects.length === 0) {
      result.set(sid, { overallAvg: 0, failedSubjects: 0 });
      continue;
    }

    let sumTotals = 0;
    let failedSubjects = 0;
    let countedSubjects = 0; // only count subjects that have any score
    const subjectDebugRows = [];
    for (const subj of subjects) {
      const subjId = String(subj);
      const hasMid = !!midExamId && scoreMap.has(`${enr.student}|${midExamId}|${subjId}`);
      const hasFinal = !!finalExamId && scoreMap.has(`${enr.student}|${finalExamId}|${subjId}`);
      const midScore = hasMid ? (scoreMap.get(`${enr.student}|${midExamId}|${subjId}`) || 0) : 0;
      const finalScore = hasFinal ? (scoreMap.get(`${enr.student}|${finalExamId}|${subjId}`) || 0) : 0;
      const counted = hasMid || hasFinal;
      let subjectTotal = 0;
      let mode = 'NONE';
      if (counted) {
        if (hasMid && hasFinal) {
          // Align with Results page: sum native exam scores (e.g., 40 + 60)
          subjectTotal = midScore + finalScore;
          mode = 'BOTH_SUM';
        } else if (hasMid && !hasFinal) {
          subjectTotal = midScore; // treat single exam as full
          mode = 'MID_ONLY_FULL';
        } else if (!hasMid && hasFinal) {
          subjectTotal = finalScore; // treat single exam as full
          mode = 'FINAL_ONLY_FULL';
        }
      }
      if (counted) {
        sumTotals += subjectTotal;
        countedSubjects += 1;
        if (subjectTotal < 60) failedSubjects += 1;
      }
      if (process.env.PROMOTION_DEBUG === '1') {
        subjectDebugRows.push({ subject: subjId, hasMid, hasFinal, midScore, finalScore, total: subjectTotal, counted, mode });
      }
    }
    const overallAvg = countedSubjects > 0 ? (sumTotals / countedSubjects) : 0;
    // Include countedSubjects so controllers can distinguish "no scores at all" cases
    result.set(sid, { overallAvg, failedSubjects, countedSubjects });
    if (process.env.PROMOTION_DEBUG === '1') {
      debugPerStudent.push({
        student: sid,
        academicYear: ayId,
        gradeSection: gsId,
        countedSubjects,
        failedSubjects,
        overallAvg,
        subjects: subjectDebugRows
      });
    }
  }
  if (process.env.PROMOTION_DEBUG === '1') {
    try { console.log('[PROMOTION_DEBUG] Detailed evaluation:', JSON.stringify(debugPerStudent, null, 2)); } catch(e) {}
    // Attach on result object as a non-iterable property for controller (optional)
    result.__debug = debugPerStudent;
  }
  return result;
}

export function getMinAvgThreshold() {
  const envVal = Number(process.env.PROMOTION_MIN_AVG);
  if (!isNaN(envVal) && envVal > 0) return envVal;
  return 60; // default
}
