import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Eye, KeyRound, LogIn, LogOut, MoreVertical, RefreshCcw } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import Card from '../../../shared/components/ui/Card.jsx';
import LoadingState from '../../../shared/components/ui/LoadingState.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import Alert from '../../../shared/components/ui/Alert.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import Tabs from '../../attendance/components/Tabs.jsx';
import { useI18n } from '../../../i18n/useI18n';
import { apiUrl } from '../../../shared/api/http.js';
import { formatAuditDescription, prettifyAuditAction } from '../../../shared/utils/auditFormat.js';

import { getAuditAnalytics, getAuditAnalyticsDetails, getAuditEvents, getAuditSummary, getAuditTimeline, getAuditTop } from '../api/auditApi.js';
import { auditKeys } from '../api/queryKeys.js';
import SystemAuditTable from '../components/SystemAuditTable.jsx';
import Skeleton from '../../../shared/components/ui/Skeleton.jsx';

const ACTION_CARD_KEYS = Object.freeze([
  'add',
  'edit',
  'delete',
  'download',
  'activate',
  'deactivate',
  'resetPassword',
]);

const SUMMARY_CARD_KEYS = Object.freeze([
  'total',
  'logins',
  'logouts',
  'passwordChanges',
  'pageViews',
]);

const ALL_CARD_KEYS = Object.freeze([...SUMMARY_CARD_KEYS, ...ACTION_CARD_KEYS]);
const GLOBAL_RANGE_KEYS = Object.freeze(['today', 'last7', 'custom']);

const createInitialGlobalFilter = () => ({ mode: 'today', from: '', to: '' });

const toBoundaryIso = (dateValue, boundary) => {
  if (!dateValue) return '';
  const suffix = boundary === 'end' ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
  const parsed = new Date(`${dateValue}${suffix}`);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
};

const buildAuditQueryFromFilter = (filter) => {
  const mode = String(filter?.mode || 'today');
  if (mode === 'custom') {
    const from = toBoundaryIso(filter?.from, 'start');
    const to = toBoundaryIso(filter?.to, 'end');
    return {
      range: undefined,
      from,
      to,
      isReady: Boolean(from && to),
    };
  }

  return {
    range: mode === 'last7' ? 'week' : 'today',
    from: '',
    to: '',
    isReady: true,
  };
};

