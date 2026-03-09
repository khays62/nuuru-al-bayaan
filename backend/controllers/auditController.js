import { z } from 'zod';

import AuditLog from '../models/AuditLog.js';
import { parsePagination } from '../utils/pagination.js';
import { writeAuditLog } from '../services/auditService.js';

const RANGE_PRESETS = new Set(['today', 'week', 'month', 'all']);

const parseRange = ({ range, from, to } = {}) => {
  const now = new Date();

  const rangeKey = String(range || '').trim().toLowerCase();
  if (rangeKey && RANGE_PRESETS.has(rangeKey)) {
    if (rangeKey === 'all') return { from: null, to: null };

    if (rangeKey === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: now };
    }

    const days = rangeKey === 'week' ? 7 : 30;
    const start = new Date(now.getTime() - (days - 1) * 86400000);
    start.setHours(0, 0, 0, 0);
    return { from: start, to: now };
  }

  const fromDate = from ? new Date(String(from)) : null;
  const toDate = to ? new Date(String(to)) : null;

  const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null;
  const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : null;
  if (!validFrom && !validTo) return { from: null, to: null };

  // Normalize to inclusive bounds.
  if (validFrom) validFrom.setHours(0, 0, 0, 0);
  if (validTo) validTo.setHours(23, 59, 59, 999);

  if (validFrom && validTo && validTo < validFrom) return { from: validFrom, to: validFrom };
  return { from: validFrom, to: validTo };
};

const buildMatch = ({ range, from, to } = {}) => {
  const r = parseRange({ range, from, to });
  const match = {};
  if (r.from || r.to) {
    match.timestamp = {};
    if (r.from) match.timestamp.$gte = r.from;
    if (r.to) match.timestamp.$lte = r.to;
  }
  return { match, resolved: r };
};

const ACTOR_LOOKUP_PIPELINE = Object.freeze([
  {
    $lookup: {
      from: 'users',
      localField: 'user',
      foreignField: '_id',
      as: 'u',
    },
  },
  {
    $lookup: {
      from: 'admins',
      localField: 'user',
      foreignField: '_id',
      as: 'a',
    },
  },
  {
    $addFields: {
      _userDoc: { $arrayElemAt: ['$u', 0] },
      _adminDoc: { $arrayElemAt: ['$a', 0] },
    },
  },
  {
    $addFields: {
      actorRole: {
        $cond: [{ $ifNull: ['$_adminDoc', false] }, 'admin', '$_userDoc.role'],
      },
      actorName: {
        $ifNull: ['$_userDoc.fullName', null],
      },
      actorUsername: {
        $ifNull: ['$_userDoc.username', '$_adminDoc.username'],
      },
    },
  },
  {
    $project: {
      u: 0,
      a: 0,
      _userDoc: 0,
      _adminDoc: 0,
    },
  },
]);

const AUDIT_OPERATION_ORDER = Object.freeze([
  'add',
  'edit',
  'delete',
  'download',
  'activate',
  'deactivate',
  'resetPassword',
  'other',
]);

const AUDIT_WORKSTREAM_ORDER = Object.freeze([
  'users',
  'teachers',
  'students',
  'academics',
  'exams',
  'attendance',
  'timetable',
  'announcements',
  'finance',
  'security',
  'other',
]);

const SUMMARY_METRIC_ACTIONS = Object.freeze({
  logins: 'auth.login',
  logouts: 'auth.logout',
  passwordchanges: 'auth.changePassword',
  pageviews: 'page.view',
});

const normalizeAuditText = (value) => String(value || '').trim().toLowerCase();

const NORMALIZED_AUDIT_OPERATION_ORDER = Object.freeze(AUDIT_OPERATION_ORDER.map((key) => normalizeAuditText(key)));

