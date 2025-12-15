import mongoose from 'mongoose';
import Teacher from '../models/Teacher.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import Enrollment from '../models/Enrollment.js';
import Student from '../models/Student.js';
import Counter from '../models/Counter.js';

export const listTeachers = async (req, res) => {
  try {
    const { status, search = '' } = req.query;
    const q = {};
    if (status) q.status = status;
    if (search && String(search).trim() !== '') {
      const safe = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      q.$or = [
        { fullName: { $regex: safe, $options: 'i' } },
        { teacherId: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
        { phone: { $regex: safe, $options: 'i' } }
      ];
    }
    const docs = await Teacher.find(q)
      .select('fullName teacherId email phone status lastAcademicYear createdAt')
      .populate({ path: 'lastAcademicYear', select: 'yearName' })
      .lean();
    res.json({ data: docs });
  } catch (e) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const createTeacher = async (req, res) => {
  try {
    let { fullName, teacherId, email, phone, status } = req.body;
    // Auto-generate teacherId like ID01, ID02 if not provided
    if (!teacherId) {
      const c = await Counter.findOneAndUpdate(
        { key: 'teacherId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      ).lean();
      const n = c?.seq || 1;
      teacherId = `ID${String(n).padStart(2, '0')}`;
    }
    // Auto-set lastAcademicYear to the latest AY in the system
    let lastAcademicYear = null;
    try {
      const AY = await mongoose.model('AcademicYear').findOne().sort({ createdAt: -1 }).select('_id').lean();
      lastAcademicYear = AY?._id || null;
    } catch {}
    // Uniqueness validation
    const conflicts = [];
    if (fullName) {
      const exists = await Teacher.exists({ fullName });
      if (exists) conflicts.push('fullName');
    }
    if (email) {
      const exists = await Teacher.exists({ email });
      if (exists) conflicts.push('email');
    }
    if (phone) {
      const exists = await Teacher.exists({ phone });
      if (exists) conflicts.push('phone');
    }
    if (teacherId) {
      const exists = await Teacher.exists({ teacherId });
      if (exists) conflicts.push('teacherId');
    }
    if (conflicts.length) {
      return res.status(409).json({ message: `Duplicate ${conflicts.join(', ')}` });
    }

    const doc = await Teacher.create({ fullName, teacherId, email, phone, status, lastAcademicYear });
    res.status(201).json({ data: { _id: String(doc._id), fullName: doc.fullName, teacherId: doc.teacherId, email: doc.email, phone: doc.phone, status: doc.status, lastAcademicYear: doc.lastAcademicYear, createdAt: doc.createdAt } });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad Request' });
  }
};

export const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid teacher id' });
    const { fullName, teacherId, email, phone, status } = req.body;
    // Uniqueness validation excluding current doc
    const orConds = [];
    if (fullName) orConds.push({ fullName });
    if (email) orConds.push({ email });
    if (phone) orConds.push({ phone });
    if (teacherId) orConds.push({ teacherId });
    if (orConds.length) {
      const dup = await Teacher.exists({ _id: { $ne: id }, $or: orConds });
      if (dup) return res.status(409).json({ message: 'Duplicate fields detected (fullName/email/phone/teacherId)' });
    }
    const updated = await Teacher.findByIdAndUpdate(id, { $set: { fullName, teacherId, email, phone, status } }, { new: true }).select('fullName teacherId email phone status lastAcademicYear createdAt').lean();
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json({ data: updated });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad Request' });
  }
};

export const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid teacher id' });
    // Prevent delete if teacher has assignments
    const hasAssignments = await mongoose.model('TeacherAssignment').exists({ teacher: id });
    if (hasAssignments) {
      return res.status(409).json({ message: 'Cannot delete: teacher has assignments.' });
    }
    await Teacher.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getAssignments = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid teacher id' });
    const q = { teacher: id };
    // Use lean + selective populate to reduce payload
    const rows = await TeacherAssignment.find(q)
      .select('gradeSection subject role')
      .populate({ path: 'gradeSection', select: 'section grade shift', populate: [
        { path: 'grade', select: 'gradeName' },
        { path: 'shift', select: 'shiftName' }
      ]})
      .populate('subject', 'subjectName')
      .lean();
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const addAssignment = async (req, res) => {
  try {
    const { id } = req.params; // teacher id
    const { gsId, subjectId, role } = req.body;
    if (![id, gsId, subjectId].every(mongoose.isValidObjectId)) return res.status(400).json({ message: 'Invalid ids' });
    // Prevent assigning same GS+Subject to another teacher OR re-adding duplicate for same teacher
    const existing = await TeacherAssignment.findOne({ gradeSection: gsId, subject: subjectId }).select('teacher').lean();
    if (existing) {
      if (String(existing.teacher) === String(id)) {
        return res.status(409).json({ message: 'This teacher already has this assignment.' });
      }
      return res.status(409).json({ message: 'Subject already assigned to another teacher.' });
    }
    const created = await TeacherAssignment.create({ teacher: id, gradeSection: gsId, subject: subjectId, role: role || 'main' });
    res.status(201).json({ data: { _id: String(created._id) } });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad Request' });
  }
};

export const removeAssignment = async (req, res) => {
  try {
    const { id, assignmentId } = req.params;
    if (![id, assignmentId].every(mongoose.isValidObjectId)) return res.status(400).json({ message: 'Invalid ids' });
    await TeacherAssignment.deleteOne({ _id: assignmentId, teacher: id });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getRoster = async (req, res) => {
  try {
    const { id } = req.params;
    const { ay, gs } = req.query;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid teacher id' });
    if (!mongoose.isValidObjectId(ay) || !mongoose.isValidObjectId(gs)) return res.status(400).json({ message: 'ay and gs are required' });
    // Scope check (indexed exists)
    const has = await TeacherAssignment.exists({ teacher: id, gradeSection: gs });
    if (!has) return res.status(403).json({ message: 'Not assigned to this class' });
    // Fetch enrollments with projection, avoid populate for speed
    const enrolls = await Enrollment.find({ academicYear: ay, gradeSection: gs, status: { $in: ['active'] } })
      .select('student')
      .lean();
    const studentIds = [...new Set(enrolls.map(e => String(e.student)))];
    if (!studentIds.length) return res.json({ data: [] });
    const students = await Student.find({ _id: { $in: studentIds } }).select('fullName').lean();
    const nameMap = Object.fromEntries(students.map(s => [String(s._id), s.fullName]));
    const roster = studentIds.map(sid => ({ studentId: sid, fullName: nameMap[sid] || 'Student' }));
    res.json({ data: roster });
  } catch (e) {
    res.status(500).json({ message: 'Server Error' });
  }
};
