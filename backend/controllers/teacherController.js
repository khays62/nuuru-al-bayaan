import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import Teacher from '../models/Teacher.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import Enrollment from '../models/Enrollment.js';
import Student from '../models/Student.js';
import Counter from '../models/Counter.js';
import User from '../models/User.js';
import Timetable from '../models/Timetable.js';
import bcrypt from 'bcryptjs';
import AuthLockEvent from '../models/AuthLockEvent.js';
import { getDefaultInitialPassword } from '../utils/defaultPasswords.js';
import { publishRealtime } from '../utils/realtimeBus.js';
import AuditLog from '../models/AuditLog.js';
import { parsePagination } from '../utils/pagination.js';
import { normalizeSomaliaPhone, isValidSomaliaPhone } from '../utils/phoneSomalia.js';
import { writeAuditLog } from '../services/auditService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isValidEmail = (value) => {
  const v = String(value || '').trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
};

function getDefaultTeacherPassword() {
  return getDefaultInitialPassword();
}

async function ensureTeacherUser({ teacherId, teacherDoc }) {
  // Username is always teacherId, so teachers can login via:
  // - username: teacherId
  // - email: teacher email (if set)
  const username = String(teacherDoc.teacherId || teacherId || '').trim();
  if (!username) throw new Error('Cannot create teacher login: missing teacherId');

  const conflicts = [];
  const existing = await User.findOne({
    $or: [
      { username },
      ...(teacherDoc.email ? [{ email: teacherDoc.email }] : []),
    ],
  })
    .select('_id username email')
    .lean();
  if (existing) conflicts.push('username/email');
  if (conflicts.length) {
    const e = new Error('Duplicate teacher login');
    e.code = 'DUP_LOGIN';
    throw e;
  }

  const hashed = await bcrypt.hash(getDefaultTeacherPassword(), 10);
  const user = await User.create({
    fullName: teacherDoc.fullName,
    username,
    email: teacherDoc.email || undefined,
    phone: teacherDoc.phone || undefined,
    salary: Number(teacherDoc.salary || 0),
    password: hashed,
    role: 'teacher',
    teacherRef: teacherDoc._id,
    mustChangePassword: true,
    status: teacherDoc.status || 'active',
  });

  return user;
}

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
      .select('fullName employeeId teacherId email phone phone2 gender dob nationality isSomali residenceRegionId residenceDistrictId residenceNeighborhood hireDate employmentType salary status specialization qualification yearsOfExperience notes photo lastAcademicYear createdAt')
      .populate({ path: 'lastAcademicYear', select: 'yearName' })
      .lean();
    res.json({ data: docs });
  } catch (e) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const createTeacher = async (req, res) => {
  try {
    let {
      fullName,
      teacherId,
      employeeId,
      email,
      phone,
      phone2,
      gender,
      dob,
      nationality,
      isSomali,
      residenceRegionId,
      residenceDistrictId,
      residenceNeighborhood,
      hireDate,
      employmentType,
      status,
      salary,
      specialization,
      qualification,
      yearsOfExperience,
      notes,
    } = req.body || {};

    if (!fullName || String(fullName).trim() === '') return res.status(400).json({ message: 'fullName is required' });
    if (!gender || !['Male', 'Female'].includes(String(gender))) return res.status(400).json({ message: 'gender is required' });
    if (!dob) return res.status(400).json({ message: 'dob is required' });
    const dobDate = new Date(dob);
    if (Number.isNaN(dobDate.getTime())) return res.status(400).json({ message: 'dob must be a valid date' });
    if (!nationality || String(nationality).trim() === '') nationality = 'Somalia';

    if (!email || String(email).trim() === '') return res.status(400).json({ message: 'email is required' });
    if (!phone || String(phone).trim() === '') return res.status(400).json({ message: 'phone is required' });

    fullName = String(fullName).trim();
    const fullNameWordCount = fullName.split(/\s+/).filter(Boolean).length;
    if (fullNameWordCount !== 4) return res.status(400).json({ message: 'fullName must be exactly 4 names' });

    email = String(email).trim();
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Invalid email address.' });

    const normalizedPhone = normalizeSomaliaPhone(phone);
    if (!normalizedPhone || !isValidSomaliaPhone(normalizedPhone)) return res.status(400).json({ message: 'Invalid Somalia phone number.' });
    phone = normalizedPhone;

    if (phone2) {
      const normalizedPhone2 = normalizeSomaliaPhone(phone2);
      if (!normalizedPhone2 || !isValidSomaliaPhone(normalizedPhone2)) return res.status(400).json({ message: 'Invalid Somalia phone number (phone2).' });
      phone2 = normalizedPhone2;
    } else {
      phone2 = '';
    }

    nationality = String(nationality).trim();

    // Auto-generate employeeId like TCH-000001 if not provided
    if (!employeeId) {
      const cEmp = await Counter.findOneAndUpdate(
        { key: 'teacherEmployeeId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      ).lean();
      const nEmp = cEmp?.seq || 1;
      employeeId = `TCH-${String(nEmp).padStart(6, '0')}`;
    }
    employeeId = String(employeeId).trim();

    if (salary !== undefined && salary !== null && salary !== '') {
      const n = Number(salary);
      if (!Number.isFinite(n) || n < 0) return res.status(400).json({ message: 'salary must be a non-negative number' });
      salary = n;
    } else {
      salary = undefined;
    }

    if (yearsOfExperience !== undefined && yearsOfExperience !== null && yearsOfExperience !== '') {
      const y = Number(yearsOfExperience);
      if (!Number.isFinite(y) || y < 0) return res.status(400).json({ message: 'yearsOfExperience must be a non-negative number' });
      yearsOfExperience = y;
    } else {
      yearsOfExperience = undefined;
    }

    const hireDateObj = hireDate ? new Date(hireDate) : null;
    if (hireDate && Number.isNaN(hireDateObj.getTime())) return res.status(400).json({ message: 'hireDate must be a valid date' });

    const normalizedEmploymentType = employmentType ? String(employmentType).trim().toLowerCase() : '';
    if (normalizedEmploymentType && !['full-time', 'part-time', 'contract'].includes(normalizedEmploymentType)) {
      return res.status(400).json({ message: 'employmentType invalid' });
    }
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
    if (employeeId) {
      const exists = await Teacher.exists({ employeeId });
      if (exists) conflicts.push('employeeId');
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

    // Pre-check that we can create the linked login user (avoid creating Teacher without login)
    const prospectiveUsername = String(teacherId || '').trim();
    if (!prospectiveUsername) return res.status(400).json({ message: 'TeacherId required for login' });
    const loginConflict = await User.exists({
      $or: [
        { username: prospectiveUsername },
        ...(email ? [{ email }] : []),
      ],
    });
    if (loginConflict) {
      return res.status(409).json({ message: 'Teacher login already exists (username/email conflict)' });
    }

    const doc = await Teacher.create({
      fullName,
      employeeId,
      teacherId,
      email,
      phone,
      phone2: phone2 || '',
      gender,
      dob: dobDate,
      nationality,
      isSomali: typeof isSomali === 'boolean' ? isSomali : true,
      residenceRegionId: residenceRegionId ? String(residenceRegionId).trim() : '',
      residenceDistrictId: residenceDistrictId ? String(residenceDistrictId).trim() : '',
      residenceNeighborhood: residenceNeighborhood ? String(residenceNeighborhood).trim() : '',
      hireDate: hireDateObj || null,
      employmentType: normalizedEmploymentType,
      salary,
      status,
      specialization: specialization ? String(specialization).trim() : '',
      qualification: qualification ? String(qualification).trim() : '',
      yearsOfExperience,
      notes: notes ? String(notes).trim() : '',
      lastAcademicYear,
    });

    try {
      await ensureTeacherUser({ teacherId, teacherDoc: doc });
    } catch (e) {
      // Best-effort rollback (keep DB consistent for admin)
      await Teacher.deleteOne({ _id: doc._id });
      if (e?.code === 'DUP_LOGIN') {
        return res.status(409).json({ message: 'Teacher login already exists (username/email conflict)' });
      }
      return res.status(400).json({ message: e?.message || 'Could not create teacher login' });
    }

    publishRealtime({ type: 'teachers:changed', id: String(doc._id), ts: Date.now() });
    publishRealtime({ type: 'users:changed', ts: Date.now() });

    res.status(201).json({
      data: {
        _id: String(doc._id),
        fullName: doc.fullName,
        employeeId: doc.employeeId,
        teacherId: doc.teacherId,
        email: doc.email,
        phone: doc.phone,
        phone2: doc.phone2,
        gender: doc.gender,
        dob: doc.dob,
        nationality: doc.nationality,
        isSomali: doc.isSomali,
        residenceRegionId: doc.residenceRegionId,
        residenceDistrictId: doc.residenceDistrictId,
        residenceNeighborhood: doc.residenceNeighborhood,
        hireDate: doc.hireDate,
        employmentType: doc.employmentType,
        salary: doc.salary || 0,
        status: doc.status,
        specialization: doc.specialization,
        qualification: doc.qualification,
        yearsOfExperience: doc.yearsOfExperience,
        notes: doc.notes,
        photo: doc.photo,
        lastAcademicYear: doc.lastAcademicYear,
        createdAt: doc.createdAt,
      },
    });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad Request' });
  }
};

export const createTeacherLoginUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid teacher id' });
    const teacher = await Teacher.findById(id).select('fullName teacherId email phone salary status').lean();
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    // If a user already exists for this teacherRef, do nothing.
    const existing = await User.findOne({ teacherRef: id }).select('_id username email').lean();
    if (existing) return res.json({ data: { ok: true, userId: String(existing._id), username: existing.username } });

    const user = await ensureTeacherUser({ teacherId: teacher.teacherId, teacherDoc: teacher });

    publishRealtime({ type: 'users:changed', ts: Date.now() });
    publishRealtime({ type: 'teachers:changed', id: String(id), ts: Date.now() });

    return res.status(201).json({ data: { ok: true, userId: String(user._id), username: user.username } });
  } catch (e) {
    if (e?.code === 'DUP_LOGIN') {
      return res.status(409).json({ message: 'Teacher login already exists (username/email conflict)' });
    }
    return res.status(400).json({ message: e?.message || 'Bad Request' });
  }
};

export const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid teacher id' });
    let {
      fullName,
      teacherId,
      employeeId,
      email,
      phone,
      phone2,
      gender,
      dob,
      nationality,
      isSomali,
      residenceRegionId,
      residenceDistrictId,
      residenceNeighborhood,
      hireDate,
      employmentType,
      status,
      salary,
      specialization,
      qualification,
      yearsOfExperience,
      notes,
    } = req.body || {};

    if (salary !== undefined && salary !== null && salary !== '') {
      const n = Number(salary);
      if (!Number.isFinite(n) || n < 0) return res.status(400).json({ message: 'salary must be a non-negative number' });
      salary = n;
    } else if (salary === '') {
      salary = 0;
    }

    if (fullName !== undefined) {
      const trimmed = String(fullName || '').trim();
      if (!trimmed) return res.status(400).json({ message: 'fullName is required' });
      const wc = trimmed.split(/\s+/).filter(Boolean).length;
      if (wc !== 4) return res.status(400).json({ message: 'fullName must be exactly 4 names' });
      fullName = trimmed;
    }

    if (teacherId !== undefined) {
      const trimmed = String(teacherId || '').trim();
      teacherId = trimmed ? trimmed : undefined;
    }

    if (phone !== undefined) {
      if (String(phone).trim() === '') return res.status(400).json({ message: 'phone is required' });
      const normalized = normalizeSomaliaPhone(phone);
      if (!normalized || !isValidSomaliaPhone(normalized)) return res.status(400).json({ message: 'Invalid Somalia phone number.' });
      phone = normalized;
    }
    if (phone2 !== undefined) {
      if (!phone2 || String(phone2).trim() === '') {
        phone2 = '';
      } else {
        const normalized2 = normalizeSomaliaPhone(phone2);
        if (!normalized2 || !isValidSomaliaPhone(normalized2)) return res.status(400).json({ message: 'Invalid Somalia phone number (phone2).' });
        phone2 = normalized2;
      }
    }

    const existingTeacher = await Teacher.findById(id).select('teacherId email status').lean();
    if (!existingTeacher) return res.status(404).json({ message: 'Not found' });

    // Uniqueness validation excluding current doc
    const orConds = [];
    if (fullName) orConds.push({ fullName });
    if (employeeId) orConds.push({ employeeId });
    if (email) orConds.push({ email });
    if (phone) orConds.push({ phone });
    if (teacherId) orConds.push({ teacherId });
    if (orConds.length) {
      const dup = await Teacher.exists({ _id: { $ne: id }, $or: orConds });
      if (dup) return res.status(409).json({ message: 'Duplicate fields detected (fullName/email/phone/teacherId)' });
    }

    // If teacherId/email changes, keep linked login user in sync (and detect conflicts).
    const nextTeacherId = teacherId ? String(teacherId).trim() : existingTeacher.teacherId;
    const nextEmail = email != null && String(email).trim() !== '' ? String(email).trim() : (existingTeacher.email || undefined);

    if (nextTeacherId && String(nextTeacherId) !== String(existingTeacher.teacherId)) {
      const usernameConflict = await User.exists({
        teacherRef: { $ne: id },
        username: nextTeacherId,
      });
      if (usernameConflict) return res.status(409).json({ message: 'Teacher login username already exists' });
    }
    if (nextEmail && String(nextEmail) !== String(existingTeacher.email || '')) {
      const emailConflict = await User.exists({
        teacherRef: { $ne: id },
        email: nextEmail,
      });
      if (emailConflict) return res.status(409).json({ message: 'Teacher login email already exists' });
    }

    const setPatch = {};
    if (fullName !== undefined) setPatch.fullName = String(fullName).trim();
    if (teacherId !== undefined) setPatch.teacherId = String(teacherId).trim();
    if (employeeId !== undefined) setPatch.employeeId = String(employeeId).trim();
    if (email !== undefined) {
      if (String(email).trim() === '') return res.status(400).json({ message: 'email is required' });
      const next = String(email).trim();
      if (!isValidEmail(next)) return res.status(400).json({ message: 'Invalid email address.' });
      setPatch.email = next;
    }
    if (phone !== undefined) {
      // phone has been normalized/validated above
      setPatch.phone = String(phone).trim();
    }
    if (phone2 !== undefined) {
      // phone2 has been normalized/validated above
      setPatch.phone2 = phone2 ? String(phone2).trim() : '';
    }
    if (gender !== undefined) {
      if (!['Male', 'Female'].includes(String(gender))) return res.status(400).json({ message: 'gender is required' });
      setPatch.gender = String(gender);
    }
    if (dob !== undefined) {
      if (!dob) return res.status(400).json({ message: 'dob is required' });
      const d = new Date(dob);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'dob must be a valid date' });
      setPatch.dob = d;
    }
    if (nationality !== undefined) {
      if (!nationality || String(nationality).trim() === '') return res.status(400).json({ message: 'nationality is required' });
      setPatch.nationality = String(nationality).trim();
    }
    if (typeof isSomali === 'boolean') setPatch.isSomali = isSomali;
    if (residenceRegionId !== undefined) setPatch.residenceRegionId = residenceRegionId ? String(residenceRegionId).trim() : '';
    if (residenceDistrictId !== undefined) setPatch.residenceDistrictId = residenceDistrictId ? String(residenceDistrictId).trim() : '';
    if (residenceNeighborhood !== undefined) setPatch.residenceNeighborhood = residenceNeighborhood ? String(residenceNeighborhood).trim() : '';
    if (hireDate !== undefined) {
      if (!hireDate) setPatch.hireDate = null;
      else {
        const hd = new Date(hireDate);
        if (Number.isNaN(hd.getTime())) return res.status(400).json({ message: 'hireDate must be a valid date' });
        setPatch.hireDate = hd;
      }
    }
    if (employmentType !== undefined) {
      const et = employmentType ? String(employmentType).trim().toLowerCase() : '';
      if (et && !['full-time', 'part-time', 'contract'].includes(et)) return res.status(400).json({ message: 'employmentType invalid' });
      setPatch.employmentType = et;
    }
    if (salary !== undefined) setPatch.salary = salary === '' || salary == null ? 0 : Number(salary);
    if (status !== undefined) setPatch.status = status;
    if (specialization !== undefined) setPatch.specialization = specialization ? String(specialization).trim() : '';
    if (qualification !== undefined) setPatch.qualification = qualification ? String(qualification).trim() : '';
    if (yearsOfExperience !== undefined) {
      const y = yearsOfExperience === '' || yearsOfExperience == null ? 0 : Number(yearsOfExperience);
      if (!Number.isFinite(y) || y < 0) return res.status(400).json({ message: 'yearsOfExperience must be a non-negative number' });
      setPatch.yearsOfExperience = y;
    }
    if (notes !== undefined) setPatch.notes = notes ? String(notes).trim() : '';

    const updated = await Teacher.findByIdAndUpdate(
      id,
      { $set: setPatch },
      { new: true }
    )
      .select('fullName employeeId teacherId email phone phone2 gender dob nationality isSomali residenceRegionId residenceDistrictId residenceNeighborhood hireDate employmentType salary status specialization qualification yearsOfExperience notes photo lastAcademicYear createdAt')
      .lean();
    if (!updated) return res.status(404).json({ message: 'Not found' });

    // Best-effort sync to linked User account (if exists)
    try {
      const patch = {};
      if (nextTeacherId) patch.username = nextTeacherId;
      if (email !== undefined) patch.email = nextEmail || undefined;
      if (phone !== undefined) patch.phone = phone || undefined;
      if (salary !== undefined) patch.salary = Number(updated.salary || 0);

      const statusChanged =
        status !== undefined &&
        String(existingTeacher.status || '').toLowerCase() !== String(updated.status || '').toLowerCase();

      if (status !== undefined) {
        patch.status = updated.status || 'active';
      }
      if (fullName !== undefined) {
        patch.fullName = updated.fullName;
      }

      if (Object.keys(patch).length || statusChanged) {
        const update = {};
        if (Object.keys(patch).length) update.$set = patch;
        if (statusChanged) update.$inc = { tokenVersion: 1 };
        await User.updateOne({ teacherRef: id }, update);
      }
    } catch {
      // non-blocking
    }

    publishRealtime({ type: 'teachers:changed', id: String(id), ts: Date.now() });
    publishRealtime({ type: 'users:changed', ts: Date.now() });

    res.json({ data: updated });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad Request' });
  }
};


