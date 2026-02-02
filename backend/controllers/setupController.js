import Grade from '../models/Grade.js';
import Shift from '../models/Shift.js';
import AcademicYear from '../models/AcademicYear.js';

import GradeSection from '../models/GradeSection.js';
import Enrollment from '../models/Enrollment.js';
import Subject from '../models/Subject.js';
import Exam from '../models/Exam.js';
import LessonPlan from '../models/LessonPlan.js';
import Cohort from '../models/Cohort.js';
import Teacher from '../models/Teacher.js';

import { publishRealtime } from '../utils/realtimeBus.js';

function normalizeName(value) {
  return String(value || '').trim();
}

function isMongoDuplicateKey(err) {
  return Boolean(err && (err.code === 11000 || err.code === 11001));
}

// ----------------------
// Grades
// ----------------------
export async function listGrades(_req, res) {
  try {
    const grades = await Grade.find({}).lean();
    grades.sort((a, b) => {
      const ao = Number.isInteger(a?.order) ? a.order : Number.MAX_SAFE_INTEGER;
      const bo = Number.isInteger(b?.order) ? b.order : Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return String(a?.gradeName || '').localeCompare(String(b?.gradeName || ''), undefined, { sensitivity: 'base' });
    });
    return res.json({ ok: true, grades });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Error fetching grades', details: error?.message });
  }
}

export async function createGrade(req, res) {
  try {
    const gradeName = normalizeName(req.body?.gradeName);
    const order = req.body?.order;

    const existingName = await Grade.findOne({ gradeName }).lean();
    if (existingName) {
      return res.status(409).json({ ok: false, error: 'Grade name already exists', field: 'gradeName' });
    }

    const existingOrder = await Grade.findOne({ order }).lean();
    if (existingOrder) {
      return res.status(409).json({ ok: false, error: 'Grade order already exists', field: 'order' });
    }

    const created = await Grade.create({ gradeName, order });
    publishRealtime({ type: 'grades:changed', id: String(created._id), ts: Date.now() });
    publishRealtime({ type: 'lookups:changed', ts: Date.now() });
    return res.status(201).json({ ok: true, grade: created });
  } catch (error) {
    if (isMongoDuplicateKey(error)) {
      return res.status(409).json({ ok: false, error: 'Duplicate grade', code: 'DUPLICATE' });
    }
    return res.status(500).json({ ok: false, error: 'Server Error' });
  }
}

export async function updateGrade(req, res) {
  const { id } = req.params;
  try {
    const grade = await Grade.findById(id);
    if (!grade) return res.status(404).json({ ok: false, error: 'Grade not found' });

    const gradeName = normalizeName(req.body?.gradeName);
    const order = req.body?.order;

    const dupName = await Grade.findOne({ gradeName, _id: { $ne: id } }).lean();
    if (dupName) {
      return res.status(409).json({ ok: false, error: 'Grade name already exists', field: 'gradeName' });
    }

    const dupOrder = await Grade.findOne({ order, _id: { $ne: id } }).lean();
    if (dupOrder) {
      return res.status(409).json({ ok: false, error: 'Grade order already exists', field: 'order' });
    }

    grade.gradeName = gradeName;
    grade.order = order;

    const updated = await grade.save();
    publishRealtime({ type: 'grades:changed', id: String(updated._id), ts: Date.now() });
    publishRealtime({ type: 'lookups:changed', ts: Date.now() });
    return res.json({ ok: true, grade: updated });
  } catch (error) {
    if (isMongoDuplicateKey(error)) {
      return res.status(409).json({ ok: false, error: 'Duplicate grade', code: 'DUPLICATE' });
    }
    return res.status(500).json({ ok: false, error: 'Server Error' });
  }
}