const inferWorkstream = (action) => {
  const lower = normalizeAuditText(action);
  const prefix = lower.split(/[._]/)[0] || '';

  if (!lower || lower === 'unknown') return 'other';
  if (prefix === 'users' || prefix === 'account' || prefix === 'admin' || prefix === 'user') return 'users';
  if (prefix === 'teachers' || prefix === 'teacher') return 'teachers';
  if (prefix === 'students' || prefix === 'student') return 'students';
  if (prefix === 'attendance') return 'attendance';
  if (prefix === 'timetable') return 'timetable';
  if (prefix === 'announcements' || prefix === 'announcement') return 'announcements';
  if (prefix === 'exams' || prefix === 'exam' || prefix === 'results' || prefix === 'result') return 'exams';
  if (prefix === 'subjects' || prefix === 'subject' || prefix === 'grades' || prefix === 'grade' || prefix === 'cohorts' || prefix === 'cohort' || prefix === 'levels' || prefix === 'setup') return 'academics';
  if (prefix === 'security' || prefix === 'auth') return 'security';
  if (prefix.startsWith('finance') || lower.includes('charge') || lower.includes('discount') || lower.includes('payment')) return 'finance';
  return 'other';
};

const isIgnoredWorkloadAction = (action) => {
  const lower = normalizeAuditText(action);
  return (
    lower === 'auth.login'
    || lower === 'auth.logout'
    || lower === 'page.view'
    || lower.endsWith('.view')
    || lower.endsWith('.list')
    || lower.startsWith('http.')
  );
};

const containsAnyAuditHint = (value, hints) => {
  const text = normalizeAuditText(value);
  return Array.isArray(hints) && hints.some((hint) => text.includes(normalizeAuditText(hint)));
};

const getAuditHttpMethod = (description) => {
  const match = String(description || '').trim().match(/^(GET|POST|PUT|PATCH|DELETE)\b/i);
  return match?.[1] ? String(match[1]).toUpperCase() : '';
};

const ADD_OPERATION_HINTS = Object.freeze([
  'create',
  'created',
  '.add',
  'add',
  'bulk',
  'import',
  'input',
  'record',
  'payment',
  'income',
  'generate',
  'charge',
  'donation',
  'invoice',
]);

const EDIT_OPERATION_HINTS = Object.freeze([
  'update',
  'updated',
  '.edit',
  'edit',
  'save',
  'saved',
  'adjust',
  'reschedule',
  'change',
  'changed',
  'set',
  'apply',
  'assign',
  'toggle',
  'promote',
  'graduate',
  'transfer',
  'permissionsupdated',
  'rolechanged',
  'amount',
]);

const DELETE_OPERATION_HINTS = Object.freeze([
  'delete',
  'deleted',
  'remove',
  'cancel',
  'revert',
  'void',
]);

const inferOperation = (action, description = '') => {
  const lower = normalizeAuditText(action);
  const desc = normalizeAuditText(description);

  if (!lower || lower === 'unknown') return 'other';
  if (lower === 'auth.changepassword') return 'other';
  if (lower.includes('download')) return 'download';
  if (lower.includes('print')) return 'download';
  if (lower.includes('reactivate')) return 'activate';
  if (lower.includes('deactivate')) return 'deactivate';
  if (lower.includes('activate')) return 'activate';
  if (lower.includes('resetpassword') || lower.includes('passwordset')) return 'resetPassword';
  if (lower.includes('assign')) return 'edit';

  const workstream = inferWorkstream(lower);
  const httpMethod = getAuditHttpMethod(description);

  if (httpMethod === 'DELETE') return 'delete';
  if ((workstream === 'attendance' || workstream === 'exams') && httpMethod) {
    if (httpMethod === 'POST') return 'add';
    if (httpMethod === 'PUT' || httpMethod === 'PATCH') return 'edit';
  }

  if (workstream === 'attendance' && !isIgnoredWorkloadAction(lower)) {
    if (containsAnyAuditHint(lower, ['create', 'add', 'input', 'import', 'record', 'mark', 'take'])) return 'add';
    return 'edit';
  }
  if (workstream === 'exams') {
    if (containsAnyAuditHint(lower, ['update', 'updated', 'edit', 'save', 'adjust', 'publish'])) return 'edit';
    if (containsAnyAuditHint(lower, ['input', 'import', 'score', 'record', 'bulk', 'add', 'create', 'generate'])) return 'add';
  }

  if (containsAnyAuditHint(lower, DELETE_OPERATION_HINTS)) return 'delete';
  if (containsAnyAuditHint(lower, EDIT_OPERATION_HINTS) || containsAnyAuditHint(desc, ['inactive', 'active', 'discount'])) return 'edit';
  if (containsAnyAuditHint(lower, ADD_OPERATION_HINTS)) return 'add';

  if (lower.includes('togglestatus') || lower.includes('statuschanged')) {
    if (desc.includes('inactive')) return 'deactivate';
    if (desc.includes('reactivate')) return 'activate';
    if (desc.includes('active')) return 'activate';
  }

  return 'other';
};

