import React, { useMemo, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { useI18n } from '../../../i18n/I18nProvider';

const fmt = (n) => {
    const v = Number(n || 0);
    if (!Number.isFinite(v)) return '0';
    return v.toLocaleString();
};

const fmtOrDash = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return '—';
    return fmt(v);
};

const normalizeRole = (role) => {
    const r = String(role || '').toLowerCase();
    if (r === 'student' || r === 'students') return 'students';
    if (r === 'teacher' || r === 'teachers') return 'teachers';
    if (r === 'staff') return 'staff';
    if (r === 'admin') return 'admin';
    if (r === 'all') return 'all';
    if (!r || r === 'unknown' || r === 'null') return 'unknown';
    return r;
};

const StackedBar = ({ label, created, updated, titleCreated, titleUpdated }) => {
    const a = Number(created || 0);
    const b = Number(updated || 0);
    const total = Math.max(1, a + b);

    return (
        <div className="flex items-center gap-3">
            <div className="w-24 text-[11px] text-gray-600 truncate">{label}</div>
            <div className="flex-1">
                <div className="h-3 w-full overflow-hidden rounded bg-gray-100 border border-gray-200">
                    <div className="flex h-full">
                        <div
                            className="bg-rose-500/85"
                            style={{ width: `${(a / total) * 100}%` }}
                            title={titleCreated ? `${titleCreated}: ${a}` : `Created: ${a}`}
                        />
                        <div
                            className="bg-amber-500/85"
                            style={{ width: `${(b / total) * 100}%` }}
                            title={titleUpdated ? `${titleUpdated}: ${b}` : `Updated: ${b}`}
                        />
                    </div>
                </div>
            </div>
            <div className="w-12 text-right text-[11px] text-gray-700 tabular-nums">{fmt(a + b)}</div>
        </div>
    );
};

const MiniLegend = ({ createdLabel, updatedLabel }) => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
        <div className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded bg-rose-500/85" />
            {createdLabel || 'Created'}
        </div>
        <div className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded bg-amber-500/85" />
            {updatedLabel || 'Updated'}
        </div>
    </div>
);

