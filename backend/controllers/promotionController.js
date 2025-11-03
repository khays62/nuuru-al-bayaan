// Promotion Controller
// Implements student promotion logic per PROMOTION.md
import mongoose from 'mongoose';
import fs from 'fs';
import Enrollment from '../models/Enrollment.js';
import GradeSection from '../models/GradeSection.js';
import Student from '../models/Student.js';
import Cohort from '../models/Cohort.js';
import TransferLog from '../models/TransferLog.js';
import Grade from '../models/Grade.js';
import AcademicYear from '../models/AcademicYear.js';
import Subject from '../models/Subject.js';

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
  // Build preview for each student
  const items = [];
  let promotable = 0, graduates = 0, missingTargets = 0, capacityIssues = 0;
  for (const student of students) {
    const enrollment = enrollments.find(e => String(e.student) === String(student._id));
    if (!enrollment) {
      items.push({ studentId: student.studentId, fullName: student.fullName, errors: [PromotionErrors.ACTIVE_ENROLLMENT_MISSING] });
      continue;
    }
    // Get next grade/AY
  const { nextGrade, nextAY } = getNextGradeAndAY(enrollment, timing, grades, academicYears) || {};
  if (process.env.DEBUG_PROMOTION === '1') {
    console.debug(`[PROMOTION] studentId=${student._id}, timing=${timing}, nextGrade=${nextGrade ? nextGrade.gradeName : 'null'}, nextAY=${nextAY ? nextAY.yearName : 'null'}`);
  }
    if (!nextGrade && timing === 'year-end') {
      // Graduation
      items.push({ studentId: student.studentId, fullName: student.fullName, action: 'graduate', errors: [] });
      graduates++;
      continue;
    }
    // If no gradeSection, cannot promote (do not use default '1')
    if (!enrollment.gradeSection || !enrollment.gradeSection.section) {
      items.push({ studentId: student.studentId, fullName: student.fullName, errors: [PromotionErrors.GRADESECTION_MISSING, 'Section name missing'] });
      missingTargets++;
      continue;
    }
    // Find target GS
    const targetGS = await GradeSection.findOne({
      grade: nextGrade?._id,
      shift: enrollment.shift,
      section: enrollment.gradeSection.section
    }).lean();
    let toGS = targetGS;
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
        errors: ['Missing GS (will be auto-created on promote)']
      });
      missingTargets++;
      continue;
    }
    // Capacity check
    if (toGS.capacity && toGS.capacity > 0) {
      const count = await Enrollment.countDocuments({ gradeSection: toGS._id, status: 'active' });
      if (count >= toGS.capacity) {
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
      errors: []
    });
    promotable++;
  }
  const summary = { total: students.length, promotable, graduates, missingTargets, capacityIssues };
  // Add debug info for frontend troubleshooting
  const debug = items.map((it, idx) => ({
    studentId: it.studentId,
    fromGS: it.fromGS,
    target: it.target,
    toGS: it.toGS,
    errors: it.errors,
    action: it.action
  }));
  res.json({ ok: true, items, summary, debug });
}
// POST /api/promotions/execute
export async function executePromotion(req, res) {
  // Input: timing, studentIds, autoCreate
  const { timing = 'mid-year', studentIds = [], autoCreate = true } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ ok: false, error: 'No students selected' });
  }

  const grades = await Grade.find({}).lean();
  const academicYears = await AcademicYear.find({}).lean();
  const students = await Student.find({ _id: { $in: studentIds } }).lean();
  // Track any AcademicYear docs created during this execute call so frontend
  // can be informed and auto-select the new AY.
  const createdAcademicYearIds = new Set();
  // load enrollments (active) for the selected students
  const enrollments = await Enrollment.find({ student: { $in: studentIds }, status: 'active' })
    .populate({
      path: 'gradeSection',
      populate: [
        { path: 'grade', select: 'gradeName' },
        { path: 'shift', select: 'shiftName' }
      ]
    })
    .lean();

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

  // Process students one-by-one inside per-student transaction to avoid large global transaction
  for (const student of students) {
    const enrollment = enrollments.find(e => String(e.student) === String(student._id));
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

        const { nextGrade, nextAY } = getNextGradeAndAY(enrollmentSession, timing, grades, academicYears) || {};
        if (!nextGrade && timing === 'year-end') {
          // Graduation
          await Enrollment.updateOne({ _id: enrollmentSession._id }, { status: 'graduated', leftAt: new Date() }).session(session);
          await Student.updateOne({ _id: student._id }, { status: 'Inactive' }).session(session);
          await TransferLog.create([{ student: student._id, fromGradeSection: enrollmentSession.gradeSection, toGradeSection: null, reason: 'Graduation', notes: '', reverted: false }], { session });
          actionResult = { action: 'graduate' };
          graduates++;
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

        // Find or create target GradeSection
  // GradeSection is AY- and Cohort-agnostic; match by grade + shift + section only
  let targetGS = await GradeSection.findOne({ grade: nextGrade?._id, shift: enrollmentSession.shift, section: enrollmentSession.gradeSection.section }).session(session).lean();
        let toGS = targetGS;
        if (!targetGS && autoCreate && nextGrade && nextAY) {
          // call helper that creates GradeSection (may use models directly; ensure it uses session if it does DB writes)
          // For safety, create subjects list and then GradeSection within session
          const subjects = await Subject.find({ grades: nextGrade._id }).session(session).lean();
          if (!subjects || subjects.length === 0) {
            actionResult = { error: 'CURRICULUM_MISSING_FOR_GRADE' };
            missingTargets++;
            return;
          }
          const gsDoc = await GradeSection.create([{
            grade: nextGrade._id,
            shift: enrollmentSession.shift,
            section: enrollmentSession.gradeSection.section,
            capacity: enrollmentSession.gradeSection?.capacity ?? undefined,
            subjects: subjects.map(s => s._id)
          }], { session });
          toGS = gsDoc[0];
          missingTargets++;
        }

        if (!toGS) {
          actionResult = { error: 'GRADESECTION_MISSING' };
          missingTargets++;
          return;
        }

        // Capacity check (count inside session)
        if (toGS.capacity && toGS.capacity > 0) {
          const count = await Enrollment.countDocuments({ gradeSection: toGS._id, status: 'active' }).session(session);
          if (count >= toGS.capacity) {
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
        promotable++;
      }); // end transaction

      // Debug log for tests: show per-student actionResult
      try {
        if (process.env.DEBUG_PROMOTION === '1') {
          const logLine = `${new Date().toISOString()}\tstudentId=${student._id}\tactionResult=${JSON.stringify(actionResult)}\n`;
          // Write to tests folder inside backend
          fs.appendFileSync('./tests/promotion_debug.log', logLine);
        }
      } catch (e) {
        // ignore logging errors in tests
      }

      if (actionResult && actionResult.error) {
        results.push({ studentId: student._id, errors: [actionResult.error] });
      } else if (actionResult && actionResult.action === 'graduate') {
        results.push({ studentId: student._id, action: 'graduate', errors: [] });
      } else if (actionResult && actionResult.action === 'promote') {
        results.push({ studentId: student._id, fromGS: enrollment.gradeSection, toGS: actionResult.toGS, action: 'promote', errors: [] });
      } else {
        results.push({ studentId: student._id, errors: ['UNKNOWN_ERROR'] });
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
};
