import React, { useMemo, useState } from 'react';
import { PenLine } from 'lucide-react';
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

const pad2 = (n) => String(Math.max(0, Number(n) || 0)).padStart(2, '0');

const isoDateOnlyUTC = (dt) => {
    try {
        return new Date(dt).toISOString().slice(0, 10);
    } catch {
        return '';
    }
};

const isoWeekYearWeek = (date) => {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const year = d.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return { year, week };
};

const RangeTabs = ({ value, onChange, items }) => {
    const safe = Array.isArray(items) ? items : [];
    return (
        <div className="inline-flex flex-wrap gap-2 rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) p-1 shadow-sm">
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
                                ? 'bg-(--nb-color-brand) text-white shadow-sm'
                                : 'text-(--nb-color-text) hover:bg-(--nb-color-brand-50)')
                        }
                    >
                        {it.label}
                    </button>
                );
            })}
        </div>
    );
};

const SvgBars = ({ series, height = 180 }) => {
    const width = 640;
    const padL = 42;
    const padR = 12;
    const padY = 18;
    const innerW = width - padL - padR;
    const innerH = height - padY * 2;

    const maxV = Math.max(1, ...(series || []).map((p) => Number(p?.touched || 0)));
    const barCount = Math.max(1, (series || []).length);
    const gap = 8;
    const barW = Math.max(10, Math.floor((innerW - gap * (barCount - 1)) / barCount));

    const getLabel = (p) => {
        if (p?.label) return String(p.label);
        if (p?.key) return String(p.key);
        if (p?.day) return String(p.day).slice(5);
        return '';
    };

    const bars = (series || []).map((p, idx) => {
        const v = Number(p?.touched || 0);
        const h = Math.round((Math.max(0, v) / maxV) * innerH);
        const x = padL + idx * (barW + gap);
        const y = padY + (innerH - h);
        const label = getLabel(p);
        return { x, y, h, v, label };
    });

    const ticks = [0, Math.round(maxV / 2), maxV];

    return (
        <div className="w-full">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                <rect x="0" y="0" width={width} height={height} fill="var(--nb-color-bg-card)" rx="10" />

                {/* Y axis */}
                <line x1={padL} y1={padY} x2={padL} y2={padY + innerH} stroke="var(--nb-color-border)" strokeWidth="1" />

                {ticks.map((t) => {
                    const y = padY + innerH - (t / maxV) * innerH;
                    return (
                        <g key={t}>
                            <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="var(--nb-color-border)" strokeWidth="1" />
                            <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--nb-color-muted)">
                                {t}
                            </text>
                        </g>
                    );
                })}

                {/* X axis */}
                <line x1={padL} y1={padY + innerH} x2={width - padR} y2={padY + innerH} stroke="var(--nb-color-border)" strokeWidth="1" />

                {bars.map((b, i) => (
                    <g key={i}>
                        <rect
                            x={b.x}
                            y={b.y}
                            width={barW}
                            height={b.h}
                            rx="6"
                            fill="var(--nb-color-accent)"
                            opacity="0.85"
                        >
                            <title>{`${b.label}: ${b.v}`}</title>
                        </rect>
                    </g>
                ))}
            </svg>

            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-(--nb-color-muted)">
                {bars.map((b, i) => (
                    <div key={i} className="flex-1 text-center tabular-nums truncate">
                        {b.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

const TinyStat = ({ label, value, tone = 'gray' }) => {
    const tones = {
        gray: 'bg-(--nb-color-bg) text-(--nb-color-text) border-(--nb-color-border)',
        emerald: 'bg-(--nb-color-accent-100) text-(--nb-color-brand) border-(--nb-color-border)',
        amber: 'bg-(--nb-color-accent-100) text-(--nb-color-brand) border-(--nb-color-border)',
        indigo: 'bg-(--nb-color-brand-100) text-(--nb-color-brand) border-(--nb-color-border)',
    };

    return (
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone] || tones.gray}`}>
            <span className="text-[11px] font-semibold opacity-80">{label}</span>
            <span className="tabular-nums">{fmt(value)}</span>
        </div>
    );
};

export default function ScoreActivityCard({ buckets, series }) {
    const { t } = useI18n();
    const safeBuckets = buckets && typeof buckets === 'object' ? buckets : null;
    const safeSeries = Array.isArray(series) ? series : [];

    const [range, setRange] = useState('week'); // day | week | month | year

    const todayAndLast7 = useMemo(() => {
        const now = new Date();
        const todayKey = isoDateOnlyUTC(now);
        const last7Keys = [];
        for (let i = 6; i >= 0; i--) {
            last7Keys.push(isoDateOnlyUTC(new Date(now.getTime() - i * 86400000)));
        }

        const dayRows = Array.isArray(safeBuckets?.day) ? safeBuckets.day : null;
        if (dayRows) {
            const map = new Map(dayRows.map((r) => [String(r?.key || ''), r]));
            const tRow = map.get(todayKey);
            const today = {
                touched: Number(tRow?.touched || 0),
                created: Number(tRow?.created || 0),
                updated: Number(tRow?.updated || 0),
            };

            const last7 = last7Keys.reduce(
                (acc, k) => {
                    const r = map.get(k);
                    acc.touched += Number(r?.touched || 0);
                    acc.created += Number(r?.created || 0);
                    acc.updated += Number(r?.updated || 0);
                    return acc;
                },
                { touched: 0, created: 0, updated: 0 }
            );

            return { today, last7 };
        }

        // Fallback: series is typically last-7 by day.
        const s = Array.isArray(safeSeries) ? safeSeries : [];
        const map = new Map(s.map((r) => [String(r?.day || r?.key || ''), r]));
        const tRow = map.get(todayKey);
        const today = {
            touched: Number(tRow?.touched || 0),
            created: Number(tRow?.created || 0),
            updated: Number(tRow?.updated || 0),
        };
        const last7 = s.reduce(
            (acc, r) => {
                acc.touched += Number(r?.touched || 0);
                acc.created += Number(r?.created || 0);
                acc.updated += Number(r?.updated || 0);
                return acc;
            },
            { touched: 0, created: 0, updated: 0 }
        );
        return { today, last7 };
    }, [safeBuckets, safeSeries]);

    const activeSeries = useMemo(() => {
        const now = new Date();
        const makeOut = (keys, labelFn, map) => {
            return keys.map((key) => {
                const row = map?.get(key);
                return {
                    key,
                    label: labelFn(key),
                    touched: Number(row?.touched || 0),
                    created: Number(row?.created || 0),
                    updated: Number(row?.updated || 0),
                };
            });
        };

        const mode = String(range || 'week');
        const rows = safeBuckets?.[mode];

        if (Array.isArray(rows)) {
            const map = new Map(rows.map((r) => [String(r?.key || ''), r]));

            if (mode === 'day') {
                const keys = [];
                for (let i = 13; i >= 0; i--) {
                    keys.push(isoDateOnlyUTC(new Date(now.getTime() - i * 86400000)));
                }
                return makeOut(keys, (k) => String(k).slice(5), map);
            }

            if (mode === 'week') {
                const keys = [];
                for (let i = 11; i >= 0; i--) {
                    const dt = new Date(now.getTime() - i * 7 * 86400000);
                    const { year, week } = isoWeekYearWeek(dt);
                    keys.push(`${year}-W${pad2(week)}`);
                }
                return makeOut(keys, (k) => String(k).split('-W')[1] ? `W${String(k).split('-W')[1]}` : String(k), map);
            }

            if (mode === 'month') {
                const y = now.getUTCFullYear();
                const m = now.getUTCMonth();
                const keys = [];
                for (let i = 11; i >= 0; i--) {
                    const dt = new Date(Date.UTC(y, m - i, 1));
                    const key = `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}`;
                    keys.push(key);
                }
                return makeOut(keys, (k) => String(k), map);
            }

            // year
            {
                const y = now.getUTCFullYear();
                const keys = [];
                for (let i = 4; i >= 0; i--) {
                    keys.push(String(y - i));
                }
                return makeOut(keys, (k) => String(k), map);
            }
        }

        // Backward compatible fallback: show provided series as-is.
        return safeSeries.map((p) => ({
            key: String(p?.key || p?.day || ''),
            label: String(p?.label || (p?.day ? String(p.day).slice(5) : p?.key || '')),
            touched: Number(p?.touched || 0),
            created: Number(p?.created || 0),
            updated: Number(p?.updated || 0),
        }));
    }, [range, safeBuckets, safeSeries]);

    const derivedTotals = useMemo(() => {
        const totals = activeSeries.reduce(
            (acc, r) => {
                acc.touched += Number(r?.touched || 0);
                acc.created += Number(r?.created || 0);
                acc.updated += Number(r?.updated || 0);
                return acc;
            },
            { touched: 0, created: 0, updated: 0 }
        );
        return totals;
    }, [activeSeries]);

    const totals = derivedTotals;

    return (
        <div className="rounded-2xl border border-(--nb-color-border) bg-(--nb-color-bg-card) shadow-md hover:shadow-lg transition-shadow overflow-hidden">
            <div className="px-5 py-4 bg-(--nb-color-brand) text-white border-b border-white/10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="text-lg font-semibold">{t('dashboard.cards.scoreActivity.title')}</div>
                    <div className="text-sm text-white/80 mt-1">{t('dashboard.cards.scoreActivity.subtitle')}</div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <TinyStat label={t('dashboard.cards.scoreActivity.stats.touched')} value={totals?.touched} tone="indigo" />
                    <TinyStat label={t('dashboard.cards.scoreActivity.stats.created')} value={totals?.created} tone="emerald" />
                    <TinyStat label={t('dashboard.cards.scoreActivity.stats.updated')} value={totals?.updated} tone="amber" />
                </div>
            </div>

            <div className="px-5 py-3 bg-(--nb-color-bg) border-b border-(--nb-color-border) flex items-center justify-between gap-3 flex-wrap">
                <div className="inline-flex items-center gap-2 text-sm text-(--nb-color-text)">
                    <PenLine size={16} />
                    <span className="font-semibold">{t('common.range.title')}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-xs text-(--nb-color-muted) tabular-nums">
                        <span className="inline-flex items-center rounded-full border border-(--nb-color-border) bg-(--nb-color-bg-card) px-2.5 py-1">
                            {t('common.range.today')}: <span className="ml-1 font-semibold text-(--nb-color-text)">{fmtOrDash(todayAndLast7.today?.touched)}</span>
                        </span>
                        <span className="inline-flex items-center rounded-full border border-(--nb-color-border) bg-(--nb-color-bg-card) px-2.5 py-1">
                            {t('common.range.last7')}: <span className="ml-1 font-semibold text-(--nb-color-text)">{fmtOrDash(todayAndLast7.last7?.touched)}</span>
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
                <SvgBars series={activeSeries} height={180} />
                <div className="mt-3 text-xs text-(--nb-color-muted)">
                    {t('dashboard.cards.scoreActivity.noteDefinition', {
                        label: t('dashboard.cards.scoreActivity.stats.touched'),
                    })}
                </div>
            </div>
        </div>
    );
}