export async function deleteGrade(req, res) {
  const { id } = req.params;
  try {
    const grade = await Grade.findById(id);
    if (!grade) return res.status(404).json({ ok: false, error: 'Grade not found' });

    const [gradeSections, enrollments, subjects] = await Promise.all([
      GradeSection.countDocuments({ grade: id }),
      Enrollment.countDocuments({ grade: id }),
      Subject.countDocuments({ grades: id }),
    ]);

    const totalRefs = gradeSections + enrollments + subjects;
    if (totalRefs > 0) {
      return res.status(409).json({
        ok: false,
        error: 'Grade is in use and cannot be deleted',
        inUse: true,
        refs: { gradeSections, enrollments, subjects },
      });
    }

    await grade.deleteOne();
    publishRealtime({ type: 'grades:changed', id: String(id), ts: Date.now() });
    publishRealtime({ type: 'lookups:changed', ts: Date.now() });
    return res.json({ ok: true, message: 'Grade deleted' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Server Error' });
  }
}

// ----------------------
// Shifts
// ----------------------
export async function listShifts(_req, res) {
  try {
    const shifts = await Shift.find({}).sort({ shiftName: 1 }).lean();
    return res.json({ ok: true, shifts });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Error fetching shifts', details: error?.message });
  }
}

export async function createShift(req, res) {
  try {
    const shiftName = normalizeName(req.body?.shiftName);

    const existing = await Shift.findOne({ shiftName }).lean();
    if (existing) {
      return res.status(409).json({ ok: false, error: 'Shift name already exists', field: 'shiftName' });
    }

    const created = await Shift.create({ shiftName });
    publishRealtime({ type: 'shifts:changed', id: String(created._id), ts: Date.now() });
    publishRealtime({ type: 'lookups:changed', ts: Date.now() });
    return res.status(201).json({ ok: true, shift: created });
  } catch (error) {
    if (isMongoDuplicateKey(error)) {
      return res.status(409).json({ ok: false, error: 'Duplicate shift', code: 'DUPLICATE' });
    }
    return res.status(500).json({ ok: false, error: 'Server Error' });
  }
}

export async function updateShift(req, res) {
  const { id } = req.params;
  try {
    const shift = await Shift.findById(id);
    if (!shift) return res.status(404).json({ ok: false, error: 'Shift not found' });

    const shiftName = normalizeName(req.body?.shiftName);
    const dup = await Shift.findOne({ shiftName, _id: { $ne: id } }).lean();
    if (dup) {
      return res.status(409).json({ ok: false, error: 'Shift name already exists', field: 'shiftName' });
    }

    shift.shiftName = shiftName;
    const updated = await shift.save();

    publishRealtime({ type: 'shifts:changed', id: String(updated._id), ts: Date.now() });
    publishRealtime({ type: 'lookups:changed', ts: Date.now() });
    return res.json({ ok: true, shift: updated });
  } catch (error) {
    if (isMongoDuplicateKey(error)) {
      return res.status(409).json({ ok: false, error: 'Duplicate shift', code: 'DUPLICATE' });
    }
    return res.status(500).json({ ok: false, error: 'Server Error' });
  }
}

export async function deleteShift(req, res) {
  const { id } = req.params;
  try {
    const shift = await Shift.findById(id);
    if (!shift) return res.status(404).json({ ok: false, error: 'Shift not found' });

    const [gradeSections, enrollments] = await Promise.all([
      GradeSection.countDocuments({ shift: id }),
      Enrollment.countDocuments({ shift: id }),
    ]);

    const totalRefs = gradeSections + enrollments;
    if (totalRefs > 0) {
      return res.status(409).json({
        ok: false,
        error: 'Shift is in use and cannot be deleted',
        inUse: true,
        refs: { gradeSections, enrollments },
      });
    }

    await shift.deleteOne();
    publishRealtime({ type: 'shifts:changed', id: String(id), ts: Date.now() });
    publishRealtime({ type: 'lookups:changed', ts: Date.now() });
    return res.json({ ok: true, message: 'Shift deleted' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Server Error' });
  }
}

// ----------------------
// Academic Years
// ----------------------
export async function listAcademicYears(_req, res) {
  try {
    const academicYears = await AcademicYear.find({}).sort({ yearName: -1 }).lean();
    return res.json({ ok: true, academicYears });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Error fetching academic years', details: error?.message });
  }
}

export async function createAcademicYear(req, res) {
  try {
    const yearName = normalizeName(req.body?.yearName);

    const existing = await AcademicYear.findOne({ yearName }).lean();
    if (existing) {
      return res.status(409).json({ ok: false, error: 'Academic year already exists', field: 'yearName' });
    }

    const created = await AcademicYear.create({ yearName });
    publishRealtime({ type: 'academicYears:changed', id: String(created._id), ts: Date.now() });
    publishRealtime({ type: 'lookups:changed', ts: Date.now() });
    return res.status(201).json({ ok: true, academicYear: created });
  } catch (error) {
    if (isMongoDuplicateKey(error)) {
      return res.status(409).json({ ok: false, error: 'Duplicate academic year', code: 'DUPLICATE' });
    }
    return res.status(500).json({ ok: false, error: 'Server Error' });
  }
}

export async function updateAcademicYear(req, res) {
  const { id } = req.params;
  try {
    const ay = await AcademicYear.findById(id);
    if (!ay) return res.status(404).json({ ok: false, error: 'Academic year not found' });

    const yearName = normalizeName(req.body?.yearName);
    const dup = await AcademicYear.findOne({ yearName, _id: { $ne: id } }).lean();
    if (dup) {
      return res.status(409).json({ ok: false, error: 'Academic year already exists', field: 'yearName' });
    }

    ay.yearName = yearName;
    const updated = await ay.save();

    publishRealtime({ type: 'academicYears:changed', id: String(updated._id), ts: Date.now() });
    publishRealtime({ type: 'lookups:changed', ts: Date.now() });
    return res.json({ ok: true, academicYear: updated });
  } catch (error) {
    if (isMongoDuplicateKey(error)) {
      return res.status(409).json({ ok: false, error: 'Duplicate academic year', code: 'DUPLICATE' });
    }
    return res.status(500).json({ ok: false, error: 'Server Error' });
  }
}

export async function deleteAcademicYear(req, res) {
  const { id } = req.params;
  try {
    const ay = await AcademicYear.findById(id);
    if (!ay) return res.status(404).json({ ok: false, error: 'Academic year not found' });

    const [enrollments, exams, lessonPlans, cohorts, teachers] = await Promise.all([
      Enrollment.countDocuments({ academicYear: id }),
      Exam.countDocuments({ academicYear: id }),
      LessonPlan.countDocuments({ academicYear: id }),
      Cohort.countDocuments({ startAcademicYear: id }),
      Teacher.countDocuments({ lastAcademicYear: id }),
    ]);

    const totalRefs = enrollments + exams + lessonPlans + cohorts + teachers;
    if (totalRefs > 0) {
      return res.status(409).json({
        ok: false,
        error: 'Academic year is in use and cannot be deleted',
        inUse: true,
        refs: { enrollments, exams, lessonPlans, cohorts, teachers },
      });
    }

    await ay.deleteOne();
    publishRealtime({ type: 'academicYears:changed', id: String(id), ts: Date.now() });
    publishRealtime({ type: 'lookups:changed', ts: Date.now() });
    return res.json({ ok: true, message: 'Academic year deleted' });
  } catch (error) {
    return res.status(500).json({ ok: false, error: 'Server Error' });
  }
}