// @desc    Upload / replace teacher photo
// @route   POST /api/teachers/:id/photo   (multipart/form-data: photo)
export const uploadTeacherPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'Photo file is required.' });
    }

    const teacher = await Teacher.findById(id);
    if (!teacher) {
      try { await fs.unlink(file.path); } catch { /* ignore */ }
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const nextRelPath = path.posix.join('uploads', 'teachers', String(file.filename || ''));
    const nextUrl = `/${path.posix.join('api', 'uploads', 'teachers', String(file.filename || ''))}`;

    const prevPath = String(teacher?.photo?.path || '').trim();
    if (prevPath && prevPath.startsWith('uploads/teachers/')) {
      const absPrev = path.join(__dirname, '..', prevPath);
      try {
        await fs.unlink(absPrev);
      } catch {
        // ignore
      }
    }

    teacher.photo = {
      url: nextUrl,
      path: nextRelPath,
      mimeType: String(file.mimetype || ''),
      size: Number(file.size || 0),
      uploadedAt: new Date(),
    };
    await teacher.save();

    publishRealtime({ type: 'teachers:changed', id: String(id), ts: Date.now() });

    return res.status(200).json({
      message: 'Photo uploaded successfully.',
      photo: teacher.photo,
      teacher,
    });
  } catch (err) {
    console.error('uploadTeacherPhoto error', err);
    return res.status(500).json({ message: 'Server Error' });
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

    publishRealtime({ type: 'teachers:changed', id: String(id), ts: Date.now() });
    publishRealtime({ type: 'users:changed', ts: Date.now() });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const deactivateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid teacher id' });

    const updated = await Teacher.findByIdAndUpdate(
      id,
      { $set: { status: 'inactive' } },
      { new: true }
    )
      .select('fullName teacherId email phone salary status lastAcademicYear createdAt')
      .lean();
    if (!updated) return res.status(404).json({ message: 'Not found' });

    // Best-effort: block further logins + invalidate existing tokens
    try {
      await User.updateOne(
        { teacherRef: id },
        { $set: { status: 'inactive' }, $inc: { tokenVersion: 1 } }
      );
    } catch {
      // non-blocking
    }

    req.skipAuditTrail = true;
    await writeAuditLog({
      userId: req.user?._id,
      action: 'teachers.deactivate',
      description: `target=${String(id)} type=teacher status=inactive`,
      req,
    });

    publishRealtime({ type: 'teachers:changed', id: String(id), ts: Date.now() });
    publishRealtime({ type: 'users:changed', ts: Date.now() });
    publishRealtime({ type: 'security:authLocksChanged', ts: Date.now() });

    return res.json({ data: updated });
  } catch {
    return res.status(500).json({ message: 'Server Error' });
  }
};

