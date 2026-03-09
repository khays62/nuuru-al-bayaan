import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import AuthLockEvent from '../models/AuthLockEvent.js';
import ActivityNotification from '../models/ActivityNotification.js';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import Teacher from '../models/Teacher.js';
import Student from '../models/Student.js';
import { getDefaultInitialPassword } from '../utils/defaultPasswords.js';
import { parseLimit } from '../utils/pagination.js';
import { publishRealtime } from '../utils/realtimeBus.js';
import { writeAuditLog } from '../services/auditService.js';

const objectId = (v) => (mongoose.isValidObjectId(v) ? String(v) : null);

const getActorLabel = (req) => {
  const fullName = String(req.user?.fullName || '').trim();
  const username = String(req.user?.username || '').trim();
  const role = String(req.user?.role || '').trim().toLowerCase();
  return fullName || username || role || 'unknown';
};

async function autoResolveExpiredLocks() {
  const now = new Date();
  await AuthLockEvent.updateMany(
    { resolvedAt: null, resolution: { $ne: 'inactive' }, lockUntil: { $ne: null, $lte: now } },
    { $set: { resolvedAt: now, resolution: 'expired', isRead: true } }
  );
}

function mapActivityNotificationRow(row) {
  return {
    _id: row._id,
    kind: 'activity',
    title: String(row.title || ''),
    message: String(row.message || ''),
    metadata: row?.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    role: String(row.actorRole || ''),
    fullName: String(row.actorName || ''),
    category: String(row.category || ''),
    action: String(row.action || ''),
    classLabel: String(row.classLabel || ''),
    subjectLabel: String(row.subjectLabel || ''),
    isRead: Boolean(row.isRead),
    createdAt: row.createdAt || null,
  };
}

function sortBellRows(rows) {
  return rows.sort((a, b) => {
    const readDelta = Number(Boolean(a?.isRead)) - Number(Boolean(b?.isRead));
    if (readDelta !== 0) return readDelta;

    const aTs = new Date(a?.createdAt || a?.lastSeenAt || 0).getTime();
    const bTs = new Date(b?.createdAt || b?.lastSeenAt || 0).getTime();
    return bTs - aTs;
  });
}

