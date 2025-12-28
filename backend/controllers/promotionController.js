// Promotion Controller
// Implements student promotion logic per PROMOTION.md
import mongoose from 'mongoose';
import Enrollment from '../models/Enrollment.js';
import GradeSection from '../models/GradeSection.js'; 
import Student from '../models/Student.js';
import Cohort from '../models/Cohort.js';
import TransferLog from '../models/TransferLog.js';
import Grade from '../models/Grade.js';
import AcademicYear from '../models/AcademicYear.js';
import Subject from '../models/Subject.js';
import { computeOverallAverages, getMinAvgThreshold } from '../services/promotionEvaluation.js';

// Helper: get next grade and AY
// Helper: derive an ordering for grade names like "level one", "level 2", etc.
function gradeRank(name = '') {
  const s = String(name).toLowerCase();
  // number in name wins (e.g., 'level 3')
  const numMatch = s.match(/\b(\d{1,2})\b/);
  if (numMatch) return parseInt(numMatch[1], 10);
  // english words mapping
  const words = ['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'];
  for (let i = 0; i < words.length; i++) {
    if (s.includes(words[i])) return i + 1;
  }
  // fallback: try roman numerals
  const romans = { i:1, ii:2, iii:3, iv:4, v:5, vi:6, vii:7, viii:8, ix:9, x:10 };
  for (const [k,v] of Object.entries(romans)) {
    if (s.includes(` ${k} `) || s.endsWith(` ${k}`) || s.startsWith(`${k} `)) return v;
  }
  // default rank
  return Number.MAX_SAFE_INTEGER;
}

function getNextGradeAndAY(enrollment, timing, grades, academicYears) {
  // Find current grade and AY
  // Sort grades by derived rank for deterministic next
  const sortedGrades = [...grades].sort((a,b) => gradeRank(a.gradeName) - gradeRank(b.gradeName) || String(a.gradeName).localeCompare(String(b.gradeName)));
  const enrGradeId = String(enrollment?.grade?._id || enrollment?.grade || '');
  const enrAyId = String(enrollment?.academicYear?._id || enrollment?.academicYear || '');
  const currentGrade = sortedGrades.find(g => String(g._id) === enrGradeId);
  const currentAY = academicYears.find(ay => String(ay._id) === enrAyId);
  if (!currentGrade || !currentAY) return null;
  // Find next grade (simple next index)
  const gradeIdx = sortedGrades.findIndex(g => String(g._id) === String(currentGrade._id));
  const nextGrade = sortedGrades[gradeIdx + 1];
  // AY: mid-year = same; year-end = deterministically compute next by name, then reuse if exists
  if (timing === 'mid-year') {
    return { nextGrade, nextAY: currentAY };
  }
  // Compute next AY name from currentAY.yearName using same separator
  let computedNextAYName = null;
  if (currentAY.yearName) {
    const sep = currentAY.yearName.includes('/') ? '/' : '-';
    const parts = currentAY.yearName.split(sep);
    if (parts.length === 2) {
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      if (!isNaN(start) && !isNaN(end)) computedNextAYName = `${start + 1}${sep}${end + 1}`;
    }
  }
  // Try to reuse an existing AY with that name if present
  let nextAY = null;
  if (computedNextAYName) {
    nextAY = academicYears.find(ay => String(ay.yearName) === computedNextAYName) || { yearName: computedNextAYName };
  } else {
    // Fallback: keep same AY label if parsing failed; execute() will resolve or create as needed
    nextAY = { yearName: currentAY.yearName || 'NEXT-AY-AUTO' };
  }
  return { nextGrade, nextAY };
}