export const reactivateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid teacher id' });

    const updated = await Teacher.findByIdAndUpdate(
      id,
      { $set: { status: 'active' } },
      { new: true }
    )
      .select('fullName teacherId email phone salary status lastAcademicYear createdAt')
      .lean();
    if (!updated) return res.status(404).json({ message: 'Not found' });

    // Best-effort: allow logins + invalidate existing tokens
    try {
      await User.updateOne(
        { teacherRef: id },
        { $set: { status: 'active' }, $inc: { tokenVersion: 1 } }
      );
    } catch {
      // non-blocking
    }

    req.skipAuditTrail = true;
    await writeAuditLog({
      userId: req.user?._id,
      action: 'teachers.reactivate',
      description: `target=${String(id)} type=teacher status=active`,
      req,
    });

    publishRealtime({ type: 'teachers:changed', id: String(id), ts: Date.now() });
    publishRealtime({ type: 'users:changed', ts: Date.now() });
    publishRealtime({ type: 'security:authLocksChanged', ts: Date.now() });

    return res.json({ data: updated });
  } catch {
    return res.status(500).json({ message: 'Server Error' });
  }
};

// Staff/admin: reset a teacher's password to the default password and clear lockout.
// @route PATCH /api/teachers/:id/reset-password
export const resetTeacherPassword = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid teacher id' });

    const teacher = await Teacher.findById(id).select('_id teacherId').lean();
    if (!teacher) return res.status(404).json({ message: 'Not found' });

    // Teachers login through linked User account (preferred), using teacherRef.
    // Fallback to username=teacherId for older data.
    const username = String(teacher.teacherId || '').trim();
    const user = await User.findOne({ $or: [{ teacherRef: teacher._id }, ...(username ? [{ username }] : [])] });
    if (!user) return res.status(404).json({ message: 'Teacher login user not found' });

    const defaultPw = getDefaultInitialPassword();
    user.password = await bcrypt.hash(String(defaultPw), 10);
    user.mustChangePassword = true;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.loginCooldownLevel = 0;
    // Invalidate sessions on reset.
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    await user.save();

    req.skipAuditTrail = true;
    await writeAuditLog({
      userId: req.user?._id,
      action: 'teachers.resetPassword',
      description: `target=${String(user._id)} teacher=${String(teacher._id)} role=teacher source=teacher-route`,
      req,
    });

    // Resolve any open AuthLockEvent for this principal.
    await AuthLockEvent.updateMany(
      { principalModel: 'User', principalId: user._id, resolvedAt: null },
      {
        $set: {
          resolvedAt: new Date(),
          resolvedBy: req.user?._id || null,
          resolution: 'reset',
          isRead: true,
        },
      }
    );

    publishRealtime({ type: 'security:authLocksChanged', ts: Date.now() });
    publishRealtime({ type: 'teachers:changed', id: String(id), ts: Date.now() });
    publishRealtime({ type: 'users:changed', ts: Date.now() });

    return res.json({ ok: true, message: 'Password reset to default and lock cleared.' });
  } catch (e) {
    return res.status(500).json({ message: e?.message || 'Server Error' });
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

    publishRealtime({ type: 'teachers:changed', id: String(id), ts: Date.now() });
    publishRealtime({ type: 'timetable:changed', ts: Date.now() });
    res.status(201).json({ data: { _id: String(created._id) } });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad Request' });
  }
};