export const getAuthLockUnreadCount = async (req, res) => {
  try {
    await autoResolveExpiredLocks();
    const now = new Date();
    // Badge count: count all unread notifications that an admin/staff can act on.
    // Includes:
    // - Real principals that are currently locked (lockUntil in future)
    // - Unknown usernames that got blocked (principalModel=Unknown)
    const count = await AuthLockEvent.countDocuments({
      resolvedAt: null,
      isRead: false,
      $or: [
        { principalModel: { $in: ['User', 'Admin'] }, lockUntil: { $ne: null, $gt: now } },
        { principalModel: 'Unknown' },
      ],
    });
    const activityCount = await ActivityNotification.countDocuments({ resolvedAt: null, isRead: false });
    return res.json({ success: true, count: count + activityCount });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
};

export const listAuthLockEvents = async (req, res) => {
  try {
    await autoResolveExpiredLocks();
    const now = new Date();
    const { limitNum: limit } = parseLimit(req.query, { defaultLimit: 20, maxLimit: 100 });
    const rows = await AuthLockEvent.find({
      resolvedAt: null,
      $or: [
        // Actionable 24h locks
        { principalModel: { $in: ['User', 'Admin'] }, lockUntil: { $ne: null, $gt: now } },
        // Admin explicitly marked the account inactive/reactivated: keep until cleared
        { resolution: { $in: ['inactive', 'reactivated'] } },
        // Unknown username alerts: keep visible until cleared
        { principalModel: 'Unknown' },
      ],
    })
      .sort({ isRead: 1, lastSeenAt: -1 })
      .limit(limit)
      .lean();

    const activityRows = await ActivityNotification.find({ resolvedAt: null })
      .sort({ isRead: 1, createdAt: -1 })
      .limit(limit)
      .lean();

    // Attach current account status for User principals so the UI can toggle Active/Inactive
    // and disable reset/unlock while inactive.
    const userIds = rows
      .filter((r) => String(r.principalModel || '') === 'User' && r.principalId)
      .map((r) => String(r.principalId));

    let userStatusById = new Map();
    if (userIds.length) {
      const users = await User.find({ _id: { $in: userIds } }).select('_id status').lean();
      userStatusById = new Map(users.map((u) => [String(u._id), String(u.status || '')]));
    }

    const withStatus = rows.map((r) => {
      if (String(r.principalModel || '') === 'User' && r.principalId) {
        return { ...r, accountStatus: userStatusById.get(String(r.principalId)) || '' };
      }
      return r;
    });

    const merged = sortBellRows([
      ...withStatus,
      ...activityRows.map(mapActivityNotificationRow),
    ]).slice(0, limit);

    return res.json({ success: true, events: merged });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
};

export const markAuthLockEventRead = async (req, res) => {
  try {
    const { id } = req.params;
    const oid = objectId(id);
    if (!oid) return res.status(400).json({ success: false, message: 'Invalid id' });

    let updated = await AuthLockEvent.findByIdAndUpdate(
      oid,
      { $set: { isRead: true } },
      { new: true }
    ).lean();

    if (!updated) {
      updated = await ActivityNotification.findByIdAndUpdate(
        oid,
        { $set: { isRead: true } },
        { new: true }
      ).lean();
    }

    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
};

export const markAllAuthLockEventsRead = async (req, res) => {
  try {
    await autoResolveExpiredLocks();
    const now = new Date();
    // Mark as read (acknowledged) but do NOT resolve.
    // This clears the badge count while keeping items visible until explicitly cleared or resolved.
    await AuthLockEvent.updateMany(
      {
        resolvedAt: null,
        isRead: false,
        $or: [
          { principalModel: { $in: ['User', 'Admin'] }, lockUntil: { $ne: null, $gt: now } },
          { principalModel: 'Unknown' },
        ],
      },
      { $set: { isRead: true } }
    );
    await ActivityNotification.updateMany(
      { resolvedAt: null, isRead: false },
      { $set: { isRead: true } }
    );
    publishRealtime({ type: 'security:authLocksChanged', ts: Date.now() });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
};

export const clearAuthLockEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const oid = objectId(id);
    if (!oid) return res.status(400).json({ success: false, message: 'Invalid id' });

    let updated = await AuthLockEvent.findByIdAndUpdate(
      oid,
      {
        $set: {
          isRead: true,
          resolvedAt: new Date(),
          resolvedBy: req.user?._id || null,
          resolution: 'cleared',
        },
      },
      { new: true }
    ).lean();

    if (!updated) {
      updated = await ActivityNotification.findByIdAndUpdate(
        oid,
        {
          $set: {
            isRead: true,
            resolvedAt: new Date(),
            resolvedBy: req.user?._id || null,
          },
        },
        { new: true }
      ).lean();
    }

    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
    publishRealtime({ type: 'security:authLocksChanged', ts: Date.now() });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
};

export const clearAllAuthLockEvents = async (req, res) => {
  try {
    await autoResolveExpiredLocks();
    const now = new Date();

    await AuthLockEvent.updateMany(
      {
        resolvedAt: null,
        $or: [
          { principalModel: { $in: ['User', 'Admin'] }, lockUntil: { $ne: null, $gt: now } },
          { resolution: { $in: ['inactive', 'reactivated'] } },
          { principalModel: 'Unknown' },
        ],
      },
      {
        $set: {
          isRead: true,
          resolvedAt: new Date(),
          resolvedBy: req.user?._id || null,
          resolution: 'cleared',
        },
      }
    );

    await ActivityNotification.updateMany(
      { resolvedAt: null },
      {
        $set: {
          isRead: true,
          resolvedAt: new Date(),
          resolvedBy: req.user?._id || null,
        },
      }
    );

    publishRealtime({ type: 'security:authLocksChanged', ts: Date.now() });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
};

export const resetPasswordAndUnlock = async (req, res) => {
  try {
    const { id } = req.params;
    const oid = objectId(id);
    if (!oid) return res.status(400).json({ success: false, message: 'Invalid id' });

    const admin = await Admin.findById(oid);
    const user = admin ? null : await User.findById(oid);
    const principal = admin || user;

    if (!principal) return res.status(404).json({ success: false, message: 'User not found' });

    // Policy: staff/admin accounts do NOT use a shared default reset flow.
    // For those accounts, admins should update the password directly, and the user will be forced to change it after login.
    if (admin) {
      return res.status(400).json({
        success: false,
        message: 'Admin accounts do not support reset-to-default. Use Update Password instead.',
      });
    }
    const roleLower = String(user?.role || '').toLowerCase();
    if (roleLower === 'staff' || roleLower === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Staff accounts do not support reset-to-default. Use Update Password instead.',
      });
    }

    const defaultPw = getDefaultInitialPassword();
    principal.password = await bcrypt.hash(String(defaultPw), 10);
    principal.mustChangePassword = true;
    principal.failedLoginAttempts = 0;
    principal.lockUntil = null;
    principal.loginCooldownLevel = 0;
    // Invalidate sessions on reset.
    principal.tokenVersion = Number(principal.tokenVersion || 0) + 1;
    await principal.save();

    req.skipAuditTrail = true;
    await writeAuditLog({
      userId: req.user?._id,
      action: 'security.resetPassword',
      description: `target=${String(principal._id)} role=${roleLower} source=security-bell`,
      req,
    });

    // Realtime: refresh bell list + affected tables across browsers
    publishRealtime({ type: 'security:authLocksChanged', ts: Date.now() });
    publishRealtime({ type: 'users:changed', id: String(principal._id), ts: Date.now() });
    try {
      if (roleLower === 'teacher') publishRealtime({ type: 'teachers:changed', ts: Date.now() });
      if (roleLower === 'student') publishRealtime({ type: 'students:changed', ts: Date.now() });
    } catch {
      // ignore
    }

    // Resolve any open AuthLockEvent
    await AuthLockEvent.updateMany(
      {
        principalModel: admin ? 'Admin' : 'User',
        principalId: principal._id,
        resolvedAt: null,
      },
      {
        $set: {
          resolvedAt: new Date(),
          resolvedBy: req.user?._id || null,
          resolution: 'reset',
          isRead: true,
        },
      }
    );

    return res.json({ success: true, message: 'Password reset to default and lock cleared.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
};

export const unlockUserLogin = async (req, res) => {
  try {
    const actorRole = String(req.user?.role || '').toLowerCase();
    // Policy: only admins can unlock accounts.
    if (actorRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { id } = req.params;
    const oid = objectId(id);
    if (!oid) return res.status(400).json({ success: false, message: 'Invalid id' });

    const admin = await Admin.findById(oid);
    const user = admin ? null : await User.findById(oid);
    const principal = admin || user;

    if (!principal) return res.status(404).json({ success: false, message: 'User not found' });

    // Policy: from notifications, Unlock is for staff/admin accounts only.
    if (admin) {
      return res.status(400).json({ success: false, message: 'Unlock via notifications is not supported for Admin accounts.' });
    }
    const roleLower = String(user?.role || '').toLowerCase();
    if (roleLower !== 'staff' && roleLower !== 'admin') {
      return res.status(400).json({ success: false, message: 'Unlock is only available for staff accounts. Use reset password for teachers/students.' });
    }

    principal.failedLoginAttempts = 0;
    principal.lockUntil = null;
    principal.loginCooldownLevel = 0;
    principal.tokenVersion = Number(principal.tokenVersion || 0) + 1;
    await principal.save();

    publishRealtime({ type: 'security:authLocksChanged', ts: Date.now() });
    publishRealtime({ type: 'users:changed', id: String(principal._id), ts: Date.now() });

    // Resolve any open AuthLockEvent for this principal so it disappears from the list.
    await AuthLockEvent.updateMany(
      { principalModel: 'User', principalId: principal._id, resolvedAt: null },
      {
        $set: {
          resolvedAt: new Date(),
          resolvedBy: req.user?._id || null,
          resolution: 'unlock',
          isRead: true,
        },
      }
    );

    return res.json({ success: true, message: 'Account unlocked' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
};

export const deactivateUserAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const oid = objectId(id);
    if (!oid) return res.status(400).json({ success: false, message: 'Invalid id' });

    const user = await User.findById(oid);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const actorRole = String(req.user?.role || '').toLowerCase();
    const targetRole = String(user?.role || '').toLowerCase();
    // Policy: staff can only deactivate teacher/student accounts.
    if (actorRole !== 'admin' && (targetRole === 'staff' || targetRole === 'admin')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    user.status = 'inactive';
    // IMPORTANT: do NOT clear lockout fields here.
    // Policy: Only Reset Password / Unlock can remove 24h lock or cooldown.
    // Inactive is a separate status toggle and should not "unlock" the account.
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    await user.save();

    req.skipAuditTrail = true;

    await writeAuditLog({
      userId: req.user?._id,
      action: 'security.deactivate',
      description: `target=${String(user._id)} role=${targetRole} status=inactive`,
      req,
    });

    await writeAuditLog({
      userId: user._id,
      action: 'account.statusChanged',
      description: `status changed by=${getActorLabel(req)} -> inactive`,
      req,
    });

    publishRealtime({ type: 'security:authLocksChanged', ts: Date.now() });
    publishRealtime({ type: 'users:changed', id: String(user._id), ts: Date.now() });

    // Keep any current AuthLockEvent visible until explicitly cleared.
    await AuthLockEvent.updateMany(
      { principalModel: 'User', principalId: user._id, resolvedAt: null },
      {
        $set: {
          isRead: true,
          resolution: 'inactive',
        },
      }
    );

    // Best-effort: keep profile documents in sync.
    try {
      const roleLower = String(user.role || '').toLowerCase();
      if (roleLower === 'teacher' && user.teacherRef) {
        await Teacher.updateOne({ _id: user.teacherRef }, { $set: { status: 'inactive' } });
        publishRealtime({ type: 'teachers:changed', id: String(user.teacherRef), ts: Date.now() });
      }
      if (roleLower === 'student' && user.studentRef) {
        await Student.updateOne({ _id: user.studentRef }, { $set: { status: 'Inactive' } });
        publishRealtime({ type: 'students:changed', id: String(user.studentRef), ts: Date.now() });
      }
    } catch {
      // non-blocking
    }

    // IMPORTANT: do NOT resolve the AuthLockEvent here.
    // Policy: if admin chooses Inactive, the notification remains until explicitly cleared.
    return res.json({ success: true, message: 'Account marked inactive' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
};

export const activateUserAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const oid = objectId(id);
    if (!oid) return res.status(400).json({ success: false, message: 'Invalid id' });

    const user = await User.findById(oid);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const actorRole = String(req.user?.role || '').toLowerCase();
    const targetRole = String(user?.role || '').toLowerCase();
    // Policy: staff can only reactivate teacher/student accounts.
    if (actorRole !== 'admin' && (targetRole === 'staff' || targetRole === 'admin')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    user.status = 'active';
    // IMPORTANT: do NOT clear lockout fields here.
    // Policy: Only Reset Password / Unlock can remove 24h lock or cooldown.
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    await user.save();

    req.skipAuditTrail = true;

    await writeAuditLog({
      userId: req.user?._id,
      action: 'security.activate',
      description: `target=${String(user._id)} role=${targetRole} status=active`,
      req,
    });

    await writeAuditLog({
      userId: user._id,
      action: 'account.statusChanged',
      description: `status changed by=${getActorLabel(req)} -> active`,
      req,
    });

    publishRealtime({ type: 'security:authLocksChanged', ts: Date.now() });
    publishRealtime({ type: 'users:changed', id: String(user._id), ts: Date.now() });

    // Best-effort: keep profile documents in sync.
    try {
      const roleLower = String(user.role || '').toLowerCase();
      if (roleLower === 'teacher' && user.teacherRef) {
        await Teacher.updateOne({ _id: user.teacherRef }, { $set: { status: 'active' } });
        publishRealtime({ type: 'teachers:changed', id: String(user.teacherRef), ts: Date.now() });
      }
      if (roleLower === 'student' && user.studentRef) {
        await Student.updateOne({ _id: user.studentRef }, { $set: { status: 'Active' } });
        publishRealtime({ type: 'students:changed', id: String(user.studentRef), ts: Date.now() });
      }
    } catch {
      // non-blocking
    }

    // Keep any current AuthLockEvent visible until explicitly cleared,
    // but mark that the account was reactivated so the UI can show the toggle.
    await AuthLockEvent.updateMany(
      { principalModel: 'User', principalId: user._id, resolvedAt: null },
      {
        $set: {
          isRead: true,
          resolution: 'reactivated',
        },
      }
    );

    return res.json({ success: true, message: 'Account marked active' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
};
