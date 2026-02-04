import React, { useMemo, useState } from 'react';
import { Megaphone } from 'lucide-react';

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

const roleLabel = (role) => {
    const r = String(role || '').toLowerCase();
    if (r === 'all') return 'All';
    if (r === 'student' || r === 'students') return 'Students';
    if (r === 'teacher' || r === 'teachers') return 'Teachers';
    if (r === 'staff') return 'Staff';
    if (r === 'admin') return 'Admin';
    if (!r || r === 'unknown' || r === 'null') return 'Unknown';
    return r.charAt(0).toUpperCase() + r.slice(1);
};

const StackedBar = ({ label, created, updated }) => {
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
                            title={`Created: ${a}`}
                        />
                        <div
                            className="bg-amber-500/85"
                            style={{ width: `${(b / total) * 100}%` }}
                            title={`Updated: ${b}`}
                        />
                    </div>
                </div>
            </div>
            <div className="w-12 text-right text-[11px] text-gray-700 tabular-nums">{fmt(a + b)}</div>
        </div>
    );
};

const MiniLegend = () => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
        <div className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded bg-rose-500/85" />
            Created
        </div>
        <div className="inline-flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded bg-amber-500/85" />
            Updated
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

const rangeLabel = (r) => {
    const s = String(r || '').toLowerCase();
    if (s === 'day') return 'Day';
    if (s === 'week') return 'Week';
    if (s === 'month') return 'Month';
    if (s === 'year') return 'Year';
    return 'Week';
};

export default function AnnouncementsMixCard({ buckets, rowsInRange, rowsAllTime, totalInRange, totalAllTime }) {
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

    return (
        <div className="rounded-2xl border border-rose-100 bg-white shadow-md hover:shadow-lg transition-shadow overflow-hidden">
            <div className="px-5 py-4 bg-gray-900 text-white border-b border-gray-800 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="text-lg font-semibold">Announcements Mix</div>
                    <div className="text-sm text-white/80 mt-1">Created vs updated (tabbed)</div>
                </div>

                <div className="flex items-center gap-3 flex-wrap text-sm text-white/90 tabular-nums">
                    <div>
                        {rangeLabel(range)}: <span className="font-semibold text-white">{fmt(selectedTotal)}</span>
                    </div>
                    <div className="text-white/60">•</div>
                    <div>
                        All (created): <span className="font-semibold text-white">{fmt(allTimeCreatedTotal)}</span>
                    </div>
                </div>
            </div>

            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
                <div className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <Megaphone size={16} />
                    <span className="font-semibold">Range</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-xs text-gray-600 tabular-nums">
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1">
                            Today: <span className="ml-1 font-semibold text-gray-900">{fmtOrDash(todayAndLast7.today)}</span>
                        </span>
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1">
                            Last 7: <span className="ml-1 font-semibold text-gray-900">{fmtOrDash(todayAndLast7.last7)}</span>
                        </span>
                    </div>

                    <RangeTabs
                        value={range}
                        onChange={setRange}
                        items={[
                            { value: 'day', label: 'Day' },
                            { value: 'week', label: 'Week' },
                            { value: 'month', label: 'Month' },
                            { value: 'year', label: 'Year' },
                        ]}
                    />
                </div>
            </div>

            <div className="p-5">
                <MiniLegend />

                <div className="mt-4 space-y-2">
                    {ordered.length ? (
                        ordered.map((r) => (
                            <StackedBar
                                key={r.role}
                                label={roleLabel(r.role)}
                                created={r.created}
                                updated={r.updated}
                            />
                        ))
                    ) : (
                        <div className="text-sm text-gray-500">No announcements in this range.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