// GET /api/promotions/preview
export async function previewPromotion(req, res) {
  // Input: timing, studentIds, autoCreate
  let { timing = 'mid-year', studentIds = [], autoCreate = true } = req.query;
  // Accept studentIds[] or comma-separated string
  if (typeof studentIds === 'string') {
    studentIds = studentIds.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(studentIds)) {
    studentIds = [studentIds];
  }
  if (studentIds.length === 0) {
    return res.status(400).json({ ok: false, error: 'No students selected' });
  }
  // Fallback mapping: allow passing cohort-coded studentId values (e.g. ST002) instead of Mongo _id.
  // Separate raw ids into valid ObjectIds and codes; map codes -> _ids.
  const rawIds = studentIds.map(String);
  const objectIds = rawIds.filter(id => mongoose.isValidObjectId(id));
  const codeIds = rawIds.filter(id => !mongoose.isValidObjectId(id));
  let codeMap = new Map(); // studentId code -> _id
  if (codeIds.length) {
    const codeDocs = await Student.find({ studentId: { $in: codeIds } }).select('_id studentId').lean();
    codeMap = new Map(codeDocs.map(d => [String(d.studentId), String(d._id)]));
  }
  const normalizedIds = [ ...objectIds, ...Array.from(codeMap.values()) ];
  const unknownCodes = codeIds.filter(c => !codeMap.has(c));
  if (unknownCodes.length === 1 && normalizedIds.length === 0) {
    return res.status(404).json({ ok: false, error: `Student code not found: ${unknownCodes[0]}` });
  } else if (unknownCodes.length > 1 && normalizedIds.length === 0) {
    return res.status(404).json({ ok: false, error: 'Student codes not found', codes: unknownCodes });
  }
  // Use normalizedIds for internal queries; keep original codes for display if needed.
  studentIds = normalizedIds;
  // Load all needed lookups
  const grades = await Grade.find({}).lean();
  const academicYears = await AcademicYear.find({}).lean();
  // Load students and their active enrollments
  const students = await Student.find({ _id: { $in: studentIds } }).lean();
  const enrollments = await Enrollment.find({ student: { $in: studentIds }, status: 'active' })
    .populate({
      path: 'gradeSection',
      populate: [
        { path: 'grade', select: 'gradeName' },
        { path: 'shift', select: 'shiftName' }
      ]
    })
    .populate({ path: 'academicYear', select: 'yearName' })
    .populate({ path: 'cohort', select: 'name' })
    .lean();
  // Ensure subjects array is present on gradeSection (lean() returns it by default)

  // Compute averages for validation gating
  const averagesMap = await computeOverallAverages(enrollments);
  const minAvg = getMinAvgThreshold();
  // Debug instrumentation removed for production cleanliness.
  // Early abort: if every selected student has no scored subjects at all
  const allNoScores = students.length > 0 && students.every(st => {
    const evalInfo = averagesMap.get(String(st._id));
    return evalInfo && evalInfo.countedSubjects === 0;
  });
  // Do not abort preview; proceed and surface this as a warning in response
  // ---------------------------------------------------------------------------
  // Batch pre-compute next grade / AY and target GradeSection lookups to reduce
  // per-student queries (performance optimization without altering logic).
  // ---------------------------------------------------------------------------
  const enrollmentByStudent = new Map();
  for (const e of enrollments) enrollmentByStudent.set(String(e.student), e);

  // Pre-compute nextGrade/nextAY per enrollment
  const nextInfoByStudent = new Map();
  for (const student of students) {
    const enr = enrollmentByStudent.get(String(student._id));
    if (!enr) continue;
    const ng = getNextGradeAndAY(enr, timing, grades, academicYears) || null;
    nextInfoByStudent.set(String(student._id), ng);
  }

  // Collect unique target GS query triples (grade, shift, section)
  const targetTriples = [];
  const tripleKeySet = new Set();
  for (const student of students) {
    const enr = enrollmentByStudent.get(String(student._id));
    const info = nextInfoByStudent.get(String(student._id));
    if (!enr || !info) continue;
    const { nextGrade } = info;
    if (!nextGrade) continue; // graduation or terminal grade handled later
    if (!enr.gradeSection || !enr.gradeSection.section) continue; // missing section handled later
    const gradeId = nextGrade?._id;
    const shiftId = enr.shift || enr.gradeSection?.shift;
    const section = enr.gradeSection.section;
    if (!gradeId || !shiftId || !section) continue;
    const key = `${gradeId}|${shiftId}|${section}`;
    if (!tripleKeySet.has(key)) {
      tripleKeySet.add(key);
      targetTriples.push({ grade: gradeId, shift: shiftId, section });
    }
  }

  // Batch fetch existing target GradeSections
  let targetGSMap = new Map();
  if (targetTriples.length > 0) {
    const orConditions = targetTriples.map(t => ({ grade: t.grade, shift: t.shift, section: t.section }));
    const existingGS = await GradeSection.find({ $or: orConditions }).lean();
    targetGSMap = new Map(existingGS.map(gs => {
      const key = `${gs.grade}|${gs.shift}|${gs.section}`;
      return [key, gs];
    }));
  }

  // Pre-compute capacity counts for all fetched GS (single aggregate instead of N countDocuments)
  let capacityCountMap = new Map();
  const gsIds = Array.from(new Set(Array.from(targetGSMap.values()).map(v => v._id)));
  if (gsIds.length > 0) {
    const capacityAgg = await Enrollment.aggregate([
      { $match: { status: 'active', gradeSection: { $in: gsIds } } },
      { $group: { _id: '$gradeSection', count: { $sum: 1 } } }
    ]);
    capacityCountMap = new Map(capacityAgg.map(r => [String(r._id), r.count]));
  }

  // Build preview for each student (logic preserved; only source of toGS & capacity changed)
  const items = [];
  let promotable = 0, graduates = 0, missingTargets = 0, capacityIssues = 0;
  for (const student of students) {
    const enrollment = enrollmentByStudent.get(String(student._id));
    if (!enrollment) {
      items.push({ studentId: student.studentId, fullName: student.fullName, errors: [PromotionErrors.ACTIVE_ENROLLMENT_MISSING] });
      continue;
    }
    // Get next grade/AY (precomputed)
    const { nextGrade, nextAY } = nextInfoByStudent.get(String(student._id)) || {};
    const evalInfo = averagesMap.get(String(student._id));
    const overallAvg = evalInfo?.overallAvg ?? null;
    const failedSubjects = evalInfo?.failedSubjects ?? null;
    // Per-student debug logging removed.
    if (!nextGrade && timing === 'year-end') {
      items.push({ studentId: student.studentId, fullName: student.fullName, action: 'graduate', errors: [], overallAvg, failedSubjects });
      graduates++;
      continue;
    }
    // If no gradeSection, cannot promote (do not use default '1')
    if (!enrollment.gradeSection || !enrollment.gradeSection.section) {
      items.push({ studentId: student.studentId, fullName: student.fullName, errors: [PromotionErrors.GRADESECTION_MISSING, 'Section name missing'], overallAvg, failedSubjects });
      missingTargets++;
      continue;
    }
    if (nextGrade && typeof overallAvg === 'number' && overallAvg < minAvg) {
      items.push({
        studentId: student.studentId,
        fullName: student.fullName,
        fromGS: {
          ...enrollment.gradeSection,
          academicYear: enrollment.academicYear,
          cohort: enrollment.cohort,
        },
        target: {
          toGrade: nextGrade?.gradeName,
          toAY: nextAY?.yearName,
          section: enrollment.gradeSection?.section,
          shift: enrollment.gradeSection?.shift?.shiftName || enrollment.shift?.shiftName || '-',
          cohort: enrollment.cohort?.name || '-',
        },
        toGS: null,
        action: 'stay',
        errors: [PromotionErrors.BELOW_MIN_AVG],
        overallAvg,
        failedSubjects
      });
      continue;
    }

    // Lookup target GS from pre-fetched map
    let toGS = null;
    if (nextGrade?._id) {
      const key = `${nextGrade._id}|${enrollment.shift || enrollment.gradeSection?.shift}|${enrollment.gradeSection.section}`;
      toGS = targetGSMap.get(key) || null;
    }
    // Always calculate next target info for preview
    // Always auto-generate nextAY string for year-end
    let toAY = nextAY && nextAY.yearName ? nextAY.yearName : '-';
    if (timing === 'year-end') {
      let ayStr = enrollment.gradeSection?.academicYear?.yearName || enrollment.academicYear?.yearName;
      if (!ayStr && nextAY && nextAY.yearName) ayStr = nextAY.yearName;
      if (ayStr) {
        let parts = ayStr.includes('/') ? ayStr.split('/') : ayStr.split('-');
        if (parts.length === 2) {
          const start = parseInt(parts[0], 10);
          const end = parseInt(parts[1], 10);
          if (!isNaN(start) && !isNaN(end)) {
            // Use same separator as input
            const sep = ayStr.includes('/') ? '/' : '-';
            toAY = `${start + 1}${sep}${end + 1}`;
          }
        }
      }
    }
    // Guarantee toAY is always a valid string for year-end
    if (timing === 'year-end' && toAY === '-') {
      toAY = nextAY && nextAY.yearName ? nextAY.yearName : '-';
    }
  // (Removed preview console log)
    const nextTargetInfo = {
      toGrade: nextGrade?.gradeName,
      toAY,
      section: enrollment.gradeSection?.section,
      shift: enrollment.gradeSection?.shift?.shiftName || enrollment.shift?.shiftName || '-',
      cohort: enrollment.cohort?.name || '-',
    };
    if (!toGS) {
      // GS does not exist, show calculated next info and status
      // Always auto-generate nextAY for year-end promotion
      // Use nextTargetInfo.toAY (already guaranteed above)
      items.push({
        studentId: student.studentId,
        fullName: student.fullName,
        // include AY & Cohort in fromGS for UI completeness
        fromGS: {
          ...enrollment.gradeSection,
          academicYear: enrollment.academicYear,
          cohort: enrollment.cohort,
        },
        target: {
          ...nextTargetInfo,
        },
        toGS: null,
        action: 'promote',
        errors: ['Missing GS (will be auto-created on promote)'],
        overallAvg,
        failedSubjects
      });
      missingTargets++;
      continue;
    }
    // Capacity check (use pre-computed counts)
    if (toGS && toGS.capacity && toGS.capacity > 0) {
      const currentCount = capacityCountMap.get(String(toGS._id)) || 0;
      if (currentCount >= toGS.capacity) {
        items.push({ studentId: student._id, errors: [PromotionErrors.CAPACITY_FULL] });
        capacityIssues++;
        continue;
      }
    }
    items.push({
      studentId: student.studentId,
      fullName: student.fullName,
      // Include AY and Cohort on fromGS for UI rendering convenience
      fromGS: {
        ...enrollment.gradeSection,
        academicYear: enrollment.academicYear,
        cohort: enrollment.cohort,
      },
      target: {
        toGrade: nextGrade?.gradeName,
        toAY: nextAY?.yearName,
        section: toGS.section,
        // shift for target equals the current enrollment's shift name
        shift: enrollment.gradeSection?.shift?.shiftName || enrollment.shift?.shiftName || '-',
        cohort: enrollment.cohort?.name || '-',
      },
      toGS,
      action: 'promote',
      errors: [],
      overallAvg,
      failedSubjects
    });
    promotable++;
  }
  const summary = { total: students.length, promotable, graduates, missingTargets, capacityIssues };
  const warnings = [];
  if (allNoScores) warnings.push('NO_SCORES_ALL');
  res.json({ ok: true, items, summary, warnings, allNoScores });
}
// POST /api/promotions/execute
export async function executePromotion(req, res) {
  // Input: timing, studentIds, autoCreate
  const { timing = 'mid-year', studentIds = [], autoCreate = true } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ ok: false, error: 'No students selected' });
  }
  // Fallback mapping identical to preview: permit studentId codes instead of ObjectIds.
  const rawIds = studentIds.map(String);
  const objectIds = rawIds.filter(id => mongoose.isValidObjectId(id));
  const codeIds = rawIds.filter(id => !mongoose.isValidObjectId(id));
  let codeMap = new Map();
  if (codeIds.length) {
    const codeDocs = await Student.find({ studentId: { $in: codeIds } }).select('_id studentId').lean();
    codeMap = new Map(codeDocs.map(d => [String(d.studentId), String(d._id)]));
  }
  const normalizedIds = [ ...objectIds, ...Array.from(codeMap.values()) ];
  const unknownCodes = codeIds.filter(c => !codeMap.has(c));
  if (unknownCodes.length && normalizedIds.length === 0) {
    return res.status(404).json({ ok: false, error: 'Student codes not found', codes: unknownCodes });
  }
  const effectiveIds = normalizedIds;

  const grades = await Grade.find({}).lean();
  const academicYears = await AcademicYear.find({}).lean();
  const students = await Student.find({ _id: { $in: effectiveIds } }).lean();
  // Track any AcademicYear docs created during this execute call so frontend
  // can be informed and auto-select the new AY.
  const createdAcademicYearIds = new Set();
  // load enrollments (active) for the selected students
  const enrollments = await Enrollment.find({ student: { $in: effectiveIds }, status: 'active' })
    .populate({
      path: 'gradeSection',
      populate: [
        { path: 'grade', select: 'gradeName' },
        { path: 'shift', select: 'shiftName' }
      ]
    })
    .lean();

  // Academic performance gate: precompute averages
  const averagesMap = await computeOverallAverages(enrollments);
  const minAvg = getMinAvgThreshold();
  // Removed evaluationDebug instrumentation.

  // ---------------------------------------------------------------------------
  // Batch pre-compute data to reduce per-student queries (optimization):
  // - nextGrade/nextAY per enrollment
  // - target GradeSections map (existing)
  // - subjects per next grade (for auto-create)
  // - capacity counts per target GS (active enrollments)
  // ---------------------------------------------------------------------------
  const enrollmentByStudent = new Map();
  for (const e of enrollments) enrollmentByStudent.set(String(e.student), e);

  // Pre-compute next grade & AY
  const nextInfoByStudent = new Map();
  const allNextGradeIds = new Set();
  const targetTriples = []; // { grade, shift, section }
  const tripleKeySet = new Set();
  for (const student of students) {
    const enr = enrollmentByStudent.get(String(student._id));
    if (!enr) continue;
    const info = getNextGradeAndAY(enr, timing, grades, academicYears) || null;
    nextInfoByStudent.set(String(student._id), info);
    if (!info) continue;
    const { nextGrade } = info;
    if (nextGrade && nextGrade._id) {
      allNextGradeIds.add(String(nextGrade._id));
      // Collect target GS triple only if enrollment has a section
      if (enr.gradeSection && enr.gradeSection.section) {
        const shiftId = enr.shift || enr.gradeSection.shift; // prefer direct shift if present
        if (shiftId) {
          const key = `${nextGrade._id}|${shiftId}|${enr.gradeSection.section}`;
          if (!tripleKeySet.has(key)) {
            tripleKeySet.add(key);
            targetTriples.push({ grade: nextGrade._id, shift: shiftId, section: enr.gradeSection.section });
          }
        }
      }
    }
  }

  // Existing target GradeSections batch fetch
  let targetGSMap = new Map();
  if (targetTriples.length > 0) {
    const orConditions = targetTriples.map(t => ({ grade: t.grade, shift: t.shift, section: t.section }));
    const existingGS = await GradeSection.find({ $or: orConditions }).lean();
    targetGSMap = new Map(existingGS.map(gs => [`${gs.grade}|${gs.shift}|${gs.section}`, gs]));
  }

  // Subjects per next grade (for auto-create GS) batch fetch
  let subjectsByGrade = new Map();
  if (allNextGradeIds.size > 0) {
    const subjDocs = await Subject.find({ grades: { $in: Array.from(allNextGradeIds) } }).lean();
    // Subject has array 'grades'; map subject to each grade it belongs to
    for (const s of subjDocs) {
      for (const g of (s.grades || [])) {
        const gId = String(g);
        if (!subjectsByGrade.has(gId)) subjectsByGrade.set(gId, []);
        subjectsByGrade.get(gId).push(s._id);
      }
    }
  }

  // Capacity counts for existing target GS (single aggregate)
  let capacityCountMap = new Map();
  const existingTargetIds = Array.from(new Set(Array.from(targetGSMap.values()).map(v => v._id)));
  if (existingTargetIds.length > 0) {
    const agg = await Enrollment.aggregate([
      { $match: { status: 'active', gradeSection: { $in: existingTargetIds } } },
      { $group: { _id: '$gradeSection', count: { $sum: 1 } } }
    ]);
    capacityCountMap = new Map(agg.map(r => [String(r._id), r.count]));
  }

  // Helper to lookup or create target GS inside a session (only when needed)
  async function ensureTargetGS(enrollmentSession, nextGrade, session) {
    if (!nextGrade || !nextGrade._id) return null;
    if (!enrollmentSession.gradeSection || !enrollmentSession.gradeSection.section) return null;
    const shiftId = enrollmentSession.shift || enrollmentSession.gradeSection.shift;
    if (!shiftId) return null;
    const key = `${nextGrade._id}|${shiftId}|${enrollmentSession.gradeSection.section}`;
    let gs = targetGSMap.get(key) || null;
    if (gs) return gs; // already exists
    // autoCreate logic uses subjectsByGrade
    const subjectIds = subjectsByGrade.get(String(nextGrade._id)) || [];
    if (subjectIds.length === 0) return { _error: 'CURRICULUM_MISSING_FOR_GRADE' }; // signal error
    const gsDocs = await GradeSection.create([{
      grade: nextGrade._id,
      shift: shiftId,
      section: enrollmentSession.gradeSection.section,
      capacity: enrollmentSession.gradeSection?.capacity ?? undefined,
      subjects: subjectIds
    }], { session });
    const createdGS = gsDocs[0].toObject();
    targetGSMap.set(key, createdGS);
    capacityCountMap.set(String(createdGS._id), 0); // initial count
    return createdGS;
  }

  const results = [];
  let promotable = 0, graduates = 0, missingTargets = 0, capacityIssues = 0;

  // Pre-check: duplicate mid-year promotions
  if (timing === 'mid-year') {
    const duplicatePromotions = [];
    for (const student of students) {
      const enrollment = enrollments.find(e => String(e.student) === String(student._id));
      if (!enrollment) continue;
      const exists = await Enrollment.findOne({
        student: student._id,
        academicYear: enrollment.academicYear,
        gradeSection: enrollment.gradeSection._id,
        sequenceInYear: 2
      }).lean();
      if (exists) {
        duplicatePromotions.push({ studentId: student._id, fullName: student.fullName, error: 'Mid-year promotion already done' });
      }
    }
    if (duplicatePromotions.length > 0) {
      return res.status(400).json({ ok: false, error: 'Mid-year promotion already done for some students.', details: duplicatePromotions });
    }
  }

  // Process students one-by-one inside per-student transaction (atomic) using precomputed maps
  for (const student of students) {
    const enrollment = enrollmentByStudent.get(String(student._id));
    if (!enrollment) {
      results.push({ studentId: student._id, errors: ['ACTIVE_ENROLLMENT_MISSING'] });
      continue;
    }

    // Use a session per student to keep operations atomic for that student
    const session = await mongoose.startSession();
    try {
      let actionResult = null;
      await session.withTransaction(async () => {
        // Re-fetch enrollment inside the session to ensure latest and populate gradeSection
        const enrollmentSession = await Enrollment.findOne({ _id: enrollment._id })
          .populate({
            path: 'gradeSection',
            populate: [
              { path: 'grade', select: 'gradeName' },
              { path: 'shift', select: 'shiftName' }
            ]
          })
          .session(session)
          .lean();
        if (!enrollmentSession) {
          actionResult = { error: 'ACTIVE_ENROLLMENT_MISSING' };
          return;
        }

        const preInfo = nextInfoByStudent.get(String(student._id)) || {};
        const { nextGrade, nextAY } = preInfo;
        if (!nextGrade && timing === 'year-end') {
          // Graduation
          await Enrollment.updateOne({ _id: enrollmentSession._id }, { status: 'graduated', leftAt: new Date() }).session(session);
          await Student.updateOne({ _id: student._id }, { status: 'Inactive' }).session(session);
          await TransferLog.create([{ student: student._id, fromGradeSection: enrollmentSession.gradeSection, toGradeSection: null, reason: 'Graduation', notes: '', reverted: false }], { session });
          actionResult = { action: 'graduate' };
          graduates++;
          return;
        }

        // Academic performance gate: only when moving to a next grade (not for graduation)
        const evalInfo = averagesMap.get(String(student._id));
        if (nextGrade && evalInfo && typeof evalInfo.overallAvg === 'number' && evalInfo.overallAvg < minAvg) {
          actionResult = { error: 'BELOW_MIN_AVG' };
          return;
        }

        if (!enrollmentSession.gradeSection || !enrollmentSession.gradeSection.section) {
          actionResult = { error: 'GRADESECTION_MISSING' };
          missingTargets++;
          return;
        }

        // Ensure academicYear exists (create if needed)
        let academicYearId = nextAY?._id;
        if (!academicYearId && nextAY && nextAY.yearName) {
          let ayDoc = await AcademicYear.findOne({ yearName: nextAY.yearName }).session(session);
          if (!ayDoc) {
            ayDoc = await AcademicYear.create([{ yearName: nextAY.yearName }], { session });
            ayDoc = ayDoc[0];
            // remember that we created this AY so we can report it back to caller
            try { createdAcademicYearIds.add(String(ayDoc._id)); } catch (e) { /* ignore */ }
          }
          academicYearId = ayDoc._id;
          nextAY._id = academicYearId;
        }

        // Find or create target GradeSection using pre-fetched maps
        let toGS = null;
        if (nextGrade && nextGrade._id) {
          const shiftId = enrollmentSession.shift || enrollmentSession.gradeSection.shift;
          const key = `${nextGrade._id}|${shiftId}|${enrollmentSession.gradeSection.section}`;
          toGS = targetGSMap.get(key) || null;
          if (!toGS && autoCreate && nextAY) {
            const createdOrErr = await ensureTargetGS(enrollmentSession, nextGrade, session);
            if (createdOrErr && createdOrErr._error) {
              actionResult = { error: createdOrErr._error };
              missingTargets++;
              return;
            }
            toGS = createdOrErr;
            if (toGS) missingTargets++; // counts as missing target resolved
          }
        }

        if (!toGS) {
          actionResult = { error: 'GRADESECTION_MISSING' };
          missingTargets++;
          return;
        }

        // Capacity check using pre-computed counters (update in-memory after promotion)
        if (toGS && toGS.capacity && toGS.capacity > 0) {
          const currentCount = capacityCountMap.get(String(toGS._id)) || 0;
          if (currentCount >= toGS.capacity) {
            actionResult = { error: 'CAPACITY_FULL' };
            capacityIssues++;
            return;
          }
        }

        // Close old enrollment and create new one atomically
        await Enrollment.updateOne({ _id: enrollmentSession._id }, { status: 'promoted', leftAt: new Date() }).session(session);
        const created = await Enrollment.create([{
          student: student._id,
          gradeSection: toGS._id,
          academicYear: academicYearId,
          grade: nextGrade._id,
          shift: toGS.shift,
          cohort: enrollmentSession.cohort,
          sequenceInYear: timing === 'mid-year' ? 2 : 1,
          status: 'active',
          joinedAt: new Date()
        }], { session });
        const newEnrollment = created[0];

        // Transfer log
        await TransferLog.create([{ student: student._id, fromGradeSection: enrollmentSession.gradeSection, toGradeSection: toGS._id, byUser: req.user?._id || null, date: new Date(), reason: 'Promotion', notes: '', reverted: false }], { session });

        actionResult = { action: 'promote', toGS, enrollment: newEnrollment };
        // Increment in-memory capacity counter for subsequent students
        if (toGS && toGS._id) {
          const idStr = String(toGS._id);
          const prev = capacityCountMap.get(idStr) || 0;
            capacityCountMap.set(idStr, prev + 1);
        }
        promotable++;
      }); // end transaction

      const evalInfo = averagesMap.get(String(student._id));
      const overallAvg = evalInfo?.overallAvg ?? null;
      const failedSubjects = evalInfo?.failedSubjects ?? null;
      if (actionResult && actionResult.error) {
        results.push({ studentId: student._id, errors: [actionResult.error], overallAvg, failedSubjects });
      } else if (actionResult && actionResult.action === 'graduate') {
        results.push({ studentId: student._id, action: 'graduate', errors: [], overallAvg, failedSubjects });
      } else if (actionResult && actionResult.action === 'promote') {
        results.push({ studentId: student._id, fromGS: enrollment.gradeSection, toGS: actionResult.toGS, action: 'promote', errors: [], overallAvg, failedSubjects });
      } else {
        results.push({ studentId: student._id, errors: ['UNKNOWN_ERROR'], overallAvg, failedSubjects });
      }
    } catch (err) {
      console.error('[PROMOTE] per-student transaction error', err);
      // handle unique index or other DB errors
      if (err && err.code === 11000) {
        results.push({ studentId: student._id, errors: ['ALREADY_PROMOTED_OR_DUPLICATE'] });
      } else {
        results.push({ studentId: student._id, errors: [err.message || 'Server Error'] });
      }
    } finally {
      session.endSession();
    }
  }

  const summary = { total: students.length, promotable, graduates, missingTargets, capacityIssues };
  // If we created any academic years, include their ids and objects in response
  const createdAcademicYearIdsArr = Array.from(createdAcademicYearIds);
  const extra = {};
  if (createdAcademicYearIdsArr.length > 0) {
    extra.createdAcademicYearIds = createdAcademicYearIdsArr;
    if (createdAcademicYearIdsArr.length === 1) extra.createdAcademicYearId = createdAcademicYearIdsArr[0];
    try {
      const createdAcademicYears = await AcademicYear.find({ _id: { $in: createdAcademicYearIdsArr } }).lean();
      extra.createdAcademicYears = createdAcademicYears;
    } catch (e) {
      // ignore errors fetching created docs; ids are still useful
    }
  }
  res.json({ ok: true, results, summary, ...extra });
}

