import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart3,
    BookOpenCheck,
    CalendarDays,
    ClipboardList,
    GraduationCap,
    Layers3,
    LineChart,
    Megaphone,
    Repeat,
    TrendingUp,
    UserCog,
    Users,
} from 'lucide-react';

import { useAuth } from '../../../auth/AuthContext';
import Alert from '../../../shared/components/ui/Alert.jsx';
import Skeleton from '../../../shared/components/ui/Skeleton.jsx';

import { getDashboardSummary } from '../services/dashboardApi';
import { dashboardKeys } from '../services/queryKeys';
import { getSessionSignal } from '../../../api/sessionAbort';
import AttendanceChartsCard from '../components/AttendanceChartsCard.jsx';
import ResultsChartsCard from '../components/ResultsChartsCard.jsx';
import ScoreActivityCard from '../components/ScoreActivityCard.jsx';
import AnnouncementsMixCard from '../components/AnnouncementsMixCard.jsx';
import { useDashboardRealtimeInvalidation } from '../useDashboardRealtimeInvalidation';

const tones = {
    blue: {
        card: 'from-blue-50 to-indigo-50 border-blue-100',
        accent: 'text-blue-700 bg-blue-100 border-blue-200',
        sparkStroke: '#2563eb',
        sparkFill: 'rgba(37, 99, 235, 0.12)',
    },
    emerald: {
        card: 'from-emerald-50 to-teal-50 border-emerald-100',
        accent: 'text-emerald-800 bg-emerald-100 border-emerald-200',
        sparkStroke: '#059669',
        sparkFill: 'rgba(5, 150, 105, 0.12)',
    },
    amber: {
        card: 'from-amber-50 to-orange-50 border-amber-100',
        accent: 'text-amber-900 bg-amber-100 border-amber-200',
        sparkStroke: '#d97706',
        sparkFill: 'rgba(217, 119, 6, 0.12)',
    },
    violet: {
        card: 'from-violet-50 to-fuchsia-50 border-violet-100',
        accent: 'text-violet-800 bg-violet-100 border-violet-200',
        sparkStroke: '#7c3aed',
        sparkFill: 'rgba(124, 58, 237, 0.12)',
    },
    gray: {
        card: 'from-white to-slate-50 border-slate-200',
        accent: 'text-slate-700 bg-slate-100 border-slate-200',
        sparkStroke: '#334155',
        sparkFill: 'rgba(51, 65, 85, 0.10)',
    },
};

const isoDateOnlyUTC = (dt) => {
    try {
        return new Date(dt).toISOString().slice(0, 10);
    } catch {
        return '';
    }
};

