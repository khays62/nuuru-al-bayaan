import User from "../models/User.js";
import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import { writeAuditLog } from "../services/auditService.js";
import AuditLog from "../models/AuditLog.js";
import { parsePagination } from '../utils/pagination.js';
import { sanitizePermissionsPayload, normalizePermissionsForApi } from '../utils/permissions.js';
import { publishRealtime } from '../utils/realtimeBus.js';
import Counter from '../models/Counter.js';
import path from 'path';
import fs from 'fs/promises';
import { getResolvedPrivacyPolicy, validatePasswordAgainstPolicy } from '../utils/privacyPolicy.js';
import { deleteRemoteObject, isRemoteUploadsEnabled, putBufferToRemote } from '../services/uploadStorage.js';

const sanitizeUploadsToken = (value, fallback = 'user') => {
  const s = String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return (s || fallback).slice(0, 32);
};

const imageExtFromMimeOrName = (mimetype, originalName) => {
  const mt = String(mimetype || '').toLowerCase();
  if (mt === 'image/jpeg') return '.jpg';
  if (mt === 'image/png') return '.png';
  if (mt === 'image/webp') return '.webp';
  const ext = path.extname(String(originalName || '')).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return '.jpg';
  if (ext === '.png') return '.png';
  if (ext === '.webp') return '.webp';
  return '.jpg';
};

const makeUploadsFilename = ({ actor, mimetype, originalName }) => {
  const who = sanitizeUploadsToken(actor, 'upload');
  const ts = Date.now();
  const rand = Math.random().toString(16).slice(2, 10);
  const ext = imageExtFromMimeOrName(mimetype, originalName);
  return `${who}-${ts}-${rand}${ext}`;
};


const parseJsonIfString = (v) => {
  if (v === undefined || v === null) return v;
  if (typeof v !== 'string') return v;
  const s = v.trim();
  if (!s) return undefined;
  try {
    return JSON.parse(s);
  } catch {
    return v;
  }
};

const moduleHasAnyEnabledPermission = (permObj) => {
  if (!permObj || typeof permObj !== 'object') return false;
  if (permObj.full === true) return true;
  return Object.entries(permObj).some(([k, v]) => k !== 'full' && v === true);
};

// Keep in sync with frontend UserFormModal module groupings.
const deriveStaffMetaFromPermissions = (permissions) => {
  const p = permissions && typeof permissions === 'object' ? permissions : {};
  const modulesEnabled = Object.entries(p)
    .filter(([, permObj]) => moduleHasAnyEnabledPermission(permObj))
    .map(([module]) => String(module));

  if (!modulesEnabled.length) return { unit: '', jobTitle: '' };

  const groupFor = (m) => {
    if (m.startsWith('finance')) return 'finance';
    if (m === 'security' || m === 'trackingAudit' || m === 'privacyControl') return 'security';
    if (m === 'announcements') return 'announcements';
    if (m === 'students' || m === 'teachers') return 'users';
    if (['grades', 'subjects', 'cohorts', 'promotions', 'transfers'].includes(m)) return 'academics';
    if (['exams', 'results', 'transcript'].includes(m)) return 'exams';
    if (['attendance', 'attendanceReports', 'timetable'].includes(m)) return 'operations';
    return 'other';
  };

  const groupsEnabled = Array.from(new Set(modulesEnabled.map(groupFor))).filter(Boolean);
  const unit = (modulesEnabled.length === 1) ? modulesEnabled[0] : 'multiple';
  const jobTitle = (groupsEnabled.length === 1) ? groupsEnabled[0] : 'multiple';

  return { unit, jobTitle };
};

