import ActivityNotification from '../models/ActivityNotification.js';
import { publishRealtime } from '../utils/realtimeBus.js';

const AGGREGATE_WINDOW_MS_DEFAULT = 90_000;

function mergeNotificationMetadata(existing, incoming) {
  const base = existing && typeof existing === 'object' ? { ...existing } : {};
  const next = incoming && typeof incoming === 'object' ? { ...incoming } : {};
  const existingStudentIds = Array.isArray(base.studentIds) ? base.studentIds.map(String) : [];
  const nextStudentIds = Array.isArray(next.studentIds) ? next.studentIds.map(String) : [];
  const studentIds = Array.from(new Set([...existingStudentIds, ...nextStudentIds]));
  const rowCount = Number(base.rowCount || 0) + Number(next.rowCount || 0);

  return {
    ...base,
    ...next,
    rowCount,
    studentIds,
    studentCount: studentIds.length || Number(next.studentCount || base.studentCount || 0),
  };
}

export async function createActivityNotification({
  category,
  action,
  title,
  message = '',
  actorUserId = null,
  actorName = '',
  actorRole = '',
  classLabel = '',
  subjectLabel = '',
  metadata = {},
} = {}) {
  if (!category || !action || !title) return null;

  const created = await ActivityNotification.create({
    category: String(category).trim(),
    action: String(action).trim(),
    title: String(title).trim(),
    message: String(message || '').trim(),
    actorUserId: actorUserId || null,
    actorName: String(actorName || '').trim(),
    actorRole: String(actorRole || '').trim().toLowerCase(),
    classLabel: String(classLabel || '').trim(),
    subjectLabel: String(subjectLabel || '').trim(),
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
  });

  publishRealtime({ type: 'security:authLocksChanged', ts: Date.now() });
  return created;
}

export async function upsertAggregatedActivityNotification({
  category,
  action,
  title,
  message = '',
  actorUserId = null,
  actorName = '',
  actorRole = '',
  classLabel = '',
  subjectLabel = '',
  metadata = {},
  aggregateKey = '',
  aggregateWindowMs = AGGREGATE_WINDOW_MS_DEFAULT,
} = {}) {
  if (!category || !action || !title) return null;

  const normalizedKey = String(aggregateKey || '').trim();
  if (!normalizedKey) {
    return createActivityNotification({ category, action, title, message, actorUserId, actorName, actorRole, classLabel, subjectLabel, metadata });
  }

  const now = new Date();
  const threshold = new Date(now.getTime() - Math.max(5_000, Number(aggregateWindowMs || AGGREGATE_WINDOW_MS_DEFAULT)));

  const existing = await ActivityNotification.findOne({
    resolvedAt: null,
    actorUserId: actorUserId || null,
    category: String(category).trim(),
    action: String(action).trim(),
    aggregateKey: normalizedKey,
    createdAt: { $gte: threshold },
  }).sort({ createdAt: -1 });

  if (!existing) {
    return createActivityNotification({
      category,
      action,
      title,
      message,
      actorUserId,
      actorName,
      actorRole,
      classLabel,
      subjectLabel,
      metadata: mergeNotificationMetadata({}, metadata),
      aggregateKey: normalizedKey,
    });
  }

  existing.title = String(title).trim();
  existing.message = String(message || '').trim();
  existing.actorName = String(actorName || '').trim();
  existing.actorRole = String(actorRole || '').trim().toLowerCase();
  existing.classLabel = String(classLabel || '').trim();
  existing.subjectLabel = String(subjectLabel || '').trim();
  existing.metadata = mergeNotificationMetadata(existing.metadata, metadata);
  existing.createdAt = now;
  await existing.save();

  publishRealtime({ type: 'security:authLocksChanged', ts: Date.now() });
  return existing;
}