const isoMinusDaysUTC = (isoDateOnly, days) => {
    const m = String(isoDateOnly || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return isoDateOnly;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (Number.isNaN(dt.getTime())) return isoDateOnly;
    const out = new Date(dt.getTime() - (Number(days) || 0) * 86400000);
    return out.toISOString().slice(0, 10);
};

const QuickCard = ({ title, description, to, Icon, tone = 'indigo', disabled = false }) => {
    const cardBg = {
        indigo: 'bg-linear-to-r from-indigo-50 to-violet-50 border-indigo-100',
        emerald: 'bg-linear-to-r from-emerald-50 to-lime-50 border-emerald-100',
        amber: 'bg-linear-to-r from-amber-50 to-orange-50 border-amber-100',
        sky: 'bg-linear-to-r from-sky-50 to-cyan-50 border-sky-100',
    };
    const accent = {
        indigo: 'border-b-indigo-300',
        emerald: 'border-b-emerald-300',
        amber: 'border-b-amber-300',
        sky: 'border-b-sky-300',
    };
    const toneClasses = {
        indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        amber: 'bg-amber-100 text-amber-900 border-amber-200',
        sky: 'bg-sky-100 text-sky-800 border-sky-200',
    };

    const base = `block rounded-xl border border-b-4 p-5 shadow-md transition ${cardBg[tone] || cardBg.indigo} ${accent[tone] || accent.indigo}`;
    const active = 'hover:shadow-lg hover:border-blue-200';
    const off = 'opacity-60 cursor-not-allowed';

    const inner = (
        <div className="flex items-start gap-4">
            <div className={`shrink-0 w-11 h-11 rounded-lg border flex items-center justify-center ${toneClasses[tone] || toneClasses.indigo}`}>
                {Icon ? <Icon size={20} /> : null}
            </div>
            <div className="min-w-0">
                <div className="text-base font-semibold text-gray-900">{title}</div>
                <div className="text-sm text-gray-600 mt-1">{description}</div>
            </div>
        </div>
    );

    if (disabled) {
        return <div className={`${base} ${off}`}>{inner}</div>;
    }
    return (
        <Link to={to} className={`${base} ${active}`}>
            {inner}
        </Link>
    );
};

const fmtCount = (value) => {
    if (value === null || value === undefined) return '—';
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat().format(n);
};

const pad2 = (n) => String(Math.max(0, Number(n) || 0)).padStart(2, '0');

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

const DashboardSkeleton = () => {
    return (
        <div className="space-y-5">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-r from-blue-700 via-indigo-700 to-violet-700 p-5 shadow-lg">
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
                <div className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-black/10 blur-3xl" />
                <div className="relative space-y-3">
                    <Skeleton className="h-7 w-64 bg-white/40" />
                    <Skeleton className="h-4 w-56 bg-white/35" />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border bg-white p-5 shadow-md">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-9 w-20 mt-3" />
                                <Skeleton className="h-3 w-28 mt-2" />
                            </div>
                            <Skeleton className="h-11 w-11 rounded-xl" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-40" />
                    </div>
                    <div className="inline-flex flex-wrap gap-2 rounded-xl border bg-white p-1 shadow-sm">
                        {Array.from({ length: 4 }).map((__, t) => (
                            <Skeleton key={t} className="h-9 w-16 rounded-lg" />
                        ))}
                    </div>
                </div>

                <div className="mt-4">
                    <div className="w-full" style={{ aspectRatio: '760 / 320' }}>
                        <div className="w-full h-full rounded-xl bg-slate-100 animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const ModuleCard = ({ title, subtitle, to, Icon, count, tone = 'blue', disabled = false }) => {
    const themes = {
        blue: 'from-blue-600 to-indigo-600',
        emerald: 'from-emerald-600 to-teal-600',
        violet: 'from-violet-600 to-fuchsia-600',
        amber: 'from-amber-500 to-orange-600',
        sky: 'from-sky-600 to-cyan-600',
        rose: 'from-rose-600 to-pink-600',
    };

    const base = `relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br ${themes[tone] || themes.blue} p-5 shadow-md transition`;
    const active = 'hover:shadow-lg hover:-translate-y-0.5';
    const off = 'opacity-60 cursor-not-allowed';

    const inner = (
        <div className="relative">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-white/90 truncate">{title}</div>
                    <div className="mt-2 text-3xl font-extrabold tracking-tight text-white tabular-nums">{fmtCount(count)}</div>
                    {subtitle ? <div className="mt-1 text-xs text-white/80 truncate">{subtitle}</div> : null}
                </div>
                <div className="shrink-0 w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white">
                    {Icon ? <Icon size={22} /> : null}
                </div>
            </div>
            <div className="pointer-events-none absolute -right-10 -top-12 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
            <div className="pointer-events-none absolute -left-12 -bottom-12 h-28 w-28 rounded-full bg-black/10 blur-2xl" />
        </div>
    );

    if (disabled) return <div className={`${base} ${off}`}>{inner}</div>;
    return (
        <Link to={to} className={`${base} ${active}`}>
            {inner}
        </Link>
    );
};

const SvgNewStudentsLineChart = ({ series = [], height = 320, yAxisLabel = 'Tirada Ardayda (Student Count)' }) => {
    const rows = Array.isArray(series) ? series : [];
    if (rows.length < 2) {
        return <div className="h-40 flex items-center justify-center text-sm text-gray-600">Not enough data for a chart.</div>;
    }

    const [hoverIdx, setHoverIdx] = useState(null);

    const w = 760;
    const h = height;
    const padL = 56;
    const padR = 18;
    const padT = 18;
    const padB = 64;

    const ys = rows.map((r) => Math.max(0, Number(r?.y || 0)));
    const maxY = Math.max(1, ...ys);
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const xStep = innerW / Math.max(1, rows.length - 1);
    const toX = (i) => padL + i * xStep;
    const toY = (v) => padT + (1 - Math.max(0, Number(v || 0)) / maxY) * innerH;

    const pts = rows.map((r, i) => `${toX(i)},${toY(r.y)}`).join(' ');
    const area = `${padL},${h - padB} ${pts} ${w - padR},${h - padB}`;
    const dash = 1000;

    const tickCount = 4;
    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((maxY * i) / tickCount));

    const showEvery = rows.length <= 8 ? 1 : rows.length <= 12 ? 2 : rows.length <= 20 ? 3 : 4;

    const handlePointerMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        if (!rect.width) return;
        const px = ((e.clientX - rect.left) / rect.width) * w;
        const raw = Math.round((px - padL) / xStep);
        const idx = Math.max(0, Math.min(rows.length - 1, raw));
        setHoverIdx(idx);
    };

    const handlePointerLeave = () => setHoverIdx(null);

    const hover = typeof hoverIdx === 'number' ? rows[hoverIdx] : null;
    const hoverX = typeof hoverIdx === 'number' ? toX(hoverIdx) : null;
    const hoverY = typeof hoverIdx === 'number' ? toY(hover?.y) : null;

    const tipText = hover ? `${String(hover.x)} • ${fmtCount(hover.y)}` : '';
    const tipW = Math.max(120, Math.min(220, tipText.length * 7.2));
    const tipH = 28;
    const tipX = hoverX !== null ? Math.min(hoverX + 12, w - padR - tipW) : 0;
    const tipY = hoverY !== null ? Math.max(padT + 6, hoverY - 40) : 0;

    return (
        <div className="w-full" style={{ aspectRatio: `${w} / ${h}` }}>
            <svg
                viewBox={`0 0 ${w} ${h}`}
                className="w-full h-full"
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
            >
            <defs>
                <linearGradient id="nbNewStudentsFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(79,70,229,0.22)" />
                    <stop offset="100%" stopColor="rgba(79,70,229,0.02)" />
                </linearGradient>
                <linearGradient id="nbNewStudentsStroke" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#2563EB" />
                    <stop offset="100%" stopColor="#7C3AED" />
                </linearGradient>
            </defs>

            <rect x="0" y="0" width={w} height={h} rx="14" fill="#F9FAFB" />

            {/* Y grid + tick labels (LEFT) */}
            {ticks.map((tv, idx) => {
                const yy = toY(tv);
                return (
                    <g key={idx}>
                        <line x1={padL} x2={w - padR} y1={yy} y2={yy} stroke="#E5E7EB" strokeWidth="1" />
                        <text x={padL - 10} y={yy + 4} textAnchor="end" fontSize="10" fill="#6B7280">
                            {fmtCount(tv)}
                        </text>
                    </g>
                );
            })}

            {/* X axis line */}
            <line x1={padL} x2={w - padR} y1={h - padB} y2={h - padB} stroke="#CBD5E1" strokeWidth="1" />

            {/* Area fill */}
            <polyline points={area} fill="url(#nbNewStudentsFill)" />

            {/* Animated line */}
            <polyline
                points={pts}
                fill="none"
                stroke="url(#nbNewStudentsStroke)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ strokeDasharray: dash, strokeDashoffset: dash, ['--nb-dash']: dash }}
                className="animate-[nb-draw_1000ms_ease-out_both]"
            />

            {/* Points */}
            {rows.map((r, i) => {
                const active = i === hoverIdx;
                return (
                    <g key={String(r?.x || i)}>
                        <circle
                            cx={toX(i)}
                            cy={toY(r.y)}
                            r={active ? 7 : 5.5}
                            fill={active ? '#E0E7FF' : '#EEF2FF'}
                            stroke="#4F46E5"
                            strokeWidth={active ? 2.5 : 2}
                        >
                            <title>{`${String(r?.x || '')}: ${fmtCount(r?.y)}`}</title>
                        </circle>
                    </g>
                );
            })}

            {/* Hover guide + tooltip */}
            {hover && hoverX !== null && hoverY !== null ? (
                <g>
                    <g>
                        <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="10" fill="#111827" opacity="0.92" />
                        <text x={tipX + 10} y={tipY + 18} fontSize="11" fill="#FFFFFF" fontWeight="600">
                            {tipText}
                        </text>
                    </g>
                </g>
            ) : null}

            {/* X labels (BOTTOM) */}
            {rows.map((r, i) => {
                if (i % showEvery !== 0 && i !== rows.length - 1) return null;
                const label = String(r?.x || '');
                const xx = toX(i);
                const yy = h - padB + 18;
                return (
                    <g key={`x-${i}`} transform={`translate(${xx},${yy}) rotate(35)`}>
                        <text textAnchor="start" fontSize="10" fill="#6B7280">
                            {label.length > 14 ? `${label.slice(0, 14)}…` : label}
                        </text>
                    </g>
                );
            })}

            {/* Y axis label */}
            <text
                transform={`translate(16 ${padT + innerH / 2}) rotate(-90)`}
                fontSize="11"
                fill="#6B7280"
                fontWeight="600"
            >
                {yAxisLabel}
            </text>
            </svg>
        </div>
    );
};