const isSupportedAuditMetric = (metric) => {
  const key = normalizeAuditText(metric);
  return key === 'total'
    || Boolean(SUMMARY_METRIC_ACTIONS[key])
    || NORMALIZED_AUDIT_OPERATION_ORDER.includes(key);
};

const matchesAuditMetric = (row, metric) => {
  const key = normalizeAuditText(metric);
  if (!key || key === 'total') return true;

  const exactAction = SUMMARY_METRIC_ACTIONS[key];
  if (exactAction) {
    return normalizeAuditText(row?.action) === normalizeAuditText(exactAction);
  }

  return normalizeAuditText(inferOperation(row?.action, row?.description)) === key;
};

const emptyOrderedCounts = (keys) => Object.fromEntries(keys.map((key) => [key, 0]));

const orderedEntries = (counts, keys) => keys.map((key) => ({ key, count: Number(counts[key] || 0) }));

const emptyDetailMap = (keys) => Object.fromEntries(keys.map((key) => [key, null]));

const toActorPayload = (row) => ({
  id: row?.user || null,
  role: row?.actorRole || null,
  fullName: row?.actorName || null,
  username: row?.actorUsername || null,
});

const toDetailPayload = (row) => ({
  action: row?.action || '',
  description: row?.description || '',
  timestamp: row?.timestamp ? new Date(row.timestamp).toISOString() : null,
  actor: toActorPayload(row),
  ip: row?.ip || '',
  device: row?.device || '',
});

const buildAuditDetailProjection = () => ([
  ...ACTOR_LOOKUP_PIPELINE,
  {
    $project: {
      action: 1,
      description: 1,
      ip: 1,
      device: 1,
      timestamp: 1,
      actor: {
        id: '$user',
        role: '$actorRole',
        fullName: '$actorName',
        username: '$actorUsername',
      },
    },
  },
]);

export const getSystemAuditSummary = async (req, res) => {
  try {
    const { match, resolved } = buildMatch(req.query || {});

    const rows = await AuditLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = new Map((Array.isArray(rows) ? rows : []).map((r) => [String(r._id || ''), Number(r.count || 0)]));
    const total = Array.from(counts.values()).reduce((sum, v) => sum + v, 0);

    const get = (k) => Number(counts.get(k) || 0);

    const payload = {
      range: {
        from: resolved.from ? resolved.from.toISOString() : null,
        to: resolved.to ? resolved.to.toISOString() : null,
      },
      totals: {
        total,
        logins: get('auth.login'),
        logouts: get('auth.logout'),
        passwordChanges: get('auth.changePassword'),
        pageViews: get('page.view'),
      },
    };

    return res.json({ data: payload });
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'Failed to build audit summary' });
  }
};