const RangeTabs = ({ value, onChange, items }) => {
    const safe = Array.isArray(items) ? items : [];
    return (
        <div className="inline-flex flex-wrap gap-2 rounded-xl border bg-white p-1 shadow-sm">
            {safe.map((it) => {
                const active = value === it.value;
                return (
                    <button
                        key={it.value}
                        type="button"
                        onClick={() => onChange?.(it.value)}
                        className={
                            `px-3 py-1.5 text-sm font-semibold rounded-lg transition ` +
                            (active
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-gray-700 hover:bg-gray-50')
                        }
                    >
                        {it.label}
                    </button>
                );
            })}
        </div>
    );
};

export default function AnnouncementsMixCard({ buckets, rowsInRange, rowsAllTime, totalInRange, totalAllTime }) {
    const { t } = useI18n();
    const [range, setRange] = useState('week');

    const safeBuckets = buckets && typeof buckets === 'object' ? buckets : null;
    const safeInRange = Array.isArray(rowsInRange) ? rowsInRange : [];
    const safeAllTime = Array.isArray(rowsAllTime) ? rowsAllTime : [];

    const activeBucket = safeBuckets?.[String(range || 'week')];
    const safeRows = Array.isArray(activeBucket?.byRole)
        ? activeBucket.byRole
        : (safeAllTime.length ? safeAllTime : safeInRange);

    const ordered = useMemo(() => {
        return [...safeRows]
            .map((r) => ({
                role: String(r?.role || 'unknown'),
                created: Number(r?.created || 0),
                updated: Number(r?.updated || 0),
            }))
            .sort((a, b) => (b.created + b.updated) - (a.created + a.updated))
            .slice(0, 6);
    }, [safeRows]);

    const totalsShown = useMemo(() => {
        return safeRows.reduce(
            (acc, r) => {
                acc.created += Number(r?.created || 0);
                acc.updated += Number(r?.updated || 0);
                return acc;
            },
            { created: 0, updated: 0 }
        );
    }, [safeRows]);

    const selectedTotal = useMemo(() => {
        if (activeBucket?.totals) {
            return Number(activeBucket.totals.created || 0) + Number(activeBucket.totals.updated || 0);
        }
        return totalsShown.created + totalsShown.updated;
    }, [activeBucket, totalsShown]);

    const todayAndLast7 = useMemo(() => {
        const day = safeBuckets?.day;
        const week = safeBuckets?.week;

        const today = day?.totals
            ? Number(day.totals.created || 0) + Number(day.totals.updated || 0)
            : NaN;
        const last7 = week?.totals
            ? Number(week.totals.created || 0) + Number(week.totals.updated || 0)
            : (safeInRange.reduce((s, r) => s + Number(r?.created || 0) + Number(r?.updated || 0), 0));

        return { today, last7 };
    }, [safeBuckets, safeInRange]);

    const allTimeCreatedTotal = Number(totalAllTime ?? safeAllTime.reduce((s, r) => s + Number(r?.created || 0), 0));

    const roleLabel = (role) => {
        const normalized = normalizeRole(role);
        if (normalized === 'all') return t('dashboard.cards.announcementsMix.roles.all');
        if (normalized === 'students') return t('dashboard.cards.announcementsMix.roles.students');
        if (normalized === 'teachers') return t('dashboard.cards.announcementsMix.roles.teachers');
        if (normalized === 'staff') return t('dashboard.cards.announcementsMix.roles.staff');
        if (normalized === 'admin') return t('dashboard.cards.announcementsMix.roles.admin');
        if (normalized === 'unknown') return t('dashboard.cards.announcementsMix.roles.unknown');
        return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : t('dashboard.cards.announcementsMix.roles.unknown');
    };

    const bucketLabel = (r) => {
        const s = String(r || '').toLowerCase();
        if (s === 'day') return t('common.range.buckets.day');
        if (s === 'week') return t('common.range.buckets.week');
        if (s === 'month') return t('common.range.buckets.month');
        if (s === 'year') return t('common.range.buckets.year');
        return t('common.range.buckets.week');
    };

    const createdLabel = t('dashboard.cards.announcementsMix.legend.created');
    const updatedLabel = t('dashboard.cards.announcementsMix.legend.updated');

    return (
        <div className="rounded-2xl border border-rose-100 bg-white shadow-md hover:shadow-lg transition-shadow overflow-hidden">
            <div className="px-5 py-4 bg-gray-900 text-white border-b border-gray-800 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="text-lg font-semibold">{t('dashboard.cards.announcementsMix.title')}</div>
                    <div className="text-sm text-white/80 mt-1">{t('dashboard.cards.announcementsMix.subtitle')}</div>
                </div>

                <div className="flex items-center gap-3 flex-wrap text-sm text-white/90 tabular-nums">
                    <div>
                        {bucketLabel(range)}: <span className="font-semibold text-white">{fmt(selectedTotal)}</span>
                    </div>
                    <div className="text-white/60">•</div>
                    <div>
                        {t('dashboard.cards.announcementsMix.labels.allCreated')}: <span className="font-semibold text-white">{fmt(allTimeCreatedTotal)}</span>
                    </div>
                </div>
            </div>

            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
                <div className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <Megaphone size={16} />
                    <span className="font-semibold">{t('common.range.title')}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-xs text-gray-600 tabular-nums">
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1">
                            {t('common.range.today')}: <span className="ml-1 font-semibold text-gray-900">{fmtOrDash(todayAndLast7.today)}</span>
                        </span>
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1">
                            {t('common.range.last7')}: <span className="ml-1 font-semibold text-gray-900">{fmtOrDash(todayAndLast7.last7)}</span>
                        </span>
                    </div>

                    <RangeTabs
                        value={range}
                        onChange={setRange}
                        items={[
                            { value: 'day', label: t('common.range.buckets.day') },
                            { value: 'week', label: t('common.range.buckets.week') },
                            { value: 'month', label: t('common.range.buckets.month') },
                            { value: 'year', label: t('common.range.buckets.year') },
                        ]}
                    />
                </div>
            </div>

            <div className="p-5">
                <MiniLegend createdLabel={createdLabel} updatedLabel={updatedLabel} />

                <div className="mt-4 space-y-2">
                    {ordered.length ? (
                        ordered.map((r) => (
                            <StackedBar
                                key={r.role}
                                label={roleLabel(r.role)}
                                created={r.created}
                                updated={r.updated}
                                titleCreated={createdLabel}
                                titleUpdated={updatedLabel}
                            />
                        ))
                    ) : (
                        <div className="text-sm text-gray-500">{t('dashboard.cards.announcementsMix.empty')}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