const SectionTitle = ({ title, subtitle, right }) => {
    return (
        <div className="flex items-end justify-between gap-3">
            <div>
                <div className="text-lg font-semibold text-gray-900">{title}</div>
                {subtitle ? <div className="text-sm text-gray-600 mt-0.5">{subtitle}</div> : null}
            </div>
            {right ? <div className="shrink-0">{right}</div> : null}
        </div>
    );
};

const Pill = ({ children, tone = 'gray' }) => {
    const t = tones[tone] || tones.gray;
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${t.accent}`}>
            {children}
        </span>
    );
};

const Sparkline = ({ values = [], stroke = '#2563eb', fill = 'rgba(37,99,235,0.12)' }) => {
    const pts = Array.isArray(values) ? values.map((v) => Number(v || 0)) : [];
    if (pts.length < 2) {
        return <div className="h-10" />;
    }
    const w = 120;
    const h = 40;
    const pad = 3;
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = Math.max(1e-9, max - min);
    const xStep = (w - pad * 2) / (pts.length - 1);
    const toY = (v) => {
        const t = (v - min) / span;
        return pad + (1 - t) * (h - pad * 2);
    };
    const points = pts.map((v, i) => `${pad + i * xStep},${toY(v)}`).join(' ');
    const area = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`;

    // Path length animation without external libs
    const dash = 160;
    return (
        <svg width="100%" height="40" viewBox={`0 0 ${w} ${h}`} className="block">
            <defs>
                <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={fill} stopOpacity="1" />
                    <stop offset="100%" stopColor={fill} stopOpacity="0.12" />
                </linearGradient>
            </defs>
            <polyline points={area} fill="url(#sparkFill)" opacity="1" />
            <polyline
                points={points}
                fill="none"
                stroke={stroke}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ strokeDasharray: dash, strokeDashoffset: dash, ['--nb-dash']: dash }}
                className="animate-[nb-draw_600ms_ease-out_both]"
            />
        </svg>
    );
};

