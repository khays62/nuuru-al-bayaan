import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import AuthLockEvent from '../models/AuthLockEvent.js';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import { getDefaultInitialPassword } from '../utils/defaultPasswords.js';
import { parseLimit } from '../utils/pagination.js';

const objectId = (v) => (mongoose.isValidObjectId(v) ? String(v) : null);

async function autoResolveExpiredLocks() {
  const now = new Date();
  await AuthLockEvent.updateMany(
    { resolvedAt: null, lockUntil: { $ne: null, $lte: now } },
    { $set: { resolvedAt: now, resolution: 'expired', isRead: true } }
  );
}

export const getAuthLockUnreadCount = async (req, res) => {
  try {
    await autoResolveExpiredLocks();
    const now = new Date();
    // Badge count: show only actionable locks (real principals with active lockUntil).
    const count = await AuthLockEvent.countDocuments({
      resolvedAt: null,
      principalModel: { $in: ['User', 'Admin'] },
      lockUntil: { $ne: null, $gt: now },
    });
    return res.json({ success: true, count });
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
        // Unknown username alerts (only show while unread)
        { principalModel: 'Unknown', isRead: false },
      ],
    })
      .sort({ isRead: 1, lastSeenAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ success: true, events: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
};

export const markAuthLockEventRead = async (req, res) => {
  try {
    const { id } = req.params;
    const oid = objectId(id);
    if (!oid) return res.status(400).json({ success: false, message: 'Invalid id' });

    const updated = await AuthLockEvent.findByIdAndUpdate(
      oid,
      { $set: { isRead: true } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
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

    const defaultPw = getDefaultInitialPassword();
    principal.password = await bcrypt.hash(String(defaultPw), 10);
    principal.mustChangePassword = true;
    principal.failedLoginAttempts = 0;
    principal.lockUntil = null;
    principal.loginCooldownLevel = 0;
    await principal.save();

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

export const lockUser24h = async (req, res) => {
  try {
    const { id } = req.params;
    const oid = objectId(id);
    if (!oid) return res.status(400).json({ success: false, message: 'Invalid id' });

    const admin = await Admin.findById(oid);
    const user = admin ? null : await User.findById(oid);
    const principal = admin || user;
    if (!principal) return res.status(404).json({ success: false, message: 'User not found' });

    principal.failedLoginAttempts = 0;
    principal.lockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    principal.loginCooldownLevel = 4;
    await principal.save();

    // Create / update AuthLockEvent so bell count increases
    const principalModel = admin ? 'Admin' : 'User';
    const existing = await AuthLockEvent.findOne({ principalModel, principalId: principal._id, resolvedAt: null })
      .select('_id')
      .lean();

    if (existing?._id) {
      await AuthLockEvent.updateOne(
        { _id: existing._id },
        {
          $set: {
            lastSeenAt: new Date(),
            lockUntil: principal.lockUntil,
            isRead: false,
          },
          $inc: { occurrences: 1 },
        }
      );
    } else {
      await AuthLockEvent.create({
        principalModel,
        principalId: principal._id,
        username: String(principal.username || principal.email || ''),
        fullName: String(principal.fullName || ''),
        role: String((admin ? 'admin' : principal.role) || '').toLowerCase(),
        lockUntil: principal.lockUntil,
        ip: String(req.ip || ''),
        userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
        occurrences: 1,
        isRead: false,
        resolvedAt: null,
      });
    }

    return res.json({ success: true, message: 'User locked for 24 hours.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || 'Server error' });
  }
};
