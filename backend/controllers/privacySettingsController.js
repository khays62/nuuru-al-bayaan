import PrivacySettings from '../models/PrivacySettings.js';
import {
  getClientPrivacyPolicy,
  getResolvedPrivacyPolicy,
  normalizePrivacyPolicy,
} from '../utils/privacyPolicy.js';
import { writeAuditLog } from '../services/auditService.js';
import { publishRealtime } from '../utils/realtimeBus.js';

const PRIVACY_SETTINGS_KEY = 'privacy-policy';

export async function getPrivacyPolicy(_req, res) {
  try {
    const doc = await PrivacySettings.findOne({ singletonKey: PRIVACY_SETTINGS_KEY }).lean();
    const policy = normalizePrivacyPolicy(doc || {});
    return res.json({
      success: true,
      policy,
      updatedAt: doc?.updatedAt || null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load privacy policy' });
  }
}

export async function getClientPrivacyPolicyForSession(_req, res) {
  try {
    const policy = await getResolvedPrivacyPolicy();
    return res.json({
      success: true,
      policy: getClientPrivacyPolicy(policy),
    });
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to load client privacy policy' });
  }
}

export async function updatePrivacyPolicy(req, res) {
  try {
    const normalized = normalizePrivacyPolicy(req.body || {});
    const doc = await PrivacySettings.findOneAndUpdate(
      { singletonKey: PRIVACY_SETTINGS_KEY },
      {
        $set: {
          singletonKey: PRIVACY_SETTINGS_KEY,
          loginProtection: normalized.loginProtection,
          passwordPolicy: normalized.passwordPolicy,
          sessionPolicy: normalized.sessionPolicy,
          studentDashboard: normalized.studentDashboard,
          aiChat: normalized.aiChat,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    ).lean();

    await writeAuditLog({
      userId: req.user?._id,
      action: 'security.privacyPolicyUpdated',
      description: 'updated system privacy policy',
      req,
    });

    const ts = Date.now();
    publishRealtime({ type: 'security:privacyPolicyChanged', ts, op: 'update' });

    return res.json({
      success: true,
      policy: normalizePrivacyPolicy(doc || {}),
      updatedAt: doc?.updatedAt || null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update privacy policy' });
  }
}