const formatDateOnlyLabel = (value, lang) => {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(lang || 'en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsed);
};

const formatDateTimeLabel = (value, lang) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return new Intl.DateTimeFormat(lang || 'en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
};

const formatRangeSummary = (filter, lang, t) => {
  const mode = String(filter?.mode || 'today');
  if (mode === 'custom') {
    if (!filter?.from || !filter?.to) {
      return t('common.audit.tracking.customRangePending', { defaultValue: 'Choose a start and end date' });
    }
    return `${formatDateOnlyLabel(filter.from, lang)} - ${formatDateOnlyLabel(filter.to, lang)}`;
  }
  if (mode === 'last7') {
    return t('common.range.last7Days', { defaultValue: 'Last 7 days' });
  }
  return t('common.range.today', { defaultValue: 'Today' });
};

const metricAccent = (key) => ({
  total: 'var(--nb-color-brand)',
  logins: '#15803d',
  logouts: '#475569',
  passwordChanges: '#7c3aed',
  pageViews: '#0891b2',
  add: 'var(--nb-color-brand)',
  edit: '#8b5e3c',
  delete: '#c2410c',
  download: '#475569',
  activate: '#15803d',
  deactivate: '#b45309',
  resetPassword: '#7c3aed',
}[key] || 'var(--nb-color-brand)');

const metricIcon = (key) => ({
  total: Activity,
  logins: LogIn,
  logouts: LogOut,
  passwordChanges: KeyRound,
  pageViews: Eye,
}[key] || Activity);

const metricLabel = (key, t) => {
  switch (key) {
    case 'total':
      return t('common.total', { defaultValue: 'Total' });
    case 'logins':
      return t('common.audit.tracking.kpis.logins', { defaultValue: 'Logins' });
    case 'logouts':
      return t('common.audit.tracking.kpis.logouts', { defaultValue: 'Logouts' });
    case 'passwordChanges':
      return t('common.audit.tracking.kpis.passwordChanges', { defaultValue: 'Password changes' });
    case 'pageViews':
      return t('common.audit.tracking.kpis.pageViews', { defaultValue: 'Page views' });
    default:
      return t(`common.audit.tracking.operations.${key}`, { defaultValue: key });
  }
};

const SUMMARY_ACTION_BY_METRIC = Object.freeze({
  logins: 'auth.login',
  logouts: 'auth.logout',
  passwordchanges: 'auth.changepassword',
  pageviews: 'page.view',
});

const normalizeAuditValue = (value) => String(value || '').trim().toLowerCase();

const extractAuditPath = (description) => {
  const text = String(description || '');
  return text.startsWith('path=') ? text.slice(5) : text;
};

const containsRealtimeHint = (value, hints) => {
  const text = normalizeAuditValue(value);
  return Array.isArray(hints) && hints.some((hint) => text.includes(normalizeAuditValue(hint)));
};

const getRealtimeHttpMethod = (description) => {
  const match = String(description || '').trim().match(/^(GET|POST|PUT|PATCH|DELETE)\b/i);
  return match?.[1] ? String(match[1]).toUpperCase() : '';
};

const REALTIME_ADD_HINTS = Object.freeze(['create', 'created', '.add', 'add', 'bulk', 'import', 'input', 'record', 'payment', 'income', 'generate', 'charge', 'donation', 'invoice']);
const REALTIME_EDIT_HINTS = Object.freeze(['update', 'updated', '.edit', 'edit', 'save', 'saved', 'adjust', 'reschedule', 'change', 'changed', 'set', 'apply', 'assign', 'toggle', 'promote', 'graduate', 'transfer', 'permissionsupdated', 'rolechanged', 'amount']);
const REALTIME_DELETE_HINTS = Object.freeze(['delete', 'deleted', 'remove', 'cancel', 'revert', 'void']);

const inferRealtimeOperation = (action, description = '') => {
  const lower = normalizeAuditValue(action);
  const desc = normalizeAuditValue(description);

  if (!lower || lower === 'unknown') return 'other';
  if (lower === 'auth.changepassword') return 'other';
  if (lower.includes('download')) return 'download';
  if (lower.includes('print')) return 'download';
  if (lower.includes('reactivate')) return 'activate';
  if (lower.includes('deactivate')) return 'deactivate';
  if (lower.includes('activate')) return 'activate';
  if (lower.includes('resetpassword') || lower.includes('passwordset')) return 'resetPassword';
  if (lower.includes('assign')) return 'edit';
  const httpMethod = getRealtimeHttpMethod(description);
  if (httpMethod === 'DELETE') return 'delete';
  if ((lower.startsWith('attendance') || lower.startsWith('exam') || lower.startsWith('exams') || lower.startsWith('result') || lower.startsWith('results')) && httpMethod) {
    if (httpMethod === 'POST') return 'add';
    if (httpMethod === 'PUT' || httpMethod === 'PATCH') return 'edit';
  }
  if (lower.startsWith('attendance') && !lower.endsWith('.view') && !lower.endsWith('.list')) {
    if (containsRealtimeHint(lower, ['create', 'add', 'input', 'import', 'record', 'mark', 'take'])) return 'add';
    return 'edit';
  }
  if (lower.startsWith('exam') || lower.startsWith('exams') || lower.startsWith('result') || lower.startsWith('results')) {
    if (containsRealtimeHint(lower, ['update', 'updated', 'edit', 'save', 'adjust', 'publish'])) return 'edit';
    if (containsRealtimeHint(lower, ['input', 'import', 'score', 'record', 'bulk', 'add', 'create', 'generate'])) return 'add';
  }
  if (containsRealtimeHint(lower, REALTIME_DELETE_HINTS)) return 'delete';
  if (containsRealtimeHint(lower, REALTIME_EDIT_HINTS) || containsRealtimeHint(desc, ['inactive', 'active', 'discount'])) return 'edit';
  if (containsRealtimeHint(lower, REALTIME_ADD_HINTS)) return 'add';
  if (lower.includes('togglestatus') || lower.includes('statuschanged')) {
    if (desc.includes('inactive')) return 'deactivate';
    if (desc.includes('reactivate')) return 'activate';
    if (desc.includes('active')) return 'activate';
  }
  return 'other';
};

const matchesRealtimeMetric = (log, metric) => {
  const key = normalizeAuditValue(metric);
  if (!key || key === 'total') return true;

  const exactAction = SUMMARY_ACTION_BY_METRIC[key];
  if (exactAction) {
    return normalizeAuditValue(log?.action) === exactAction;
  }

  return normalizeAuditValue(inferRealtimeOperation(log?.action, log?.description)) === key;
};

const matchesRealtimeFilter = (log, filterParams) => {
  const timestamp = log?.timestamp ? new Date(log.timestamp) : null;
  if (!timestamp || Number.isNaN(timestamp.getTime())) return false;

  if (filterParams?.from) {
    const from = new Date(filterParams.from);
    if (!Number.isNaN(from.getTime()) && timestamp < from) return false;
  }

  if (filterParams?.to) {
    const to = new Date(filterParams.to);
    if (!Number.isNaN(to.getTime()) && timestamp > to) return false;
  }

  const rangeKey = String(filterParams?.range || '').toLowerCase();
  if (!rangeKey) return true;
  if (rangeKey === 'all') return true;

  const now = new Date();
  if (rangeKey === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return timestamp >= start && timestamp <= now;
  }

  const days = rangeKey === 'week' ? 7 : 30;
  const start = new Date(now.getTime() - (days - 1) * 86400000);
  start.setHours(0, 0, 0, 0);
  return timestamp >= start && timestamp <= now;
};

const toRealtimeRow = (log) => ({
  action: log?.action || '',
  description: log?.description || '',
  timestamp: log?.timestamp || new Date().toISOString(),
  actor: {
    id: log?.actor?.id || null,
    role: log?.actor?.role || null,
    fullName: log?.actor?.fullName || null,
    username: log?.actor?.username || null,
  },
  ip: log?.ip || '',
  device: log?.device || '',
});

const sortOperationRows = (rows) => {
  return [...rows].sort((left, right) => {
    const countDelta = Number(right?.count || 0) - Number(left?.count || 0);
    if (countDelta !== 0) return countDelta;
    return ACTION_CARD_KEYS.indexOf(left?.key) - ACTION_CARD_KEYS.indexOf(right?.key);
  });
};

const buildTimelineBucketLabel = (timestamp, filterParams) => {
  const parsed = timestamp ? new Date(timestamp) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return null;

  if (String(filterParams?.range || '').toLowerCase() === 'today') {
    return `${String(parsed.getHours()).padStart(2, '0')}:00`;
  }

  if (String(filterParams?.range || '').toLowerCase() === 'all') {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
  }

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
};

const incrementPaginatedMeta = (meta, limit) => {
  if (!meta) return meta;
  const total = Number(meta.total || 0) + 1;
  const resolvedLimit = Number(meta.limit || limit || 20);
  return {
    ...meta,
    total,
    totalPages: Math.max(1, Math.ceil(total / Math.max(1, resolvedLimit))),
  };
};

const RangeButton = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={
      `inline-flex items-center rounded-lg border px-3 py-2 text-sm font-medium transition shadow-sm `
      + (active
        ? 'bg-(--nb-color-brand) text-white border-(--nb-color-brand)'
        : 'bg-(--nb-color-bg-card) text-(--nb-color-text) border-(--nb-color-border) hover:bg-(--nb-color-brand-50) hover:text-(--nb-color-brand-ui)')
    }
  >
    {children}
  </button>
);