async function ensureStaffCodeForRole(role) {
  const r = String(role || '').trim().toLowerCase();
  if (r !== 'staff' && r !== 'admin') return '';
  const c = await Counter.findOneAndUpdate(
    { key: 'staffCode' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();
  const n = c?.seq || 1;
  return `ST-${String(n).padStart(6, '0')}`;
}


const summarizePermissions = (permissions) => {
  try {
    const p = permissions && typeof permissions === 'object' ? permissions : {};
    const parts = [];
    for (const [module, permObj] of Object.entries(p)) {
      if (!permObj || typeof permObj !== 'object') continue;
      if (permObj.full === true) {
        parts.push(`${module}:full`);
        continue;
      }
      const enabled = Object.entries(permObj)
        .filter(([k, v]) => k !== 'full' && v === true)
        .map(([k]) => k);
      if (enabled.length) parts.push(`${module}:${enabled.join('|')}`);
    }
    const out = parts.join(', ');
    return out.length > 350 ? `${out.slice(0, 347)}...` : out;
  } catch {
    return '';
  }
};

const safeActorLabel = (req) => {
  const u = req?.user;
  return String(u?.fullName || u?.name || u?.username || u?._id || 'unknown');
};

const safeUserResponse = (user) => {
  if (!user) return user;
  const obj = (typeof user?.toObject === 'function') ? user.toObject() : user;
  if (!obj || typeof obj !== 'object') return obj;
  // Never expose password hashes.
  const { password, __v, ...rest } = obj;
  return rest;
};

const coerceBool = (v, fallback = undefined) => {
  if (v === undefined || v === null) return fallback;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'no') return false;
  return fallback;
};




// CREATE USER
export const createUser = async (req, res) => {
  try {
    let uploadedPhotoKey = null;
    let {
      fullName,
      username,
      email,
      phone,
      phone2,
      role,
      permissions,
      password,
      salary,
      isSomali,
      nationality,
      residenceRegionId,
      residenceDistrictId,
      residenceNeighborhood,
    } = req.body;
    if (!password) return res.status(400).json({ message: "Password required" });

    permissions = parseJsonIfString(permissions);

    if (salary !== undefined && salary !== null && salary !== '') {
      const n = Number(salary);
      if (!Number.isFinite(n) || n < 0) return res.status(400).json({ message: 'salary must be a non-negative number', field: 'salary' });
      salary = n;
    } else {
      salary = undefined;
    }

    const normalizedRole = String(role || 'staff').trim().toLowerCase();
    if (normalizedRole === 'student' || normalizedRole === 'teacher') {
      return res.status(400).json({
        message: "User Management can only create staff/admin accounts. Use Students/Teachers modules instead.",
        field: "role",
      });
    }

    if (normalizedRole !== 'admin' && normalizedRole !== 'staff') {
      return res.status(400).json({ message: "Invalid role", field: "role" });
    }

    let safePermissions = undefined;
    if (permissions !== undefined) {
      const { sanitized, unknownModules, unknownActions } = sanitizePermissionsPayload(permissions);
      if (unknownModules.length || unknownActions.length) {
        return res.status(400).json({
          message: 'Invalid permissions payload (unknown module/action)',
          unknownModules,
          unknownActions,
        });
      }
      safePermissions = sanitized;
    }

    const staffCode = await ensureStaffCodeForRole(normalizedRole);
    const derivedMeta = deriveStaffMetaFromPermissions(safePermissions);

    const nextIsSomali = coerceBool(isSomali, true) !== false;
    const nextNationality = nextIsSomali ? 'Somalia' : String(nationality || '').trim();
    if (!nextIsSomali && !nextNationality) {
      return res.status(400).json({ message: 'nationality is required when isSomali=false', field: 'nationality' });
    }

    const nextResidenceRegionId = nextIsSomali ? String(residenceRegionId || '').trim() : '';
    const nextResidenceDistrictId = nextIsSomali ? String(residenceDistrictId || '').trim() : '';
    const nextResidenceNeighborhood = nextIsSomali ? String(residenceNeighborhood || '').trim() : '';

    const privacyPolicy = await getResolvedPrivacyPolicy();
    const createPasswordValidation = validatePasswordAgainstPolicy(password, privacyPolicy);
    if (!createPasswordValidation.ok) {
      const first = createPasswordValidation.issues[0]?.key || 'invalid';
      if (first === 'minLength') {
        return res.status(400).json({ message: `Password must be at least ${createPasswordValidation.policy.minLength} characters`, field: 'password' });
      }
      if (first === 'maxLength') {
        return res.status(400).json({ message: `Password is too long (max ${createPasswordValidation.policy.maxLength})`, field: 'password' });
      }
      return res.status(400).json({ message: `Password failed policy: ${first}`, field: 'password' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName,
      username,
      email,
      phone,
      phone2: String(phone2 || '').trim(),
      nationality: nextNationality,
      isSomali: nextIsSomali,
      residenceRegionId: nextResidenceRegionId,
      residenceDistrictId: nextResidenceDistrictId,
      residenceNeighborhood: nextResidenceNeighborhood,
      salary,
      staffCode: staffCode || undefined,
      unit: derivedMeta.unit,
      jobTitle: derivedMeta.jobTitle,
      role: normalizedRole,
      permissions: safePermissions,
      password: hashedPassword,
      // Treat admin-set password as a default; force user to change after first login.
      mustChangePassword: true,
    });

    // Optional photo (multipart/form-data: photo)
    if (req.file) {
      const file = req.file;
      if (!isRemoteUploadsEnabled()) {
        throw new Error('Remote uploads are required for user photos');
      }

      const filename = makeUploadsFilename({
        actor: req.user?._id || req.user?.username || username || 'user',
        mimetype: file.mimetype,
        originalName: file.originalname,
      });

      const nextRelPath = path.posix.join('uploads', 'users', filename);
      const nextUrl = `/${path.posix.join('api', 'uploads', 'users', filename)}`;

      uploadedPhotoKey = nextRelPath;
      await putBufferToRemote({
        buffer: file.buffer,
        key: uploadedPhotoKey,
        contentType: String(file.mimetype || ''),
      });

      newUser.photo = {
        url: nextUrl,
        path: nextRelPath,
        mimeType: String(file.mimetype || ''),
        size: Number(file.size || (Buffer.isBuffer(file.buffer) ? file.buffer.length : 0) || 0),
        uploadedAt: new Date(),
      };
      await newUser.save();
    }

    await writeAuditLog({
      userId: req.user?._id,
      action: 'users.create',
      description: `created user=${newUser._id} role=${normalizedRole}`,
      req,
    });

    // Also write into the created user's own audit history (so their profile shows who assigned permissions).
    await writeAuditLog({
      userId: newUser._id,
      action: 'account.created',
      description: `created by=${safeActorLabel(req)} role=${normalizedRole}${permissions ? ` perms=${summarizePermissions(permissions)}` : ''}`,
      req,
    });

    publishRealtime({ type: 'users:changed', id: String(newUser._id), ts: Date.now() });

    res.status(201).json(safeUserResponse(newUser));
  } catch (error) {
    // Best-effort cleanup if we uploaded a remote photo but request failed.
    try {
      if (uploadedPhotoKey) await deleteRemoteObject(uploadedPhotoKey);
    } catch {
      // ignore
    }
    console.error("❌ Create user error:", error);
    res.status(500).json({ message: error.message });
  }
};

// UPDATE USER
export const updateUser = async (req, res) => {
  let uploadedNextPhotoKey = null;
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const beforeRole = String(user.role || '').toLowerCase();
    const beforeStatus = String(user.status || '').toLowerCase();
    const beforePerms = user.permissions ? JSON.parse(JSON.stringify(user.permissions)) : null;

    let {
      fullName,
      username,
      email,
      phone,
      phone2,
      role,
      permissions,
      password,
      salary,
      isSomali,
      nationality,
      residenceRegionId,
      residenceDistrictId,
      residenceNeighborhood,
    } = req.body;

    permissions = parseJsonIfString(permissions);

    if (salary !== undefined && salary !== null && salary !== '') {
      const n = Number(salary);
      if (!Number.isFinite(n) || n < 0) return res.status(400).json({ message: 'salary must be a non-negative number', field: 'salary' });
      salary = n;
    } else if (salary === '') {
      salary = 0;
    }

    const normalizedRole = String(role || user.role || 'staff').trim().toLowerCase();
    if (normalizedRole === 'student' || normalizedRole === 'teacher') {
      return res.status(400).json({
        message: "User Management can only manage staff/admin accounts. Use Students/Teachers modules instead.",
        field: "role",
      });
    }

    if (normalizedRole !== 'admin' && normalizedRole !== 'staff') {
      return res.status(400).json({ message: "Invalid role", field: "role" });
    }

    let safePermissions = null;
    if (permissions !== undefined) {
      const { sanitized, unknownModules, unknownActions } = sanitizePermissionsPayload(permissions);
      if (unknownModules.length || unknownActions.length) {
        return res.status(400).json({
          message: 'Invalid permissions payload (unknown module/action)',
          unknownModules,
          unknownActions,
        });
      }
      safePermissions = sanitized;
    }

    user.fullName = fullName;
    user.username = username;
    user.email = email;
    user.phone = phone;
    if (phone2 !== undefined) user.phone2 = String(phone2 || '').trim();
    if (salary !== undefined) user.salary = salary;
    user.role = normalizedRole;

    const nextIsSomali = coerceBool(isSomali, undefined);
    if (nextIsSomali !== undefined) {
      user.isSomali = nextIsSomali !== false;
      if (user.isSomali) {
        user.nationality = 'Somalia';
      } else {
        const nextNationality = String(nationality || '').trim();
        if (!nextNationality) {
          return res.status(400).json({ message: 'nationality is required when isSomali=false', field: 'nationality' });
        }
        user.nationality = nextNationality;
        user.residenceRegionId = '';
        user.residenceDistrictId = '';
        user.residenceNeighborhood = '';
      }
    }

    // Address updates (Somali-only fields)
    if (user.isSomali !== false) {
      if (residenceRegionId !== undefined) user.residenceRegionId = String(residenceRegionId || '').trim();
      if (residenceDistrictId !== undefined) user.residenceDistrictId = String(residenceDistrictId || '').trim();
      if (residenceNeighborhood !== undefined) user.residenceNeighborhood = String(residenceNeighborhood || '').trim();
    }
    if (safePermissions !== null) {
      user.permissions = safePermissions; // must be object matching schema
      const derived = deriveStaffMetaFromPermissions(safePermissions);
      user.unit = derived.unit;
      user.jobTitle = derived.jobTitle;
    }

    if (!user.staffCode && (normalizedRole === 'staff' || normalizedRole === 'admin')) {
      user.staffCode = await ensureStaffCodeForRole(normalizedRole);
    }

    // Optional photo (multipart/form-data: photo)
    if (req.file) {
      const file = req.file;
      if (!isRemoteUploadsEnabled()) {
        throw new Error('Remote uploads are required for user photos');
      }

      const filename = makeUploadsFilename({
        actor: req.user?._id || req.user?.username || user.username || 'user',
        mimetype: file.mimetype,
        originalName: file.originalname,
      });

      const nextRelPath = path.posix.join('uploads', 'users', filename);
      const nextUrl = `/${path.posix.join('api', 'uploads', 'users', filename)}`;

      uploadedNextPhotoKey = nextRelPath;
      await putBufferToRemote({
        buffer: file.buffer,
        key: uploadedNextPhotoKey,
        contentType: String(file.mimetype || ''),
      });

      const prevPath = String(user?.photo?.path || '').trim();
      if (prevPath && prevPath.startsWith('uploads/users/')) {
        const absPrev = path.join(process.cwd(), prevPath);
        try {
          await fs.unlink(absPrev);
        } catch {
          // ignore
        }

        try { await deleteRemoteObject(prevPath); } catch { /* ignore */ }
      }

      user.photo = {
        url: nextUrl,
        path: nextRelPath,
        mimeType: String(file.mimetype || ''),
        size: Number(file.size || (Buffer.isBuffer(file.buffer) ? file.buffer.length : 0) || 0),
        uploadedAt: new Date(),
      };
    }

    if (password && password.trim() !== "") {
      const privacyPolicy = await getResolvedPrivacyPolicy();
      const updatePasswordValidation = validatePasswordAgainstPolicy(password, privacyPolicy);
      if (!updatePasswordValidation.ok) {
        const first = updatePasswordValidation.issues[0]?.key || 'invalid';
        if (first === 'minLength') {
          return res.status(400).json({ message: `Password must be at least ${updatePasswordValidation.policy.minLength} characters`, field: 'password' });
        }
        if (first === 'maxLength') {
          return res.status(400).json({ message: `Password is too long (max ${updatePasswordValidation.policy.maxLength})`, field: 'password' });
        }
        return res.status(400).json({ message: `Password failed policy: ${first}`, field: 'password' });
      }

      user.password = await bcrypt.hash(password, 10);
      // Admin-set password becomes the current "default"; force user to change after login.
      user.mustChangePassword = true;
      // Also clear lockouts so the user can log in with the newly set password.
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      user.loginCooldownLevel = 0;
      // Invalidate existing sessions (old JWTs/cookies) so the new password takes effect everywhere.
      user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    }

    await user.save();

    await writeAuditLog({
      userId: req.user?._id,
      action: 'users.update',
      description: `updated user=${user._id} role=${normalizedRole}`,
      req,
    });

    // Write audit entries into the target user's own history for key account-affecting changes.
    const actor = safeActorLabel(req);
    if (beforeRole !== normalizedRole) {
      await writeAuditLog({
        userId: user._id,
        action: 'account.roleChanged',
        description: `role changed by=${actor} ${beforeRole} -> ${normalizedRole}`,
        req,
      });
    }

    const afterStatus = String(user.status || '').toLowerCase();
    if (beforeStatus !== afterStatus) {
      await writeAuditLog({
        userId: user._id,
        action: 'account.statusChanged',
        description: `status changed by=${actor} ${beforeStatus} -> ${afterStatus}`,
        req,
      });
    }

    try {
      const afterPerms = user.permissions ? JSON.parse(JSON.stringify(user.permissions)) : null;
      const beforeStr = JSON.stringify(beforePerms || {});
      const afterStr = JSON.stringify(afterPerms || {});
      if (beforeStr !== afterStr) {
        await writeAuditLog({
          userId: user._id,
          action: 'account.permissionsUpdated',
          description: `permissions updated by=${actor} perms=${summarizePermissions(afterPerms)}`,
          req,
        });
      }
    } catch {
      // ignore
    }

    if (password && password.trim() !== "") {
      await writeAuditLog({
        userId: user._id,
        action: 'account.passwordSet',
        description: `password set by=${actor} (mustChangePassword=true)`,
        req,
      });
    }

    publishRealtime({ type: 'users:changed', id: String(user._id), ts: Date.now() });

    res.json({ message: "User updated successfully", user: safeUserResponse(user) });
  } catch (error) {
    try {
      if (uploadedNextPhotoKey) await deleteRemoteObject(uploadedNextPhotoKey);
    } catch {
      // ignore
    }
    console.error("❌ Update user error:", error);
    res.status(500).json({ message: error.message });
  }
};


// Get all users
export const getUsers = async (req, res) => {
  try {
    const { search, role, status, sortBy, sortOrder, includeTeachers } = req.query;
    const query = {};

    const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const includeTeachersBool =
      includeTeachers === true ||
      includeTeachers === 1 ||
      String(includeTeachers || '').trim().toLowerCase() === 'true' ||
      String(includeTeachers || '').trim() === '1';

    // User Management should only list staff/admin accounts by default.
    // Finance/Payroll flows can pass includeTeachers=true to include teacher accounts.
    query.role = includeTeachersBool ? { $nin: ['student'] } : { $nin: ['student', 'teacher'] };

    if (role) {
      const normalizedRole = String(role).trim().toLowerCase();
      const allowed = includeTeachersBool ? ['admin', 'staff', 'teacher'] : ['admin', 'staff'];
      if (!allowed.includes(normalizedRole)) {
        return res.status(400).json({ message: "Invalid role filter" });
      }
      query.role = normalizedRole;
    }

    if (status) {
      const normalizedStatus = String(status).trim().toLowerCase();
      if (normalizedStatus !== 'active' && normalizedStatus !== 'inactive') {
        return res.status(400).json({ message: "Invalid status filter" });
      }
      query.status = normalizedStatus;
    }

    if (search) {
      const raw = String(search);
      const trimmed = raw.trim().slice(0, 64);
      const safe = escapeRegex(trimmed);
      query.$or = [
        { fullName: { $regex: safe, $options: "i" } },
        { username: { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
        { phone: { $regex: safe, $options: "i" } },
      ];
    }

    const safeSortBy = ['createdAt', 'updatedAt', 'fullName', 'username', 'email', 'role', 'status'].includes(String(sortBy || ''))
      ? String(sortBy)
      : 'createdAt';
    const direction = String(sortOrder || '').toLowerCase() === 'asc' ? 1 : -1;

    // Never return sensitive fields like password hashes.
    const users = await User.find(query)
        .select('_id staffCode unit jobTitle photo fullName username email phone phone2 nationality isSomali residenceRegionId residenceDistrictId residenceNeighborhood salary role status permissions teacherRef studentRef mustChangePassword createdAt updatedAt')
      .sort({ [safeSortBy]: direction })
      .lean();

    const out = (Array.isArray(users) ? users : []).map((u) => ({
      ...u,
      permissions: normalizePermissionsForApi(u?.permissions),
    }));
    res.json(out);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const target = await User.findById(id);
    if (!target) return res.status(404).json({ message: "User not found" });

    // Guard: don't let an admin delete themselves if they're a User-admin account
    if (String(req.user?._id || '') === String(target._id)) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    // Guard: don't remove the last remaining admin
    if (String(target.role || '').toLowerCase() === 'admin') {
      const adminCount = await Admin.countDocuments({});
      const userAdminCount = await User.countDocuments({ role: 'admin', status: 'active' });
      const totalAdmins = adminCount + userAdminCount;
      if (totalAdmins <= 1) {
        return res.status(400).json({ message: "Cannot delete the last admin" });
      }
    }

    const prevPhotoPath = String(target?.photo?.path || '').trim();

    await User.deleteOne({ _id: target._id });

    // Best-effort cleanup of photo file/object
    if (prevPhotoPath && prevPhotoPath.startsWith('uploads/users/')) {
      const absPrev = path.join(process.cwd(), prevPhotoPath);
      try { await fs.unlink(absPrev); } catch { /* ignore */ }
      try { await deleteRemoteObject(prevPhotoPath); } catch { /* ignore */ }
    }

    await writeAuditLog({
      userId: req.user?._id,
      action: 'users.delete',
      description: `deleted user=${target._id} role=${target.role}`,
      req,
    });

    // Best-effort: record deletion in the target user's own history.
    await writeAuditLog({
      userId: target._id,
      action: 'account.deleted',
      description: `deleted by=${safeActorLabel(req)} role=${String(target.role || '')}`,
      req,
    });

    publishRealtime({ type: 'users:changed', id: String(target._id), ts: Date.now() });
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle user status
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Guard: don't let an admin deactivate themselves if they're a User-admin account
    if (String(req.user?._id || '') === String(user._id)) {
      return res.status(400).json({ message: "You cannot change your own status" });
    }

    // Guard: don't deactivate the last remaining admin
    const nextStatus = user.status === "active" ? "inactive" : "active";
    if (String(user.role || '').toLowerCase() === 'admin' && user.status === 'active' && nextStatus === 'inactive') {
      const adminCount = await Admin.countDocuments({});
      const userAdminCount = await User.countDocuments({ role: 'admin', status: 'active' });
      const totalAdmins = adminCount + userAdminCount;
      if (totalAdmins <= 1) {
        return res.status(400).json({ message: "Cannot deactivate the last admin" });
      }
    }

    user.status = nextStatus;
    // Invalidate all active sessions for this user so they get logged out quickly.
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    await user.save();

    await writeAuditLog({
      userId: req.user?._id,
      action: 'users.toggleStatus',
      description: `user=${user._id} status=${nextStatus}`,
      req,
    });

    // Also show in the target user's audit history.
    await writeAuditLog({
      userId: user._id,
      action: 'account.statusChanged',
      description: `status changed by=${safeActorLabel(req)} -> ${nextStatus}`,
      req,
    });

    publishRealtime({ type: 'users:changed', id: String(user._id), ts: Date.now() });

    res.json(safeUserResponse(user));
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('_id staffCode unit jobTitle photo fullName username email phone phone2 nationality isSomali residenceRegionId residenceDistrictId residenceNeighborhood salary role status permissions teacherRef studentRef mustChangePassword createdAt updatedAt')
      .lean();

    if (!user)
      return res.status(404).json({ message: "User not found" });

    res.json({ data: user });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

export const getUserAuditLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { pageNum, limitNum, skip } = parsePagination(req.query, { defaultPage: 1, defaultLimit: 10, maxLimit: 100 });

    const exists = await User.exists({ _id: id });
    if (!exists) return res.status(404).json({ message: 'User not found' });

    const total = await AuditLog.countDocuments({ user: id });
    const logs = await AuditLog.find({ user: id })
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
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'Failed to fetch logs' });
  }
};

export const checkUsernameAvailability = async (req, res) => {
  try {
    const username = String(req?.query?.username || '').trim();
    if (!username) return res.json({ data: { available: false } });

    const excludeId = String(req?.query?.excludeId || '').trim();
    const query = { username };
    if (excludeId) query._id = { $ne: excludeId };

    const exists = await User.exists(query);
    return res.json({ data: { available: !exists } });
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'Failed to check username' });
  }
};

