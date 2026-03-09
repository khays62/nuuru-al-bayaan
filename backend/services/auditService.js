import AuditLog from '../models/AuditLog.js';
import { publishRealtime } from '../utils/realtimeBus.js';

const AGGREGATE_WINDOW_MS_DEFAULT = 90_000;

function buildRealtimeLog({ doc, userId, req }) {
  const actorRole = String(req?.user?.role || '').toLowerCase() || null;
  const actorFullName = req?.user?.fullName ? String(req.user.fullName) : null;
  const actorUsername = req?.user?.username ? String(req.user.username) : null;

  return {
    _id: doc?._id,
    action: doc?.action,
    description: doc?.description,
    ip: doc?.ip,
    device: doc?.device,
    timestamp: doc?.timestamp,
    actor: {
      id: userId,
      role: actorRole,
      fullName: actorFullName,
      username: actorUsername,
    },
  };
}

function mergeAuditMetadata(existing, incoming) {
  const base = existing && typeof existing === 'object' ? { ...existing } : {};
  const next = incoming && typeof incoming === 'object' ? { ...incoming } : {};

  const existingStudentIds = Array.isArray(base.studentIds) ? base.studentIds.map(String) : [];
  const nextStudentIds = Array.isArray(next.studentIds) ? next.studentIds.map(String) : [];
  const mergedStudentIds = Array.from(new Set([...existingStudentIds, ...nextStudentIds]));

  const rowCount = Number(base.rowCount || 0) + Number(next.rowCount || 0);

  return {
    ...base,
    ...next,
    rowCount,
    studentIds: mergedStudentIds,
    studentCount: mergedStudentIds.length || Number(next.studentCount || base.studentCount || 0),
  };
}

export const writeAuditLog = async ({ userId, action, description = '', req } = {}) => {
  try {
    if (!userId) return;
    const ip = req?.ip ? String(req.ip) : '';
    const device = req?.headers?.['user-agent'] ? String(req.headers['user-agent']).slice(0, 200) : '';

    const doc = await AuditLog.create({
      user: userId,
      action: String(action || 'unknown'),
      description: String(description || '').slice(0, 500),
      ip,
      device,
    });

    // Best-effort realtime event for admin/staff dashboards.
    // Never fail the main request flow due to realtime issues.
    try {
      publishRealtime({
        type: 'audit:created',
        ts: Date.now(),
        log: buildRealtimeLog({ doc, userId, req }),
      });
    } catch {
      // ignore
    }
  } catch {
    // Avoid breaking the main request flow on audit failures.
  }
};

export const upsertAggregatedAuditLog = async ({
  userId,
  action,
  description = '',
  req,
  aggregateKey = '',
  metadata = {},
  aggregateWindowMs = AGGREGATE_WINDOW_MS_DEFAULT,
} = {}) => {
  try {
    if (!userId) return null;

    const normalizedKey = String(aggregateKey || '').trim();
    if (!normalizedKey) {
      await writeAuditLog({ userId, action, description, req });
      return null;
    }

    const ip = req?.ip ? String(req.ip) : '';
    const device = req?.headers?.['user-agent'] ? String(req.headers['user-agent']).slice(0, 200) : '';
    const now = new Date();
    const threshold = new Date(now.getTime() - Math.max(5_000, Number(aggregateWindowMs || AGGREGATE_WINDOW_MS_DEFAULT)));

    const existing = await AuditLog.findOne({
      user: userId,
      action: String(action || 'unknown'),
      aggregateKey: normalizedKey,
      timestamp: { $gte: threshold },
    }).sort({ timestamp: -1 });

    if (!existing) {
      const created = await AuditLog.create({
        user: userId,
        action: String(action || 'unknown'),
        description: String(description || '').slice(0, 500),
        aggregateKey: normalizedKey,
        metadata: mergeAuditMetadata({}, metadata),
        ip,
        device,
        timestamp: now,
      });

      publishRealtime({
        type: 'audit:created',
        ts: Date.now(),
        log: buildRealtimeLog({ doc: created, userId, req }),
      });
      return created;
    }

    existing.description = String(description || '').slice(0, 500);
    existing.metadata = mergeAuditMetadata(existing.metadata, metadata);
    existing.ip = ip;
    existing.device = device;
    existing.timestamp = now;
    await existing.save();

    publishRealtime({
      type: 'audit:updated',
      ts: Date.now(),
      log: buildRealtimeLog({ doc: existing, userId, req }),
    });
    return existing;
  } catch {
    return null;
  }
};