const ActionCard = ({ label, value, accent, icon: Icon, onOpen, disabled, detailsTitle, helperText }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-(--nb-color-brand-50) border border-(--nb-color-border) flex items-center justify-center text-(--nb-color-brand-ui)">
          {Icon ? <Icon size={18} /> : <Activity size={18} />}
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.12em] text-(--nb-color-muted)">{label}</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums text-(--nb-color-fg)">{Number(value || 0).toLocaleString()}</div>
        </div>
      </div>
      <ActionButton
        variant="neutral"
        title={detailsTitle}
        icon={<Eye size={14} />}
        onClick={onOpen}
        disabled={disabled}
        className="px-2 py-2"
      />
    </div>

    <div className="mt-4 min-h-12 text-xs leading-5 text-(--nb-color-muted)">
      {helperText}
    </div>

    <div className="mt-4 h-2 w-20 rounded-full" style={{ background: accent }} />
  </Card>
);

function MetricMenu({ value, options, onChange, title }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const activeLabel = options.find((item) => item.value === value)?.label || title;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg-card) px-3 py-2 text-sm text-(--nb-color-text) hover:bg-(--nb-color-bg)"
        title={title}
      >
        <span className="max-w-56 truncate">{activeLabel}</span>
        <MoreVertical size={16} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) shadow-lg">
          <div className="px-3 py-2 text-xs uppercase tracking-[0.12em] text-(--nb-color-muted)">{title}</div>
          <div className="max-h-80 overflow-auto py-1">
            {options.map((item) => {
              const active = item.value === value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className={
                    `flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm `
                    + (active
                      ? 'bg-(--nb-color-brand-50) text-(--nb-color-brand-ui)'
                      : 'text-(--nb-color-text) hover:bg-(--nb-color-bg)')
                  }
                >
                  <span>{item.label}</span>
                  {active ? <span className="text-xs">{item.shortcut || 'Active'}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function TrackingAuditPage() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailPage, setDetailPage] = useState(1);
  const [detailLimit, setDetailLimit] = useState(10);
  const [globalFilter, setGlobalFilter] = useState(() => createInitialGlobalFilter());
  const [activeTab, setActiveTab] = useState('overview');
  const [chartMetric, setChartMetric] = useState('total');
  const detailCacheRef = useRef({ scopeKey: '', rows: [], meta: null });
  const reconnectTimerRef = useRef(null);
  const reconnectDelayRef = useRef(1000);

  const filterParams = useMemo(() => buildAuditQueryFromFilter(globalFilter), [globalFilter]);
  const rangeSummary = useMemo(() => formatRangeSummary(globalFilter, lang, t), [globalFilter, lang, t]);
  const globalRangeIncomplete = globalFilter.mode === 'custom' && !filterParams.isReady;

  const globalRangeLabels = useMemo(() => ({
    today: t('common.range.today', { defaultValue: 'Today' }),
    last7: t('common.range.last7Days', { defaultValue: 'Last 7 days' }),
    custom: t('common.range.custom', { defaultValue: 'Custom' }),
  }), [t]);

  const pageTabOptions = useMemo(() => ([
    { value: 'overview', label: t('common.audit.tracking.tabs.overview', { defaultValue: 'Overview' }) },
    { value: 'charts', label: t('common.audit.tracking.tabs.charts', { defaultValue: 'Charts' }) },
    { value: 'events', label: t('common.audit.tracking.tabs.events', { defaultValue: 'Event feed' }) },
  ]), [t]);

  const metricMenuOptions = useMemo(() => {
    return ALL_CARD_KEYS.map((key) => ({
      value: key,
      label: metricLabel(key, t),
    }));
  }, [t]);

  useEffect(() => {
    setPage(1);
    setSelectedDetail(null);
    setDetailPage(1);
  }, [filterParams.range, filterParams.from, filterParams.to]);

  const summaryQuery = useQuery({
    queryKey: auditKeys.summary(filterParams),
    queryFn: () => getAuditSummary(filterParams),
    enabled: filterParams.isReady,
  });

  const timelineQuery = useQuery({
    queryKey: auditKeys.timeline({ ...filterParams, metric: chartMetric }),
    queryFn: () => getAuditTimeline({ ...filterParams, metric: chartMetric }),
    enabled: filterParams.isReady,
  });

  const topQuery = useQuery({
    queryKey: auditKeys.top(filterParams),
    queryFn: () => getAuditTop(filterParams),
    enabled: filterParams.isReady,
  });

  const analyticsQuery = useQuery({
    queryKey: auditKeys.analytics(filterParams),
    queryFn: () => getAuditAnalytics(filterParams),
    enabled: filterParams.isReady,
  });

  const detailsQuery = useQuery({
    queryKey: auditKeys.analyticsDetails({
      range: selectedDetail?.range,
      from: selectedDetail?.from,
      to: selectedDetail?.to,
      metric: selectedDetail?.metric,
      page: detailPage,
      limit: detailLimit,
    }),
    queryFn: () => getAuditAnalyticsDetails({
      range: selectedDetail?.range,
      from: selectedDetail?.from,
      to: selectedDetail?.to,
      metric: selectedDetail?.metric,
      page: detailPage,
      limit: detailLimit,
    }),
    enabled: Boolean(selectedDetail),
  });

  const eventsQuery = useQuery({
    queryKey: auditKeys.events({ ...filterParams, page, limit }),
    queryFn: () => getAuditEvents({ ...filterParams, page, limit }),
    keepPreviousData: true,
    enabled: filterParams.isReady,
    placeholderData: (previousData) => previousData,
  });

  const detailScopeKey = selectedDetail
    ? `${selectedDetail.metric}|${selectedDetail.range || ''}|${selectedDetail.from || ''}|${selectedDetail.to || ''}`
    : '';

  useEffect(() => {
    if (!detailScopeKey) {
      detailCacheRef.current = { scopeKey: '', rows: [], meta: null };
      return;
    }

    if (detailCacheRef.current.scopeKey !== detailScopeKey) {
      detailCacheRef.current = { scopeKey: detailScopeKey, rows: [], meta: null };
    }
  }, [detailScopeKey]);

  useEffect(() => {
    if (!detailScopeKey) return;
    if (!detailsQuery.data) return;
    detailCacheRef.current = {
      scopeKey: detailScopeKey,
      rows: Array.isArray(detailsQuery.data?.data) ? detailsQuery.data.data : [],
      meta: detailsQuery.data?.meta || null,
    };
  }, [detailScopeKey, detailsQuery.data]);

  const summary = summaryQuery.data?.data?.totals || null;
  const timeline = Array.isArray(timelineQuery.data?.data?.points) ? timelineQuery.data.data.points : [];
  const topActors = Array.isArray(topQuery.data?.data?.topActors) ? topQuery.data.data.topActors : [];
  const topPages = Array.isArray(topQuery.data?.data?.topPages) ? topQuery.data.data.topPages : [];
  const logs = Array.isArray(eventsQuery.data?.data) ? eventsQuery.data.data : [];
  const meta = eventsQuery.data?.meta || null;
  const analytics = analyticsQuery.data?.data || null;
  const operations = Array.isArray(analytics?.operations) ? analytics.operations : [];

  const summaryCards = useMemo(() => ([
    {
      key: 'total',
      label: metricLabel('total', t),
      value: Number(summary?.total || 0),
      helperText: t('common.audit.tracking.totalRowsHint', { defaultValue: 'Open all rows that match the selected date range.' }),
    },
    {
      key: 'logins',
      label: metricLabel('logins', t),
      value: Number(summary?.logins || 0),
      helperText: t('common.audit.tracking.loginRowsHint', { defaultValue: 'Open login rows in the selected date range.' }),
    },
    {
      key: 'logouts',
      label: metricLabel('logouts', t),
      value: Number(summary?.logouts || 0),
      helperText: t('common.audit.tracking.logoutRowsHint', { defaultValue: 'Open logout rows in the selected date range.' }),
    },
    {
      key: 'passwordChanges',
      label: metricLabel('passwordChanges', t),
      value: Number(summary?.passwordChanges || 0),
      helperText: t('common.audit.tracking.passwordRowsHint', { defaultValue: 'Open password change rows in the selected date range.' }),
    },
    {
      key: 'pageViews',
      label: metricLabel('pageViews', t),
      value: Number(summary?.pageViews || 0),
      helperText: t('common.audit.tracking.pageViewRowsHint', { defaultValue: 'Open page view rows in the selected date range.' }),
    },
  ]), [summary, t]);

  const actionCards = useMemo(() => {
    const operationMap = new Map(operations.map((item) => [item.key, item]));
    return ACTION_CARD_KEYS.map((key) => {
      const current = operationMap.get(key);
      const latestActor = current?.latest?.actor?.fullName || current?.latest?.actor?.username;
      const latestTime = current?.latest?.timestamp ? formatDateTimeLabel(current.latest.timestamp, lang) : '';
      const helperText = current?.count
        ? (latestActor
            ? t('common.audit.tracking.latestActivity', {
                defaultValue: 'Latest: {{actor}} at {{time}}',
                actor: latestActor,
                time: latestTime,
              })
            : t('common.audit.tracking.rowsInRange', {
                defaultValue: '{{count}} rows in the selected range',
                count: Number(current.count || 0).toLocaleString(),
              }))
        : t('common.audit.tracking.noActivityInRange', { defaultValue: 'No matching rows in the selected range.' });
      return {
        key,
        label: metricLabel(key, t),
        value: Number(current?.count || 0),
        helperText,
      };
    });
  }, [operations, lang, t]);

  const allCards = useMemo(() => [...summaryCards, ...actionCards], [summaryCards, actionCards]);

  const detailRows = Array.isArray(detailsQuery.data?.data)
    ? detailsQuery.data.data
    : (detailCacheRef.current.scopeKey === detailScopeKey ? detailCacheRef.current.rows : []);
  const detailMeta = detailsQuery.data?.meta
    || (detailCacheRef.current.scopeKey === detailScopeKey ? detailCacheRef.current.meta : null);

  const closeDetailModal = () => {
    setSelectedDetail(null);
    detailCacheRef.current = { scopeKey: '', rows: [], meta: null };
  };
  const selectedDetailLabel = selectedDetail?.metric ? metricLabel(selectedDetail.metric, t) : '';

  const isBusy = summaryQuery.isFetching || timelineQuery.isFetching || topQuery.isFetching || analyticsQuery.isFetching || eventsQuery.isFetching;

  const refetchAll = () => {
    summaryQuery.refetch();
    topQuery.refetch();
    timelineQuery.refetch();
    analyticsQuery.refetch();
    eventsQuery.refetch();
  };

  const applyRealtimeAuditUpdate = (payload) => {
    const log = payload?.log;
    if (!log || !matchesRealtimeFilter(log, filterParams)) return;

    const row = toRealtimeRow(log);
    const operationKey = inferRealtimeOperation(log.action, log.description);
    const summaryAction = normalizeAuditValue(log.action);
    const actorName = row.actor.fullName || row.actor.username || t('common.unknown', { defaultValue: 'Unknown' });

    queryClient.setQueryData(auditKeys.summary(filterParams), (prev) => {
      if (!prev?.data?.totals) return prev;
      const totals = {
        ...prev.data.totals,
        total: Number(prev.data.totals.total || 0) + 1,
      };
      if (summaryAction === 'auth.login') totals.logins = Number(totals.logins || 0) + 1;
      if (summaryAction === 'auth.logout') totals.logouts = Number(totals.logouts || 0) + 1;
      if (summaryAction === 'auth.changepassword') totals.passwordChanges = Number(totals.passwordChanges || 0) + 1;
      if (summaryAction === 'page.view') totals.pageViews = Number(totals.pageViews || 0) + 1;
      return {
        ...prev,
        data: {
          ...prev.data,
          totals,
        },
      };
    });

    queryClient.setQueryData(auditKeys.analytics(filterParams), (prev) => {
      if (!prev?.data) return prev;
      const operations = Array.isArray(prev.data.operations) ? [...prev.data.operations] : [];
      const index = operations.findIndex((item) => item?.key === operationKey);
      const latest = row;

      if (index >= 0) {
        operations[index] = {
          ...operations[index],
          count: Number(operations[index]?.count || 0) + 1,
          latest,
        };
      } else if (ACTION_CARD_KEYS.includes(operationKey)) {
        operations.push({
          key: operationKey,
          count: 1,
          latest,
        });
      }

      return {
        ...prev,
        data: {
          ...prev.data,
          totalTracked: ACTION_CARD_KEYS.includes(operationKey)
            ? Number(prev.data.totalTracked || 0) + 1
            : Number(prev.data.totalTracked || 0),
          operations: sortOperationRows(operations),
        },
      };
    });

    queryClient.setQueryData(auditKeys.events({ ...filterParams, page, limit }), (prev) => {
      if (!prev) return prev;
      const nextMeta = incrementPaginatedMeta(prev.meta, limit);
      if (Number(page || 1) !== 1) {
        return {
          ...prev,
          meta: nextMeta,
        };
      }

      const currentRows = Array.isArray(prev.data) ? prev.data : [];
      return {
        ...prev,
        data: [row, ...currentRows].slice(0, Number(limit || 20)),
        meta: nextMeta,
      };
    });

    queryClient.setQueryData(auditKeys.top(filterParams), (prev) => {
      if (!prev?.data) return prev;

      const topActors = Array.isArray(prev.data.topActors) ? [...prev.data.topActors] : [];
      const actorIndex = topActors.findIndex((item) => String(item?.user || '') === String(row.actor.id || ''));
      if (actorIndex >= 0) {
        topActors[actorIndex] = {
          ...topActors[actorIndex],
          count: Number(topActors[actorIndex]?.count || 0) + 1,
        };
      } else if (row.actor.id) {
        topActors.push({
          user: row.actor.id,
          count: 1,
          role: row.actor.role,
          fullName: row.actor.fullName,
          username: row.actor.username,
        });
      }

      const sortedActors = topActors
        .sort((left, right) => Number(right?.count || 0) - Number(left?.count || 0))
        .slice(0, 5);

      let topPages = Array.isArray(prev.data.topPages) ? [...prev.data.topPages] : [];
      if (summaryAction === 'page.view') {
        const path = extractAuditPath(row.description);
        if (path) {
          const pageIndex = topPages.findIndex((item) => item?.path === path);
          if (pageIndex >= 0) {
            topPages[pageIndex] = {
              ...topPages[pageIndex],
              count: Number(topPages[pageIndex]?.count || 0) + 1,
            };
          } else {
            topPages.push({ path, count: 1 });
          }
          topPages = topPages
            .sort((left, right) => Number(right?.count || 0) - Number(left?.count || 0))
            .slice(0, 5);
        }
      }

      return {
        ...prev,
        data: {
          ...prev.data,
          topActors: sortedActors,
          topPages,
        },
      };
    });

    queryClient.setQueryData(auditKeys.timeline({ ...filterParams, metric: chartMetric }), (prev) => {
      if (!prev?.data || !matchesRealtimeMetric(log, chartMetric)) return prev;
      const label = buildTimelineBucketLabel(row.timestamp, filterParams);
      if (!label) return prev;

      const points = Array.isArray(prev.data.points) ? [...prev.data.points] : [];
      const pointIndex = points.findIndex((item) => item?.label === label);
      if (pointIndex >= 0) {
        points[pointIndex] = {
          ...points[pointIndex],
          value: Number(points[pointIndex]?.value || 0) + 1,
        };
      } else {
        points.push({ label, value: 1 });
      }

      return {
        ...prev,
        data: {
          ...prev.data,
          points,
        },
      };
    });

    if (selectedDetail && matchesRealtimeMetric(log, selectedDetail.metric)) {
      queryClient.setQueryData(auditKeys.analyticsDetails({
        range: selectedDetail.range,
        from: selectedDetail.from,
        to: selectedDetail.to,
        metric: selectedDetail.metric,
        page: detailPage,
        limit: detailLimit,
      }), (prev) => {
        if (!prev) return prev;
        const nextMeta = incrementPaginatedMeta(prev.meta, detailLimit);
        if (Number(detailPage || 1) !== 1) {
          return {
            ...prev,
            meta: nextMeta,
          };
        }

        const rows = Array.isArray(prev.data) ? prev.data : [];
        return {
          ...prev,
          data: [row, ...rows].slice(0, Number(detailLimit || 10)),
          meta: nextMeta,
        };
      });

      if (detailCacheRef.current.scopeKey === detailScopeKey) {
        const nextRows = Number(detailPage || 1) === 1
          ? [row, ...(Array.isArray(detailCacheRef.current.rows) ? detailCacheRef.current.rows : [])].slice(0, Number(detailLimit || 10))
          : detailCacheRef.current.rows;
        detailCacheRef.current = {
          scopeKey: detailScopeKey,
          rows: nextRows,
          meta: incrementPaginatedMeta(detailCacheRef.current.meta, detailLimit),
        };
      }
    }
  };

  const setGlobalMode = (mode) => {
    setGlobalFilter((prev) => ({
      ...prev,
      mode,
    }));
  };

  const setGlobalDate = (field, value) => {
    setGlobalFilter((prev) => ({
      ...prev,
      mode: 'custom',
      [field]: value,
    }));
  };

  const openDetail = (metric) => {
    setDetailPage(1);
    setDetailLimit(10);
    detailCacheRef.current = { scopeKey: '', rows: [], meta: null };
    setSelectedDetail({
      metric,
      range: filterParams.range,
      from: filterParams.from,
      to: filterParams.to,
    });
  };

  const invalidationTimerRef = useRef(null);
  const scheduleInvalidate = () => {
    if (invalidationTimerRef.current) return;
    invalidationTimerRef.current = setTimeout(() => {
      invalidationTimerRef.current = null;
      queryClient.invalidateQueries({ queryKey: auditKeys.summary(filterParams) });
      queryClient.invalidateQueries({ queryKey: auditKeys.analytics(filterParams) });
      queryClient.invalidateQueries({ queryKey: auditKeys.top(filterParams) });
      queryClient.invalidateQueries({ queryKey: auditKeys.timeline({ ...filterParams, metric: chartMetric }) });
      queryClient.invalidateQueries({ queryKey: auditKeys.events({ ...filterParams, page, limit }) });
      if (selectedDetail) {
        queryClient.invalidateQueries({
          queryKey: auditKeys.analyticsDetails({
            range: selectedDetail.range,
            from: selectedDetail.from,
            to: selectedDetail.to,
            metric: selectedDetail.metric,
            page: detailPage,
            limit: detailLimit,
          }),
        });
      }
    }, 500);
  };

  useEffect(() => {
    const url = apiUrl('/audit/stream');
    let es = null;
    let disposed = false;

    const clearReconnectTimer = () => {
      if (!reconnectTimerRef.current) return;
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimerRef.current) return;
      const delay = reconnectDelayRef.current;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        open();
      }, delay);
      reconnectDelayRef.current = Math.min(delay * 2, 10_000);
    };

    const open = () => {
      if (disposed) return;
      clearReconnectTimer();
      try {
        es = new EventSource(url, { withCredentials: true });
      } catch {
        scheduleReconnect();
        return;
      }

      es.onopen = () => {
        reconnectDelayRef.current = 1000;
      };

      es.onmessage = (ev) => {
        try {
          const payload = JSON.parse(String(ev?.data || '{}'));
          const type = String(payload?.type || '');
          if (type === 'audit:created') {
            applyRealtimeAuditUpdate(payload);
            scheduleInvalidate();
            return;
          }

          if (type === 'audit:updated') {
            scheduleInvalidate();
            return;
          }

          if (type === 'users:changed' || type === 'teachers:changed' || type === 'students:changed' || type === 'security:authLocksChanged') {
            scheduleInvalidate();
          }
        } catch {
          // ignore
        }
      };

      es.onerror = () => {
        try { es?.close(); } catch { /* ignore */ }
        scheduleReconnect();
      };
    };

    open();

    return () => {
      disposed = true;
      clearReconnectTimer();
      if (invalidationTimerRef.current) {
        clearTimeout(invalidationTimerRef.current);
        invalidationTimerRef.current = null;
      }
      try { es?.close(); } catch { /* ignore */ }
    };
  }, [queryClient, filterParams, page, limit, selectedDetail, chartMetric, detailPage, detailLimit, detailScopeKey, t]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-14 w-14 rounded-2xl bg-(--nb-color-brand-50) border border-(--nb-color-border) flex items-center justify-center text-(--nb-color-brand-ui)">
              <Activity size={24} />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-semibold text-(--nb-color-fg)">{t('common.audit.tracking.title', { defaultValue: 'Tracking & Audit' })}</div>
              <div className="mt-2 max-w-3xl text-sm leading-6 text-(--nb-color-muted)">{t('common.audit.tracking.subtitle', { defaultValue: 'Audit cards, charts, and recent rows now use one shared date filter.' })}</div>
            </div>
          </div>

          <ActionButton
            variant="neutral"
            title={t('common.refresh', { defaultValue: 'Refresh' })}
            icon={<RefreshCcw size={16} />}
            onClick={refetchAll}
            disabled={isBusy || globalRangeIncomplete}
          />
        </div>
      </Card>

      {(summaryQuery.isError || timelineQuery.isError || topQuery.isError || analyticsQuery.isError || eventsQuery.isError) ? (
        <Alert variant="neutral" title={t('common.error', { defaultValue: 'Error' })}>
          {summaryQuery.error?.message
            || timelineQuery.error?.message
            || topQuery.error?.message
            || analyticsQuery.error?.message
            || eventsQuery.error?.message
            || t('common.retry', { defaultValue: 'Please try again.' })}
        </Alert>
      ) : null}

      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <Tabs value={activeTab} options={pageTabOptions} onChange={setActiveTab} tone="blue" />

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          {GLOBAL_RANGE_KEYS.map((key) => (
            <RangeButton key={key} active={globalFilter.mode === key} onClick={() => setGlobalMode(key)}>
              {globalRangeLabels[key]}
            </RangeButton>
          ))}

          {globalFilter.mode === 'custom' ? (
            <>
              <input
                type="date"
                value={globalFilter.from}
                onChange={(e) => setGlobalDate('from', e.target.value)}
                className="rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2 text-sm text-(--nb-color-fg) outline-none"
                aria-label={t('common.from', { defaultValue: 'From' })}
              />
              <input
                type="date"
                value={globalFilter.to}
                onChange={(e) => setGlobalDate('to', e.target.value)}
                className="rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2 text-sm text-(--nb-color-fg) outline-none"
                aria-label={t('common.to', { defaultValue: 'To' })}
              />
            </>
          ) : null}
        </div>
      </div>

      {globalRangeIncomplete ? (
        <Card className="p-5">
          <div className="text-sm font-semibold text-(--nb-color-fg)">{t('common.audit.tracking.customRangeTitle', { defaultValue: 'Custom range is incomplete' })}</div>
          <div className="mt-2 text-sm text-(--nb-color-muted)">{t('common.audit.tracking.customRangeHint', { defaultValue: 'Choose both dates to load cards, charts, and the event feed.' })}</div>
        </Card>
      ) : null}

      {!globalRangeIncomplete && activeTab === 'overview' ? (
        <Card className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-(--nb-color-fg)">{t('common.audit.tracking.actionsTitle', { defaultValue: 'Audit cards' })}</div>
              <div className="mt-1 text-sm text-(--nb-color-muted)">{t('common.audit.tracking.actionsSubtitleUnified', { defaultValue: 'All cards use the same date filter. Use the eye icon to open the matching rows table.' })}</div>
            </div>
            {null}
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(summaryQuery.isLoading || analyticsQuery.isLoading)
              ? Array.from({ length: 9 }).map((_, index) => (
                  <Card key={index} className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div className="min-w-0 flex-1 space-y-3">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-8 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-9 w-9 rounded-lg" />
                    </div>
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2 w-20 rounded-full" />
                  </Card>
                ))
              : allCards.map((item) => (
                  <ActionCard
                    key={item.key}
                    label={item.label}
                    value={item.value}
                    accent={metricAccent(item.key)}
                    icon={metricIcon(item.key)}
                    onOpen={() => openDetail(item.key)}
                    disabled={item.value <= 0}
                    detailsTitle={t('common.audit.tracking.viewRows', { defaultValue: 'View rows' })}
                    helperText={item.helperText}
                  />
                ))}
          </div>
        </Card>
      ) : null}

      {!globalRangeIncomplete && activeTab === 'charts' ? (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-(--nb-color-fg)">{t('common.audit.tracking.timelineTitle', { defaultValue: 'Activity timeline' })}</div>
                <div className="mt-1 text-sm text-(--nb-color-muted)">{t('common.audit.tracking.timelineSubtitleMenu', { defaultValue: 'Pick any audit card from the menu to see its timeline.' })}</div>
              </div>
              <div className="flex items-center gap-3">
                <MetricMenu
                  value={chartMetric}
                  options={metricMenuOptions}
                  onChange={setChartMetric}
                  title={t('common.audit.tracking.selectCard', { defaultValue: 'Select card' })}
                />
                {null}
              </div>
            </div>

            <div className="mt-4 w-full">
              {timelineQuery.isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-72 w-full rounded-2xl" />
                  <Skeleton className="h-3 w-56" />
                </div>
              ) : timeline.length ? (
                <ResponsiveContainer width="100%" height={300} minWidth={0}>
                  <LineChart data={timeline} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="var(--nb-color-border)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--nb-color-muted)', fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: 'var(--nb-color-muted)', fontSize: 11 }} width={40} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--nb-color-bg-card)',
                        border: '1px solid var(--nb-color-border)',
                        color: 'var(--nb-color-fg)',
                        borderRadius: 10,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: 'var(--nb-color-muted)' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={metricAccent(chartMetric)}
                      strokeWidth={2}
                      dot={false}
                      name={metricLabel(chartMetric, t)}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="rounded-xl border border-dashed border-(--nb-color-border) px-4 py-10 text-center text-sm text-(--nb-color-muted)">{t('common.noData', { defaultValue: 'No data' })}</div>
              )}
            </div>

            <div className="mt-3 text-xs text-(--nb-color-muted)">{t('common.audit.tracking.timelineHint', { defaultValue: 'Showing {{metric}} for {{range}}.', metric: metricLabel(chartMetric, t), range: rangeSummary })}</div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-(--nb-color-fg)">{t('common.audit.tracking.topUsers', { defaultValue: 'Top users' })}</div>
                {null}
              </div>

              <div className="mt-3 space-y-2">
                {topActors.length ? topActors.map((row) => (
                  <div key={String(row.user)} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate text-(--nb-color-fg)">{row.fullName || row.username || t('common.unknown', { defaultValue: 'Unknown' })}</div>
                      <div className="text-xs text-(--nb-color-muted)">{row.role || t('common.unknown', { defaultValue: 'Unknown' })}</div>
                    </div>
                    <div className="shrink-0 tabular-nums text-(--nb-color-fg)">{Number(row.count || 0).toLocaleString()}</div>
                  </div>
                )) : (
                  <div className="text-sm text-(--nb-color-muted)">{t('common.noData', { defaultValue: 'No data' })}</div>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-(--nb-color-fg)">{t('common.audit.tracking.topPages', { defaultValue: 'Top pages' })}</div>
                {null}
              </div>

              <div className="mt-3 space-y-2">
                {topPages.length ? topPages.map((row) => (
                  <div key={String(row.path)} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0 truncate text-(--nb-color-fg)">{row.path}</div>
                    <div className="shrink-0 tabular-nums text-(--nb-color-fg)">{Number(row.count || 0).toLocaleString()}</div>
                  </div>
                )) : (
                  <div className="text-sm text-(--nb-color-muted)">{t('common.noData', { defaultValue: 'No data' })}</div>
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {!globalRangeIncomplete && activeTab === 'events' ? (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-(--nb-color-fg)">{t('common.audit.tracking.eventsTitle', { defaultValue: 'Recent events' })}</div>
              <div className="mt-1 text-sm text-(--nb-color-muted)">{t('common.audit.tracking.eventsSubtitle', { defaultValue: 'Raw event feed filtered by the same date range used by the cards and charts.' })}</div>
            </div>
            {null}
          </div>

          <div className="mt-4">
            <SystemAuditTable
              logs={logs}
              isLoading={eventsQuery.isLoading}
              error={eventsQuery.isError ? eventsQuery.error : null}
              meta={meta}
              onPage={(p) => setPage(p)}
              onLimit={(l) => {
                setLimit(l === 'all' ? 100 : l);
                setPage(1);
              }}
              loadingMessage=""
            />
          </div>
        </Card>
      ) : null}

      <Modal
        isOpen={Boolean(selectedDetail)}
        onClose={closeDetailModal}
        title={selectedDetail ? t('common.audit.tracking.modalTitle', { defaultValue: '{{label}} details', label: selectedDetailLabel }) : t('common.audit.tracking.modalFallbackTitle', { defaultValue: 'Audit details' })}
        panelClassName="max-w-7xl"
      >
        <div className="space-y-4">
          <div className="text-sm text-(--nb-color-muted)">
            {selectedDetail ? t('common.audit.tracking.modalSubtitle', { defaultValue: 'Recent rows related to {{label}} within {{range}}.', label: selectedDetailLabel, range: rangeSummary }) : ''}
          </div>

          <SystemAuditTable
            logs={detailRows}
            isLoading={detailsQuery.isLoading && detailRows.length === 0}
            error={detailsQuery.isError ? detailsQuery.error : null}
            meta={detailMeta}
            onPage={setDetailPage}
            onLimit={(nextLimit) => {
              setDetailLimit(nextLimit === 'all' ? 100 : nextLimit);
              setDetailPage(1);
            }}
            storageKey="audit:tracking:detail-modal-columns:v2"
            emptyTitle={t('common.audit.tracking.modalEmptyTitle', { defaultValue: 'No matching activity.' })}
            emptyDescription={t('common.audit.tracking.modalEmptyDescription', { defaultValue: 'No recent rows were found for this card.' })}
            paginationProps={{ className: 'pt-4' }}
            loadingMessage=""
            enableRowDetails
            detailOverlayClassName="z-[70]"
            detailPanelClassName="max-w-6xl"
          />
        </div>
      </Modal>
    </div>
  );
}