export const removeAssignment = async (req, res) => {
  try {
    const { id, assignmentId } = req.params;
    if (![id, assignmentId].every(mongoose.isValidObjectId)) return res.status(400).json({ message: 'Invalid ids' });

    const assignment = await TeacherAssignment.findOne({ _id: assignmentId, teacher: id })
      .select('gradeSection subject')
      .lean();
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    // Block removal if a timetable already references this assignment.
    const hasTimetable = await Timetable.exists({
      gradeSection: assignment.gradeSection,
      teacher: id,
      subject: assignment.subject,
      isBreak: false,
    });
    if (hasTimetable) {
      return res.status(409).json({
        message: 'Cannot remove assignment: timetable exists for this class/subject. Remove timetable entries first.',
      });
    }

    await TeacherAssignment.deleteOne({ _id: assignmentId, teacher: id });

    publishRealtime({ type: 'teachers:changed', id: String(id), ts: Date.now() });
    publishRealtime({ type: 'timetable:changed', ts: Date.now() });
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

// Admin/staff: fetch a teacher profile (Teacher + linked User account)
// @route GET /api/teachers/:id
export const getTeacherProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid teacher id' });

    const teacher = await Teacher.findById(id)
      .select('fullName employeeId teacherId email phone phone2 gender dob nationality isSomali residenceRegionId residenceDistrictId residenceNeighborhood hireDate employmentType salary status specialization qualification yearsOfExperience notes photo lastAcademicYear createdAt')
      .populate({ path: 'lastAcademicYear', select: 'yearName' })
      .lean();
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const user = await User.findOne({ teacherRef: id })
      .select('_id fullName username email phone salary role status lastLogin mustChangePassword')
      .lean();

    return res.json({ data: { teacher, user } });
  } catch (e) {
    return res.status(500).json({ message: e?.message || 'Server Error' });
  }
};

// Admin/staff: fetch audit logs for a teacher's linked User account
// @route GET /api/teachers/:id/logs?page=1&limit=10
export const getTeacherAuditLogs = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'teacher') return res.status(403).json({ message: 'Forbidden' });

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid teacher id' });

    const loginUser = await User.findOne({ teacherRef: id }).select('_id').lean();
    if (!loginUser?._id) return res.json({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } });

    const { pageNum, limitNum, skip } = parsePagination(req.query, { defaultPage: 1, defaultLimit: 10, maxLimit: 100 });
    const total = await AuditLog.countDocuments({ user: loginUser._id });
    const logs = await AuditLog.find({ user: loginUser._id })
      .select('action description ip device timestamp')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalPages = Math.max(1, Math.ceil(total / limitNum));
    return res.json({
      data: logs,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: e?.message || 'Server Error' });
  }
};