const StatCard = ({ title, value, subtitle, Icon, tone = 'blue', sparkValues = [] }) => {
    const t = tones[tone] || tones.blue;
    return (
        <div className={`relative overflow-hidden rounded-2xl border bg-linear-to-br ${t.card} p-4 shadow-sm animate-nb-fade-in`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-600">{title}</div>
                    <div className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
                    {subtitle ? <div className="mt-1 text-xs text-gray-600">{subtitle}</div> : null}
                </div>
                <div className={`shrink-0 w-11 h-11 rounded-xl border flex items-center justify-center ${t.accent}`}>
                    {Icon ? <Icon size={20} /> : null}
                </div>
            </div>
            <div className="mt-3">
                <Sparkline values={sparkValues} stroke={t.sparkStroke} fill={t.sparkFill} />
            </div>
            <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-white/40 blur-2xl" />
        </div>
    );
};

const CardShell = ({ children, className = '' }) => (
    <div className={`rounded-2xl border bg-white/80 backdrop-blur-sm shadow-sm ${className}`}>{children}</div>
);

const SvgLineChart = ({ series = [], stroke = '#2563eb', fill = 'rgba(37,99,235,0.12)', height = 160 }) => {
    const rows = Array.isArray(series) ? series : [];
    if (rows.length < 2) {
        return <div className="h-40 flex items-center justify-center text-sm text-gray-600">Not enough data for a chart.</div>;
    }
    const w = 560;
    const h = height;
    const padX = 18;
    const padY = 14;
    const ys = rows.map((r) => Number(r?.y || 0));
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanY = Math.max(1e-9, maxY - minY);
    const xStep = (w - padX * 2) / (rows.length - 1);
    const toX = (i) => padX + i * xStep;
    const toY = (v) => padY + (1 - (v - minY) / spanY) * (h - padY * 2);
    const pts = rows.map((r, i) => `${toX(i)},${toY(Number(r?.y || 0))}`).join(' ');
    const area = `${padX},${h - padY} ${pts} ${w - padX},${h - padY}`;
    const dash = 520;

    const leftLabel = String(rows[0]?.x || '');
    const midLabel = String(rows[Math.floor(rows.length / 2)]?.x || '');
    const rightLabel = String(rows[rows.length - 1]?.x || '');

    return (
        <div>
            <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="block">
                <defs>
                    <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={fill} stopOpacity="1" />
                        <stop offset="100%" stopColor={fill} stopOpacity="0.10" />
                    </linearGradient>
                </defs>
                <rect x="0" y="0" width={w} height={h} fill="transparent" />
                <polyline points={area} fill="url(#lineFill)" />
                <polyline
                    points={pts}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ strokeDasharray: dash, strokeDashoffset: dash, ['--nb-dash']: dash }}
                    className="animate-[nb-draw_900ms_ease-out_both]"
                />
            </svg>
            <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                <span className="truncate max-w-[33%]">{leftLabel}</span>
                <span className="truncate max-w-[33%]">{midLabel}</span>
                <span className="truncate max-w-[33%] text-right">{rightLabel}</span>
            </div>
        </div>
    );
};