export const getSystemAuditTimeline = async (req, res) => {
  try {
    const { match, resolved } = buildMatch(req.query || {});
    const metric = String(req.query?.metric || 'total').trim();
    if (!isSupportedAuditMetric(metric)) {
      return res.status(400).json({ message: 'Unsupported audit metric' });
    }
    const rangeKey = String(req.query?.range || '').toLowerCase();
    const useHourly = rangeKey === 'today';
    const useMonthly = rangeKey === 'all';

    const groupId = useHourly
      ? {
          y: { $year: '$timestamp' },
          m: { $month: '$timestamp' },
          d: { $dayOfMonth: '$timestamp' },
          h: { $hour: '$timestamp' },
        }
      : (useMonthly
          ? {
              y: { $year: '$timestamp' },
              m: { $month: '$timestamp' },
            }
          : {
              y: { $year: '$timestamp' },
              m: { $month: '$timestamp' },
              d: { $dayOfMonth: '$timestamp' },
            });

    const series = await AuditLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            ...groupId,
            action: '$action',
            description: { $ifNull: ['$description', ''] },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          '_id.y': 1,
          '_id.m': 1,
          ...(!useMonthly ? { '_id.d': 1 } : {}),
          ...(useHourly ? { '_id.h': 1 } : {}),
        },
      },
    ]);

    const pointMap = new Map();
    for (const row of Array.isArray(series) ? series : []) {
      const y = row?._id?.y;
      const m = row?._id?.m;
      const d = row?._id?.d;
      const h = row?._id?.h;
      const label = useHourly
        ? `${String(h).padStart(2, '0')}:00`
        : (useMonthly
            ? `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`
            : `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      const bucketKey = `${String(y)}-${String(m)}-${String(d || '')}-${String(h || '')}`;

      if (!pointMap.has(bucketKey)) {
        pointMap.set(bucketKey, { label, value: 0 });
      }

      if (matchesAuditMetric({ action: row?._id?.action, description: row?._id?.description }, metric)) {
        pointMap.get(bucketKey).value += Number(row?.count || 0);
      }
    }

    const points = Array.from(pointMap.values());

    return res.json({
      data: {
        range: {
          from: resolved.from ? resolved.from.toISOString() : null,
          to: resolved.to ? resolved.to.toISOString() : null,
        },
        bucket: useHourly ? 'hour' : (useMonthly ? 'month' : 'day'),
        metric,
        points,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'Failed to build audit timeline' });
  }
};

export const getSystemAuditEvents = async (req, res) => {
  try {
    const { match } = buildMatch(req.query || {});

    const { pageNum, limitNum, skip } = parsePagination(req.query, { defaultPage: 1, defaultLimit: 20, maxLimit: 100 });

    const total = await AuditLog.countDocuments(match);

    const logs = await AuditLog.aggregate([
      { $match: match },
      { $sort: { timestamp: -1 } },
      { $skip: skip },
      { $limit: limitNum },
      ...ACTOR_LOOKUP_PIPELINE,
      {
        $project: {
          action: 1,
          description: 1,
          ip: 1,
          device: 1,
          timestamp: 1,
          actor: {
            id: '$user',
            role: '$actorRole',
            fullName: '$actorName',
            username: '$actorUsername',
          },
        },
      },
    ]);

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
    return res.status(500).json({ message: error?.message || 'Failed to fetch audit events' });
  }
};

export const getSystemAuditTop = async (req, res) => {
  try {
    const { match, resolved } = buildMatch(req.query || {});

    const topActors = await AuditLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$user',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $project: {
          user: '$_id',
          count: 1,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'u',
        },
      },
      {
        $lookup: {
          from: 'admins',
          localField: 'user',
          foreignField: '_id',
          as: 'a',
        },
      },
      {
        $addFields: {
          _userDoc: { $arrayElemAt: ['$u', 0] },
          _adminDoc: { $arrayElemAt: ['$a', 0] },
        },
      },
      {
        $addFields: {
          role: {
            $cond: [{ $ifNull: ['$_adminDoc', false] }, 'admin', '$_userDoc.role'],
          },
          fullName: {
            $ifNull: ['$_userDoc.fullName', null],
          },
          username: {
            $ifNull: ['$_userDoc.username', '$_adminDoc.username'],
          },
        },
      },
      {
        $project: {
          u: 0,
          a: 0,
          _userDoc: 0,
          _adminDoc: 0,
        },
      },
    ]);

    const topPages = await AuditLog.aggregate([
      { $match: { ...match, action: 'page.view' } },
      {
        $project: {
          path: {
            $let: {
              vars: {
                d: { $ifNull: ['$description', ''] },
                n: { $strLenBytes: { $ifNull: ['$description', ''] } },
              },
              in: {
                $cond: [
                  { $regexMatch: { input: '$$d', regex: /^path=/ } },
                  {
                    $substrBytes: [
                      '$$d',
                      5,
                      {
                        $max: [0, { $subtract: ['$$n', 5] }],
                      },
                    ],
                  },
                  '$$d',
                ],
              },
            },
          },
        },
      },
      { $match: { path: { $ne: '' } } },
      {
        $group: {
          _id: '$path',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $project: {
          path: '$_id',
          count: 1,
        },
      },
    ]);

    return res.json({
      data: {
        range: {
          from: resolved.from ? resolved.from.toISOString() : null,
          to: resolved.to ? resolved.to.toISOString() : null,
        },
        topActors,
        topPages,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'Failed to fetch top audit stats' });
  }
};

export const getSystemAuditAnalytics = async (req, res) => {
  try {
    const { match, resolved } = buildMatch(req.query || {});

    const [groupedRows, statusRows, recentRows] = await Promise.all([
      AuditLog.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
          },
        },
      ]),
      AuditLog.find({
        ...match,
        action: { $in: ['users.toggleStatus', 'account.statusChanged'] },
      })
        .select({ action: 1, description: 1, _id: 0 })
        .lean(),
      AuditLog.aggregate([
        { $match: match },
        { $sort: { timestamp: -1 } },
        { $limit: 300 },
        ...ACTOR_LOOKUP_PIPELINE,
        {
          $project: {
            user: 1,
            action: 1,
            description: 1,
            timestamp: 1,
            actorRole: 1,
            actorName: 1,
            actorUsername: 1,
          },
        },
      ]),
    ]);

    const operationCounts = emptyOrderedCounts(AUDIT_OPERATION_ORDER);
    const workstreamCounts = emptyOrderedCounts(AUDIT_WORKSTREAM_ORDER);
    const operationDetails = emptyDetailMap(AUDIT_OPERATION_ORDER);
    const workstreamDetails = emptyDetailMap(AUDIT_WORKSTREAM_ORDER);

    for (const row of Array.isArray(groupedRows) ? groupedRows : []) {
      const action = String(row?._id || '');
      const count = Number(row?.count || 0);
      if (!count || isIgnoredWorkloadAction(action)) continue;

      const workstream = inferWorkstream(action);
      const operation = inferOperation(action);

      if (workstreamCounts[workstream] !== undefined) workstreamCounts[workstream] += count;
      if (operationCounts[operation] !== undefined) operationCounts[operation] += count;
    }

    for (const row of Array.isArray(statusRows) ? statusRows : []) {
      const derivedOperation = inferOperation(row?.action, row?.description);
      if (derivedOperation === 'activate' || derivedOperation === 'reactivate' || derivedOperation === 'deactivate') {
        operationCounts.other = Math.max(0, Number(operationCounts.other || 0) - 1);
        operationCounts[derivedOperation] += 1;
      }
    }

    for (const row of Array.isArray(recentRows) ? recentRows : []) {
      const action = String(row?.action || '');
      if (!action || isIgnoredWorkloadAction(action)) continue;

      const workstream = inferWorkstream(action);
      const operation = inferOperation(action, row?.description);
      const detail = toDetailPayload(row);

      if (!operationDetails[operation]) operationDetails[operation] = detail;
      if (!workstreamDetails[workstream]) workstreamDetails[workstream] = detail;
    }

    const operations = orderedEntries(operationCounts, AUDIT_OPERATION_ORDER)
      .filter((item) => item.count > 0)
      .map((item) => ({
        ...item,
        latest: operationDetails[item.key] || null,
      }))
      .sort((a, b) => b.count - a.count || AUDIT_OPERATION_ORDER.indexOf(a.key) - AUDIT_OPERATION_ORDER.indexOf(b.key));

    const workstreams = orderedEntries(workstreamCounts, AUDIT_WORKSTREAM_ORDER)
      .filter((item) => item.count > 0)
      .map((item) => ({
        ...item,
        latest: workstreamDetails[item.key] || null,
      }))
      .sort((a, b) => b.count - a.count || AUDIT_WORKSTREAM_ORDER.indexOf(a.key) - AUDIT_WORKSTREAM_ORDER.indexOf(b.key));

    const totalTracked = operations.reduce((sum, item) => sum + Number(item.count || 0), 0);

    return res.json({
      data: {
        range: {
          from: resolved.from ? resolved.from.toISOString() : null,
          to: resolved.to ? resolved.to.toISOString() : null,
        },
        totalTracked,
        operations,
        workstreams,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'Failed to fetch audit analytics' });
  }
};

export const getSystemAuditAnalyticsDetails = async (req, res) => {
  try {
    const { match, resolved } = buildMatch(req.query || {});
    const metric = String(req.query?.metric || req.query?.operation || '').trim();
    if (!metric) {
      return res.status(400).json({ message: 'Metric is required' });
    }
    if (!isSupportedAuditMetric(metric)) {
      return res.status(400).json({ message: 'Unsupported audit metric' });
    }

    const { pageNum, limitNum, skip } = parsePagination(req.query, { defaultPage: 1, defaultLimit: 20, maxLimit: 100 });

    const matchedRows = await AuditLog.aggregate([
      { $match: match },
      { $sort: { timestamp: -1 } },
      ...buildAuditDetailProjection(),
    ]);

    const filtered = (Array.isArray(matchedRows) ? matchedRows : [])
      .filter((row) => matchesAuditMetric(row, metric));

    const total = filtered.length;
    const pageRows = filtered.slice(skip, skip + limitNum);
    const totalPages = Math.max(1, Math.ceil(total / limitNum));

    return res.json({
      data: pageRows,
      meta: {
        metric,
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
      range: {
        from: resolved.from ? resolved.from.toISOString() : null,
        to: resolved.to ? resolved.to.toISOString() : null,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'Failed to fetch audit analytics details' });
  }
};

export const getSystemAuditOperationSummary = async (req, res) => {
  try {
    const { match, resolved } = buildMatch(req.query || {});
    const operation = String(req.query?.operation || '').trim();
    if (!operation) {
      return res.status(400).json({ message: 'Operation is required' });
    }

    const rows = await AuditLog.find(match)
      .select({ action: 1, description: 1, _id: 0 })
      .lean();

    const total = (Array.isArray(rows) ? rows : []).reduce((sum, row) => {
      return sum + (inferOperation(row?.action, row?.description) === operation ? 1 : 0);
    }, 0);

    return res.json({
      data: {
        operation,
        total,
        range: {
          from: resolved.from ? resolved.from.toISOString() : null,
          to: resolved.to ? resolved.to.toISOString() : null,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'Failed to fetch audit operation summary' });
  }
};

const clientEventSchema = z
  .object({
    action: z.enum(['page.view', 'client.download', 'client.print']),
    path: z.string().trim().min(1).max(200),
    format: z.string().trim().min(1).max(32).optional(),
    label: z.string().trim().min(1).max(200).optional(),
  })
  .strip();

// Very small in-memory dedupe (best-effort). Keeps the log usable even if
// a client re-renders or retries.
const recentClientEvents = new Map();
const CLIENT_EVENT_TTL_MS = 15_000;

export const postClientAuditEvent = async (req, res) => {
  try {
    const uid = req.user?._id;
    if (!uid) return res.status(401).json({ message: 'Unauthorized' });

    const parsed = clientEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error?.issues?.[0]?.message || 'Invalid event' });
    }

    const { action, path, format, label } = parsed.data;
    const key = `${String(uid)}|${action}|${path}|${String(format || '')}|${String(label || '')}`;
    const now = Date.now();
    const last = Number(recentClientEvents.get(key) || 0);
    if (now - last < CLIENT_EVENT_TTL_MS) {
      return res.json({ success: true, deduped: true });
    }
    recentClientEvents.set(key, now);

    // Best-effort map cleanup.
    if (recentClientEvents.size > 20_000) {
      for (const [k, t] of recentClientEvents) {
        if (now - Number(t || 0) > CLIENT_EVENT_TTL_MS) recentClientEvents.delete(k);
      }
    }

    const detailParts = [`path=${path}`];
    if (format) detailParts.push(`format=${String(format).slice(0, 32)}`);
    if (label) detailParts.push(`label=${String(label).slice(0, 200)}`);
    const desc = detailParts.join(' ');

    await writeAuditLog({
      userId: uid,
      action,
      description: desc,
      req,
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'Failed to record client audit event' });
  }
};