// Helper: auto-create GS if missing
async function autoCreateGradeSection(params) {
  if (process.env.DEBUG_PROMOTION === '1') console.debug('[PROMOTION] autoCreateGradeSection params:', params);
  const subjects = await Subject.find({ grades: params.grade }).lean();
  if (process.env.DEBUG_PROMOTION === '1') console.debug('[PROMOTION] Subjects found for grade:', params.grade, subjects.map(s => s.subjectName));
  if (!subjects || subjects.length === 0) {
  if (process.env.DEBUG_PROMOTION === '1') console.debug('[PROMOTION] No subjects found for grade, cannot create GS');
    return null;
  }
  const gs = await GradeSection.create({
    grade: params.grade,
    shift: params.shift,
    section: params.section,
    capacity: params.capacity ?? undefined,
    subjects: subjects.map(s => s._id)
  });
  if (process.env.DEBUG_PROMOTION === '1') console.debug('[PROMOTION] GradeSection CREATED:', gs._id, gs.grade, gs.section);
  return gs.toObject();
}

// Helper: error codes per PROMOTION.md
export const PromotionErrors = {
  ACTIVE_ENROLLMENT_MISSING: 'ACTIVE_ENROLLMENT_MISSING',
  GRADESECTION_MISSING: 'GRADESECTION_MISSING',
  COHORT_MISMATCH_TARGET: 'COHORT_MISMATCH_TARGET',
  COHORT_TARGET_MISSING: 'COHORT_TARGET_MISSING',
  CAPACITY_FULL: 'CAPACITY_FULL',
  SHIFT_CHANGE_NOT_ALLOWED: 'SHIFT_CHANGE_NOT_ALLOWED',
  TERMINAL_GRADE_GRADUATION_ONLY: 'TERMINAL_GRADE_GRADUATION_ONLY',
  CURRICULUM_MISSING_FOR_GRADE: 'CURRICULUM_MISSING_FOR_GRADE',
  MULTIPLE_TARGET_GS: 'MULTIPLE_TARGET_GS',
  BELOW_MIN_AVG: 'BELOW_MIN_AVG',
  NO_SCORES_ALL: 'NO_SCORES_ALL',
};