const KpiCard = ({ title, value, subtitle, tone = 'indigo' }) => {
    const tones = {
        indigo: 'border-indigo-100 bg-linear-to-r from-white to-indigo-50',
        emerald: 'border-emerald-100 bg-linear-to-r from-white to-emerald-50',
        amber: 'border-amber-100 bg-linear-to-r from-white to-amber-50',
        sky: 'border-sky-100 bg-linear-to-r from-white to-sky-50',
        gray: 'border-gray-200 bg-white',
    };
    return (
        <div className={`rounded-xl border p-4 shadow-sm ${tones[tone] || tones.gray}`}>
            <div className="text-xs font-semibold text-gray-500">{title}</div>
            <div className="mt-2 text-2xl font-bold text-gray-900 tabular-nums animate-[fadeIn_0.35s_ease-out]">{value}</div>
            {subtitle ? <div className="mt-1 text-xs text-gray-600">{subtitle}</div> : null}
        </div>
    );
};

const MiniLegend = ({ items }) => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
        {items.map((it) => (
            <div key={it.label} className="inline-flex items-center gap-2">
                <span className={`inline-block w-2.5 h-2.5 rounded ${it.dot}`} />
                <span>{it.label}</span>
            </div>
        ))}
    </div>
);

const StackedBar = ({ label, segments }) => {
    const total = segments.reduce((sum, s) => sum + (Number(s.value) || 0), 0) || 1;
    return (
        <div className="flex items-center gap-3">
            <div className="w-20 text-[11px] text-gray-600 tabular-nums truncate">{label}</div>
            <div className="flex-1">
                <div className="h-3 w-full overflow-hidden rounded bg-gray-100 border border-gray-200">
                    <div className="flex h-full">
                        {segments.map((s) => (
                            <div
                                key={s.key}
                                className={s.className}
                                style={{ width: `${Math.max(0, ((Number(s.value) || 0) / total) * 100)}%` }}
                                title={`${s.label}: ${s.value}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
            <div className="w-12 text-right text-[11px] text-gray-700 tabular-nums">{total}</div>
        </div>
    );
};

export default function DashboardPage() {
    const { auth, hasPermission } = useAuth();
    const role = String(auth?.user?.role || '').toLowerCase();
    const fullName = String(auth?.user?.fullName || '').trim();
    const isAdmin = role === 'admin';

    // EDCI: Realtime -> Events -> invalidate dashboard queries -> UI updated.
    useDashboardRealtimeInvalidation({ enabled: true });

    const today = useMemo(() => isoDateOnlyUTC(new Date()), []);
    const effectiveRange = useMemo(() => ({ from: isoMinusDaysUTC(today, 6), to: today }), [today]);

    const sessionSignal = useMemo(() => getSessionSignal(), []);

    const summaryQuery = useQuery({
        queryKey: dashboardKeys.summary({ ...effectiveRange }),
        queryFn: async () => {
            const res = await getDashboardSummary({ ...effectiveRange }, { signal: sessionSignal });
            return res?.data;
        },
        staleTime: 30_000,
    });

    const loading = summaryQuery.isLoading;
    const isError = summaryQuery.isError;
    const data = summaryQuery.data;
    const perms = data?.permissions || {};

    const selectedAyLabel = String(data?.selectedAcademicYear?.yearName || '');

    const canStudents = isAdmin || hasPermission?.('students', 'view');
    const canTeachers = isAdmin || hasPermission?.('teachers', 'view');
    const canTransfers = isAdmin || hasPermission?.('transfers', 'view') || hasPermission?.('transfers', 'transfer');
    const canAnnouncements = isAdmin || hasPermission?.('announcements', 'view');
    const canGrades = isAdmin || hasPermission?.('grades', 'view');
    const canSubjects = isAdmin || hasPermission?.('subjects', 'view');
    const canCohorts = isAdmin || hasPermission?.('cohorts', 'view');

    // Charts intentionally hidden for now (per request: focus on title + cards)

    const studentsTotal = data?.cards?.students?.total;
    const studentsActive = data?.cards?.students?.active;
    const teachersTotal = data?.cards?.teachers?.total;
    const teachersActive = data?.cards?.teachers?.active;
    const staffTotal = data?.cards?.staff?.total;
    const staffActive = data?.cards?.staff?.active;

    const classesCount = data?.cards?.gradeSections;
    const subjectsCount = data?.cards?.subjects;
    const cohortsCount = data?.cards?.cohorts;
    const transfersInRange = data?.cards?.transfersInRange;
    const announcementsInRange = data?.cards?.announcementsCreatedInRange;

    const announcementsByRole = Array.isArray(data?.charts?.announcementsByRole) ? data.charts.announcementsByRole : [];
    const announcementsByRoleAllTime = Array.isArray(data?.charts?.announcementsByRoleAllTime)
        ? data.charts.announcementsByRoleAllTime
        : [];
    const announcementsTotalAllTime = data?.cards?.announcementsTotalAllTime;
    const announcementsMixBuckets = data?.charts?.announcementsMixBuckets;

    const scoreActivityByDayRaw = Array.isArray(data?.charts?.scoreActivityByDay) ? data.charts.scoreActivityByDay : [];
    const scoreTotals = data?.performance?.scores;
    const scoreActivityBuckets = data?.charts?.scoreActivityBuckets;

    const scoreActivitySeries7 = useMemo(() => {
        const map = new Map((scoreActivityByDayRaw || []).map((r) => [String(r?.day || ''), r]));
        const out = [];
        for (let idx = 0; idx < 7; idx++) {
            const day = isoMinusDaysUTC(today, 6 - idx);
            const row = map.get(day);
            out.push({
                day,
                touched: Number(row?.touched || 0),
                created: Number(row?.created || 0),
                updated: Number(row?.updated || 0),
            });
        }
        return out;
    }, [scoreActivityByDayRaw, today]);

    const [newStudentsRange, setNewStudentsRange] = useState('year'); // year | month | week | day

    const newStudentsByAcademicYear = Array.isArray(data?.charts?.newStudentsByAcademicYear)
        ? data.charts.newStudentsByAcademicYear
        : [];

    const newStudentsByDay = Array.isArray(data?.charts?.newStudentsByDay) ? data.charts.newStudentsByDay : [];
    const newStudentsByWeek = Array.isArray(data?.charts?.newStudentsByWeek) ? data.charts.newStudentsByWeek : [];
    const newStudentsByMonth = Array.isArray(data?.charts?.newStudentsByMonth) ? data.charts.newStudentsByMonth : [];


    const newStudentsSeries = useMemo(() => {
        const mode = String(newStudentsRange || 'year');
        if (mode === 'day') {
            const map = new Map((newStudentsByDay || []).map((r) => [String(r?.day || ''), Number(r?.newStudents || 0)]));
            const days = 14;
            const end = new Date();
            const start = new Date(end.getTime() - (days - 1) * 86400000);
            const out = [];
            for (let i = 0; i < days; i++) {
                const dt = new Date(start.getTime() + i * 86400000);
                const iso = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())).toISOString().slice(0, 10);
                out.push({ x: iso, y: map.get(iso) || 0 });
            }
            return out;
        }

        if (mode === 'week') {
            const map = new Map(
                (newStudentsByWeek || []).map((r) => {
                    const y = Number(r?.isoWeekYear || 0);
                    const w = Number(r?.isoWeek || 0);
                    return [`${y}-W${pad2(w)}`, Number(r?.newStudents || 0)];
                })
            );
            const weeks = 12;
            const out = [];
            const end = new Date();
            for (let i = weeks - 1; i >= 0; i--) {
                const dt = new Date(end.getTime() - i * 7 * 86400000);
                const wk = isoWeekYearWeek(dt);
                const key = `${wk.year}-W${pad2(wk.week)}`;
                out.push({ x: key, y: map.get(key) || 0 });
            }
            return out;
        }

        if (mode === 'month') {
            const map = new Map(
                (newStudentsByMonth || []).map((r) => {
                    const y = Number(r?.year || 0);
                    const m = Number(r?.month || 0);
                    return [`${y}-${pad2(m)}`, Number(r?.newStudents || 0)];
                })
            );
            const months = 12;
            const out = [];
            const end = new Date();
            for (let i = months - 1; i >= 0; i--) {
                const dt = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1));
                const key = `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}`;
                out.push({ x: key, y: map.get(key) || 0 });
            }
            return out;
        }

        return (newStudentsByAcademicYear || [])
            .map((r) => ({
                x: String(r?.yearName || ''),
                y: Number(r?.newStudents || 0),
            }))
            .filter((p) => p.x);
    }, [
        newStudentsRange,
        newStudentsByAcademicYear,
        newStudentsByDay,
        newStudentsByWeek,
        newStudentsByMonth,
    ]);

    const isInitialLoading = Boolean(loading && data == null);

    if (isInitialLoading) return <DashboardSkeleton />;
    if (isError) return <Alert type="error" message="Failed to load dashboard data." />;

    return (
        <div className="space-y-5">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-r from-blue-700 via-indigo-700 to-violet-700 p-5 shadow-lg">
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
                <div className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-black/10 blur-3xl" />
                <div className="relative">
                    <div className="text-xl md:text-2xl font-extrabold tracking-tight text-white">{fullName ? `Welcome, ${fullName}` : 'Welcome'}</div>
                    <div className="text-sm text-white/85 mt-1">{selectedAyLabel ? `Academic Year: ${selectedAyLabel}` : 'Dashboard overview'}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
                <ModuleCard
                    title="Students"
                    subtitle={studentsActive !== null && studentsActive !== undefined ? `Active: ${fmtCount(studentsActive)}` : ' '}
                    to="/students"
                    Icon={Users}
                    count={studentsTotal}
                    tone="blue"
                    disabled={!canStudents}
                />
                <ModuleCard
                    title="Teachers"
                    subtitle={teachersActive !== null && teachersActive !== undefined ? `Active: ${fmtCount(teachersActive)}` : ' '}
                    to="/teachers"
                    Icon={Users}
                    count={teachersTotal}
                    tone="emerald"
                    disabled={!canTeachers}
                />
                {isAdmin ? (
                    <ModuleCard
                        title="Staff"
                        subtitle={staffActive !== null && staffActive !== undefined ? `Active: ${fmtCount(staffActive)}` : ' '}
                        to="/users"
                        Icon={UserCog}
                        count={staffTotal}
                        tone="violet"
                        disabled={!isAdmin}
                    />
                ) : null}

                <ModuleCard
                    title="Classes"
                    subtitle="Grade sections"
                    to="/grades"
                    Icon={Layers3}
                    count={classesCount}
                    tone="amber"
                    disabled={!canGrades}
                />
                <ModuleCard
                    title="Subjects"
                    subtitle="All subjects"
                    to="/subjects"
                    Icon={BookOpenCheck}
                    count={subjectsCount}
                    tone="sky"
                    disabled={!canSubjects}
                />
                <ModuleCard
                    title="Cohorts"
                    subtitle="All cohorts"
                    to="/cohorts"
                    Icon={GraduationCap}
                    count={cohortsCount}
                    tone="emerald"
                    disabled={!canCohorts}
                />
                <ModuleCard
                    title="Transfers"
                    subtitle="In selected range"
                    to="/transfers"
                    Icon={Repeat}
                    count={transfersInRange}
                    tone="amber"
                    disabled={!canTransfers}
                />
                <ModuleCard
                    title="Announcements"
                    subtitle="In selected range"
                    to="/announcements"
                    Icon={Megaphone}
                    count={announcementsInRange}
                    tone="rose"
                    disabled={!canAnnouncements}
                />
            </div>

            {/* Analytics (2-column layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {perms?.allowStudents ? (
                    <div className="rounded-2xl border border-indigo-100 bg-white shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                        <div className="px-5 py-4 bg-gray-900 text-white border-b border-gray-800 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="text-lg font-semibold">New Students</div>
                                <div className="text-sm text-white/80 mt-1">First-ever enrollment trend</div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <RangeTabs
                                    value={newStudentsRange}
                                    onChange={setNewStudentsRange}
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
                            <SvgNewStudentsLineChart series={newStudentsSeries} height={320} yAxisLabel="Tirada Ardayda (Student Count)" />
                        </div>
                    </div>
                ) : null}

                {perms?.allowAttendance ? <AttendanceChartsCard /> : null}

                {perms?.allowExams ? <ScoreActivityCard buckets={scoreActivityBuckets} series={scoreActivitySeries7} totals={scoreTotals} /> : null}

                {perms?.allowAnnouncements ? (
                    <AnnouncementsMixCard
                        buckets={announcementsMixBuckets}
                        rowsInRange={announcementsByRole}
                        rowsAllTime={announcementsByRoleAllTime}
                        totalInRange={announcementsInRange}
                        totalAllTime={announcementsTotalAllTime}
                    />
                ) : null}
            </div>

            {/* Results is intentionally full-width */}
            {perms?.allowExams ? <ResultsChartsCard /> : null}
        </div>
    );
}
