import User from "../models/User.js";
import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import { writeAuditLog } from "../services/auditService.js";
import AuditLog from "../models/AuditLog.js";
import { parsePagination } from '../utils/pagination.js';
import { sanitizePermissionsPayload } from '../utils/permissions.js';
import { publishRealtime } from '../utils/realtimeBus.js';


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




// CREATE USER
export const createUser = async (req, res) => {
  try {
    const { fullName, username, email, phone, role, permissions, password } = req.body;
    if (!password) return res.status(400).json({ message: "Password required" });

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

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName,
      username,
      email,
      phone,
      role: normalizedRole,
      permissions: safePermissions,
      password: hashedPassword,
      // Treat admin-set password as a default; force user to change after first login.
      mustChangePassword: true,
    });

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

    res.status(201).json(newUser);
  } catch (error) {
    console.error("❌ Create user error:", error);
    res.status(500).json({ message: error.message });
  }
};

// UPDATE USER
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const beforeRole = String(user.role || '').toLowerCase();
    const beforeStatus = String(user.status || '').toLowerCase();
    const beforePerms = user.permissions ? JSON.parse(JSON.stringify(user.permissions)) : null;

    const { fullName, username, email, phone, role, permissions, password } = req.body;

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
    user.role = normalizedRole;
    if (safePermissions !== null) {
      user.permissions = safePermissions; // must be object matching schema
    }

    if (password && password.trim() !== "") {
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

    res.json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("❌ Update user error:", error);
    res.status(500).json({ message: error.message });
  }
};


// Get all users
export const getUsers = async (req, res) => {
  try {
    const { search, role, status, sortBy, sortOrder } = req.query;
    const query = {};

    const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // User Management should only list staff/admin accounts.
    // Students and teachers have their own dedicated pages and APIs.
    query.role = { $nin: ['student', 'teacher'] };

    if (role) {
      const normalizedRole = String(role).trim().toLowerCase();
      if (normalizedRole !== 'admin' && normalizedRole !== 'staff') {
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
    const users = await User.find(query).sort({ [safeSortBy]: direction });
    res.json(users);
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

    await User.deleteOne({ _id: target._id });

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

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();

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

