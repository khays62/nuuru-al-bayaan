import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Download, FileDown, Layers, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';
import { useQuery } from '@tanstack/react-query';

import Alert from '../../../shared/components/ui/Alert.jsx';
import UiLoadingState from '../../../shared/components/ui/LoadingState.jsx';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';

import AcademicYearSelect from '../../lookups/components/AcademicYearSelect.jsx';
import GradeSelect from '../../lookups/components/GradeSelect.jsx';
import ShiftSelect from '../../lookups/components/ShiftSelect.jsx';
import GradeSectionSelect from '../../lookups/components/GradeSectionSelect.jsx';
import Tabs from '../../attendance/components/Tabs.jsx';

import { getAcademicYears, getGrades, getShifts } from '../../lookups/api/lookups';
import { listGradeSections } from '../../grades/api/gradeSections';

import { getDashboardSummary } from '../services/dashboardApi';
import { dashboardKeys } from '../services/queryKeys';
import { getSessionSignal } from '../../../api/sessionAbort';
import { useI18n } from '../../../i18n/I18nProvider';

const ToggleButton = ({ active, onClick, icon: Icon, label }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                `inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition shadow-sm ` +
                (active
                    ? 'bg-(--nb-color-brand) text-white border-(--nb-color-brand) shadow-sm'
                    : 'bg-(--nb-color-bg-card) text-(--nb-color-text) border-(--nb-color-border) hover:bg-(--nb-color-brand-50) hover:shadow')
            }
        >
            {Icon ? <Icon size={16} /> : null}
            {label}
        </button>
    );
};

const ActionButton = ({ disabled, onClick, icon: Icon, label }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={
                `inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition shadow-sm ` +
                (disabled
                    ? 'bg-(--nb-color-bg) text-(--nb-color-muted) border-(--nb-color-border) cursor-not-allowed'
                    : 'bg-(--nb-color-bg-card) text-(--nb-color-text) border-(--nb-color-border) hover:bg-(--nb-color-brand-50) hover:shadow')
            }
            title={label}
        >
            {Icon ? <Icon size={16} /> : null}
            {label}
        </button>
    );
};

const MiniLegend = ({ items }) => {
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-(--nb-color-muted)">
            {items.map((it) => (
                <div key={it.label} className="inline-flex items-center gap-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded ${it.dot}`} />
                    <span>{it.label}</span>
                </div>
            ))}
        </div>
    );
};

const SkeletonRow = () => (
    <div className="flex items-center gap-3 animate-pulse">
        <div className="w-16 h-3 rounded bg-(--nb-color-border)" />
        <div className="flex-1 h-3 rounded bg-(--nb-color-border)" />
        <div className="w-12 h-3 rounded bg-(--nb-color-border)" />
    </div>
);

const TinyBadge = ({ tone = 'gray', children }) => {
    const tones = {
        gray: 'bg-(--nb-color-bg) text-(--nb-color-text) border-(--nb-color-border)',
        emerald: 'bg-(--nb-color-accent-100) text-(--nb-color-brand) border-(--nb-color-border)',
        indigo: 'bg-(--nb-color-brand-100) text-(--nb-color-brand) border-(--nb-color-border)',
        amber: 'bg-(--nb-color-accent-100) text-(--nb-color-brand) border-(--nb-color-border)',
    };
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tones[tone] || tones.gray}`}>
            {children}
        </span>
    );
};

const PercentBar = ({ label, pct, tone = 'bg-(--nb-color-brand)' }) => {
    const v = Number(pct || 0);
    const clamped = Math.max(0, Math.min(100, v));
    return (
        <div className="flex items-center gap-3">
            <div className="w-24 text-[11px] text-(--nb-color-muted) truncate">{label}</div>
            <div className="flex-1">
                <div className="h-3 w-full overflow-hidden rounded bg-(--nb-color-bg) border border-(--nb-color-border)">
                    <div className={`h-full ${tone}`} style={{ width: `${Math.max(2, clamped)}%` }} />
                </div>
            </div>
            <div className="w-12 text-right text-[11px] text-(--nb-color-text) tabular-nums">{clamped.toFixed(1)}%</div>
        </div>
    );
};

const StackedBar = ({ label, segments }) => {
    const total = segments.reduce((sum, s) => sum + (Number(s.value) || 0), 0) || 1;
    return (
        <div className="flex items-center gap-3">
            <div className="w-16 shrink-0 pt-0.5 text-[11px] text-(--nb-color-muted) tabular-nums">{label}</div>
            <div className="flex-1">
                <div className="h-3 w-full overflow-hidden rounded bg-(--nb-color-bg) border border-(--nb-color-border)">
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
            <div className="w-12 text-right text-[11px] text-(--nb-color-text) tabular-nums">{total}</div>
        </div>
    );
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

const normalizeRange = (fromStr, toStr) => {
    const a = new Date(`${String(fromStr)}T00:00:00.000Z`);
    const b = new Date(`${String(toStr)}T00:00:00.000Z`);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return { from: fromStr, to: toStr };
    if (b < a) return { from: fromStr, to: fromStr };
    return { from: fromStr, to: toStr };
};

export default function AttendanceChartsCard() {
    const { t } = useI18n();
    const sessionSignal = useMemo(() => getSessionSignal(), []);

    const [academicYearId, setAcademicYearId] = useState('');
    const [gradeId, setGradeId] = useState('');
    const [shiftId, setShiftId] = useState('');
    const [gradeSectionId, setGradeSectionId] = useState('');

    const [view, setView] = useState('status'); // status | periods | performance

    const todayUTC = useMemo(() => new Date().toISOString().slice(0, 10), []);

    const [rangeTab, setRangeTab] = useState('last7'); // today | last7 | custom
    const [from, setFrom] = useState(isoMinusDaysUTC(todayUTC, 6));
    const [to, setTo] = useState(todayUTC);

    // Range logic
    useEffect(() => {
        if (rangeTab === 'today') {
            setFrom(todayUTC);
            setTo(todayUTC);
            return;
        }
        if (rangeTab === 'last7') {
            setFrom(isoMinusDaysUTC(todayUTC, 6));
            setTo(todayUTC);
            return;
        }
    }, [rangeTab, todayUTC]);

    useEffect(() => {
        if (rangeTab !== 'custom') return;
        const r = normalizeRange(from, to);
        if (r.from !== from) setFrom(r.from);
        if (r.to !== to) setTo(r.to);
    }, [rangeTab, from, to]);

    // Lightweight lookup labels for exports
    const [lookupYears, setLookupYears] = useState([]);
    const [lookupGrades, setLookupGrades] = useState([]);
    const [lookupShifts, setLookupShifts] = useState([]);
    const [lookupSections, setLookupSections] = useState([]);

    useEffect(() => {
        let ignore = false;
        (async () => {
            try {
                const [ys, gs, ss] = await Promise.all([getAcademicYears(), getGrades(), getShifts()]);
                if (ignore) return;
                setLookupYears(Array.isArray(ys) ? ys : (ys?.data || []));
                setLookupGrades(Array.isArray(gs) ? gs : (gs?.data || []));
                setLookupShifts(Array.isArray(ss) ? ss : (ss?.data || []));
            } catch {
                if (ignore) return;
                setLookupYears([]);
                setLookupGrades([]);
                setLookupShifts([]);
            }
        })();
        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        let ignore = false;
        (async () => {
            if (!gradeId || !shiftId) {
                setLookupSections([]);
                return;
            }
            try {
                const res = await listGradeSections({ grade: gradeId, shift: shiftId, limit: 200 });
                const list = Array.isArray(res) ? res : (res?.data || []);
                if (!ignore) setLookupSections(list);
            } catch {
                if (!ignore) setLookupSections([]);
            }
        })();
        return () => {
            ignore = true;
        };
    }, [gradeId, shiftId]);

    const summaryQuery = useQuery({
        queryKey: dashboardKeys.summary({
            from,
            to,
            academicYearId,
            gradeId,
            shiftId,
            gradeSectionId,
            _scope: 'attendanceCard',
        }),
        enabled: Boolean(from && to),
        queryFn: async () => {
            const res = await getDashboardSummary(
                { from, to, academicYearId, gradeId, shiftId, gradeSectionId },
                { signal: sessionSignal }
            );
            return res?.data;
        },
    });

    const loading = summaryQuery.isLoading;
    const isError = summaryQuery.isError;
    const data = summaryQuery.data;

    const perms = data?.permissions || {};

    const STATUSES = useMemo(
        () => [
            { key: 'present', label: t('attendance.status.present', { defaultValue: 'Present' }), dot: 'bg-(--nb-color-accent)', bar: 'bg-(--nb-color-accent)' },
            { key: 'absent', label: t('attendance.status.absent', { defaultValue: 'Absent' }), dot: 'bg-(--nb-color-brand)', bar: 'bg-(--nb-color-brand)' },
            { key: 'late', label: t('attendance.status.late', { defaultValue: 'Late' }), dot: 'bg-(--nb-color-accent)/70', bar: 'bg-(--nb-color-accent)/70' },
            { key: 'excused', label: t('attendance.status.excused', { defaultValue: 'Excused' }), dot: 'bg-(--nb-color-brand)/70', bar: 'bg-(--nb-color-brand)/70' },
            { key: 'sick', label: t('attendance.status.sick', { defaultValue: 'Sick' }), dot: 'bg-(--nb-color-accent)/55', bar: 'bg-(--nb-color-accent)/55' },
            { key: 'medical', label: t('attendance.status.medical', { defaultValue: 'Medical' }), dot: 'bg-(--nb-color-brand)/55', bar: 'bg-(--nb-color-brand)/55' },
            { key: 'family', label: t('attendance.status.family', { defaultValue: 'Family' }), dot: 'bg-(--nb-color-accent)/40', bar: 'bg-(--nb-color-accent)/40' },
            { key: 'other', label: t('attendance.status.other', { defaultValue: 'Other' }), dot: 'bg-(--nb-color-muted)', bar: 'bg-(--nb-color-muted)' },
        ],
        [t]
    );

    const attendanceByDay = Array.isArray(data?.charts?.attendanceByDay) ? data.charts.attendanceByDay : [];
    const attendanceStatusTrend = Array.isArray(data?.charts?.attendanceStatusTrend) ? data.charts.attendanceStatusTrend : [];
    const attendanceByPeriod = Array.isArray(data?.charts?.attendanceByPeriod) ? data.charts.attendanceByPeriod : [];

    const trend = useMemo(() => {
        const src = (attendanceStatusTrend && attendanceStatusTrend.length > 0) ? attendanceStatusTrend : attendanceByDay;
        return (src || [])
            .map((r) => {
                const date = String(r?.date || '');
                const present = Number(r?.present || 0);
                const absent = Number(r?.absent || 0);
                const late = Number(r?.late || 0);
                const excused = Number(r?.excused || 0);
                const sick = Number(r?.sick || 0);
                const medical = Number(r?.medical || 0);
                const family = Number(r?.family || 0);
                const other = Number(r?.other || 0);
                const total = present + absent + late + excused + sick + medical + family + other;

                const preferSource = String(r?.preferSource || '');
                const hasAllDay = Boolean(r?.hasAllDay);
                const hasPerPeriod = Boolean(r?.hasPerPeriod);
                const dayTotal = Number(r?.dayTotal || 0);
                const lessonTotal = Number(r?.lessonTotal || 0);
                const dayPresent = Number(r?.dayPresent || 0);
                const lessonPresent = Number(r?.lessonPresent || 0);

                return {
                    date,
                    present,
                    absent,
                    late,
                    excused,
                    sick,
                    medical,
                    family,
                    other,
                    total,
                    preferSource,
                    hasAllDay,
                    hasPerPeriod,
                    dayTotal,
                    lessonTotal,
                    dayPresent,
                    lessonPresent,
                };
            })
            .filter((r) => r.date)
            .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    }, [attendanceByDay, attendanceStatusTrend]);

    const performanceAgg = useMemo(() => {
        const totals = Object.fromEntries(STATUSES.map((s) => [s.key, 0]));
        let total = 0;
        for (const r of trend || []) {
            totals.present += Number(r.present || 0);
            totals.absent += Number(r.absent || 0);
            totals.late += Number(r.late || 0);
            totals.excused += Number(r.excused || 0);
            totals.sick += Number(r.sick || 0);
            totals.medical += Number(r.medical || 0);
            totals.family += Number(r.family || 0);
            totals.other += Number(r.other || 0);
            total += Number(r.total || 0);
        }
        const pct = {};
        for (const s of STATUSES) {
            pct[s.key] = total > 0 ? (Number(totals[s.key] || 0) / total) * 100 : 0;
        }
        const presentPct = total > 0 ? (Number(totals.present || 0) / total) * 100 : 0;
        return { totals, total, pct, presentPct };
    }, [trend, STATUSES]);

    const sourceAgg = useMemo(() => {
        let dayTotal = 0;
        let dayPresent = 0;
        let lessonTotal = 0;
        let lessonPresent = 0;
        for (const r of trend || []) {
            dayTotal += Number(r.dayTotal || 0);
            dayPresent += Number(r.dayPresent || 0);
            lessonTotal += Number(r.lessonTotal || 0);
            lessonPresent += Number(r.lessonPresent || 0);
        }
        const dayPct = dayTotal > 0 ? (dayPresent / dayTotal) * 100 : null;
        const lessonPct = lessonTotal > 0 ? (lessonPresent / lessonTotal) * 100 : null;
        return { dayTotal, dayPresent, lessonTotal, lessonPresent, dayPct, lessonPct };
    }, [trend]);

    const exportCaptureRef = useRef(null);
    const [exporting, setExporting] = useState(false);

    const downloadPng = async () => {
        const el = exportCaptureRef.current;
        if (!el) return;
        try {
            setExporting(true);
            await new Promise((r) => requestAnimationFrame(() => r()));
            const canvas = await toCanvas(el, {
                backgroundColor: '#ffffff',
                pixelRatio: 2,
                cacheBust: true,
            });
            const dataUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `attendance-dashboard-${from}_${to}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } finally {
            setExporting(false);
        }
    };

    const downloadPdf = async () => {
        const el = exportCaptureRef.current;
        if (!el) return;
        try {
            setExporting(true);
            await new Promise((r) => requestAnimationFrame(() => r()));
            const canvas = await toCanvas(el, {
                backgroundColor: '#ffffff',
                pixelRatio: 2,
                cacheBust: true,
            });
            const img = canvas.toDataURL('image/png');
            const w = canvas.width;
            const h = canvas.height;
            const orientation = w >= h ? 'landscape' : 'portrait';
            const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const margin = 18;
            const maxW = pageW - margin * 2;
            const maxH = pageH - margin * 2;
            const scale = Math.min(maxW / w, maxH / h);
            const drawW = w * scale;
            const drawH = h * scale;
            const x = (pageW - drawW) / 2;
            const y = (pageH - drawH) / 2;
            pdf.addImage(img, 'PNG', x, y, drawW, drawH);
            pdf.save(`attendance-dashboard-${from}_${to}.pdf`);
        } finally {
            setExporting(false);
        }
    };

    const shouldHide = !perms?.allowAttendance && !loading;

    const yearLabel = lookupYears.find((y) => y?._id === academicYearId)?.yearName;
    const gradeLabel = lookupGrades.find((g) => g?._id === gradeId)?.gradeName;
    const shiftLabel = lookupShifts.find((s) => s?._id === shiftId)?.shiftName;
    const sectionObj = lookupSections.find((gs) => gs?._id === gradeSectionId);
    const sectionLabel = (() => {
        if (!sectionObj) return '';
        const gName = sectionObj?.grade?.gradeName;
        const sec = sectionObj?.section;
        const sName = sectionObj?.shift?.shiftName;
        const tail = [sName].filter(Boolean).join(' - ');
        return [
            gName ? `${gName}` : null,
            sec ? `${t('common.sectionPrefix')} ${sec}` : null,
            tail ? `(${tail})` : null,
        ].filter(Boolean).join(' - ');
    })();

    const exportFilterSummary = useMemo(() => {
        const parts = [];
        parts.push(`${t('common.range.title')}: ${from} → ${to}`);
        if (academicYearId) parts.push(`${t('common.filters.academicYearShort')}: ${yearLabel || t('common.selected')}`);
        if (gradeId) parts.push(`${t('common.filters.level')}: ${gradeLabel || t('common.selected')}`);
        if (shiftId) parts.push(`${t('common.filters.shift')}: ${shiftLabel || t('common.selected')}`);
        if (gradeSectionId) parts.push(`${t('common.filters.section')}: ${sectionLabel || t('common.selected')}`);
        return parts.join(' • ');
    }, [t, from, to, academicYearId, gradeId, shiftId, gradeSectionId, yearLabel, gradeLabel, shiftLabel, sectionLabel]);

    if (shouldHide) return null;

    const listScrollClassName = exporting
        ? 'p-4 space-y-2'
        : 'p-4 space-y-2 max-h-[420px] overflow-y-auto pr-2';

    return (
        <div className="rounded-2xl border border-(--nb-color-border) bg-(--nb-color-bg-card) shadow-md hover:shadow-lg transition-shadow overflow-hidden">
            <div className="px-5 py-4 bg-(--nb-color-brand) text-white border-b border-white/10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="text-lg font-semibold">{t('teachers.dashboard.attendance.title')}</div>
                    <div className="text-sm text-white/80 mt-1">{t('dashboard.cards.attendance.subtitle')}</div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <ActionButton disabled={exporting || loading || trend.length === 0} onClick={downloadPng} icon={Download} label="PNG" />
                    <ActionButton disabled={exporting || loading || trend.length === 0} onClick={downloadPdf} icon={FileDown} label="PDF" />
                    <ToggleButton active={view === 'status'} onClick={() => setView('status')} icon={BarChart3} label={t('teachers.dashboard.attendance.views.statusTrend')} />
                    <ToggleButton active={view === 'periods'} onClick={() => setView('periods')} icon={Layers} label={t('teachers.dashboard.attendance.views.byPeriods')} />
                    <ToggleButton active={view === 'performance'} onClick={() => setView('performance')} icon={SlidersHorizontal} label={t('teachers.dashboard.attendance.views.performance')} />
                </div>
            </div>

            <div className="p-5 flex flex-col gap-4">
                <div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg) p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="inline-flex items-center gap-2 text-sm font-medium text-(--nb-color-text)">
                            <SlidersHorizontal size={16} />
                            <span>{t('common.filters.title')}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setAcademicYearId('');
                                setGradeId('');
                                setShiftId('');
                                setGradeSectionId('');
                                setRangeTab('last7');
                                setFrom(isoMinusDaysUTC(todayUTC, 6));
                                setTo(todayUTC);
                            }}
                            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg-card) text-(--nb-color-text) hover:bg-(--nb-color-brand-50)"
                            title={t('common.filters.resetTitle')}
                        >
                            <RotateCcw size={14} />
                            {t('common.actions.reset')}
                        </button>
                    </div>

                    <div className="mt-3">
                        <FilterRow className="gap-3" align="end">
                            <FilterItem grow minWidthClass="min-w-40">
                                <AcademicYearSelect
                                    id="dash-att-ay"
                                    name="dash-att-ay"
                                    aria-label={t('common.filters.academicYear')}
                                    value={academicYearId}
                                    onChange={(v) => setAcademicYearId(v)}
                                    placeholder={t('common.filters.academicYear')}
                                    searchable
                                    maxVisible={5}
                                    searchPlaceholder={t('common.searchPlaceholders.academicYears')}
                                    className="w-full"
                                />
                            </FilterItem>

                            <FilterItem grow minWidthClass="min-w-40">
                                <GradeSelect
                                    id="dash-att-grade"
                                    name="dash-att-grade"
                                    aria-label={t('common.filters.level')}
                                    value={gradeId}
                                    onChange={(v) => {
                                        setGradeId(v);
                                        setShiftId('');
                                        setGradeSectionId('');
                                    }}
                                    placeholder={t('common.filters.level')}
                                    className="w-full"
                                />
                            </FilterItem>

                            <FilterItem grow minWidthClass="min-w-36">
                                <ShiftSelect
                                    id="dash-att-shift"
                                    name="dash-att-shift"
                                    aria-label={t('common.filters.shift')}
                                    value={shiftId}
                                    onChange={(v) => {
                                        setShiftId(v);
                                        setGradeSectionId('');
                                    }}
                                    placeholder={t('common.filters.shift')}
                                    className="w-full"
                                />
                            </FilterItem>

                            <FilterItem grow minWidthClass="min-w-56">
                                <GradeSectionSelect
                                    id="dash-att-section"
                                    name="dash-att-section"
                                    aria-label={t('common.filters.section')}
                                    academicYearId={academicYearId}
                                    gradeId={gradeId}
                                    shiftId={shiftId}
                                    value={gradeSectionId}
                                    onChange={(v) => setGradeSectionId(v)}
                                    placeholder={t('common.filters.section')}
                                    toastOnEmpty
                                    toastOnEmptyMessage={t('attendance.marking.errors.noSectionsForSelectedLevelShift')}
                                    toastKeyPrefix="DashboardAttendance"
                                    searchable
                                    maxVisible={6}
                                    searchPlaceholder={t('common.searchPlaceholders.sections')}
                                    className="w-full"
                                />
                            </FilterItem>
                        </FilterRow>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                            <Tabs
                                value={rangeTab}
                                onChange={(v) => setRangeTab(v)}
                                options={[
                                    { value: 'today', label: t('teachers.dashboard.attendance.range.today') },
                                    { value: 'last7', label: t('teachers.dashboard.attendance.range.last7') },
                                    { value: 'custom', label: t('teachers.dashboard.attendance.range.custom') },
                                ]}
                            />
                        </div>
                        <div className="text-xs text-gray-700">
                            <span className="font-medium">{t('dashboard.cards.attendance.kpis.presentPct')}</span>: {Number(performanceAgg.presentPct || 0).toFixed(1)}% •{' '}
                            <span className="font-medium">{t('dashboard.cards.attendance.kpis.days')}</span>: {trend.length}
                        </div>
                    </div>

                    {(sourceAgg.dayPct != null || sourceAgg.lessonPct != null) ? (
                        <div className="mt-2 text-[11px] text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                            {sourceAgg.dayPct != null ? (
                                <span><span className="font-semibold">{t('dashboard.cards.attendance.labels.allDay')}</span>: {sourceAgg.dayPct.toFixed(1)}%</span>
                            ) : null}
                            {sourceAgg.lessonPct != null ? (
                                <span><span className="font-semibold">{t('dashboard.cards.attendance.labels.perPeriod')}</span>: {sourceAgg.lessonPct.toFixed(1)}%</span>
                            ) : null}
                            <span className="text-gray-500">{t('dashboard.cards.attendance.notes.oneRowPerDate')}</span>
                        </div>
                    ) : null}

                    {rangeTab === 'custom' ? (
                        <div className="mt-3 flex flex-wrap items-end gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-600">{t('common.from')}</label>
                                <input
                                    type="date"
                                    className="border rounded px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                                    value={from}
                                    onChange={(e) => setFrom(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-600">{t('common.to')}</label>
                                <input
                                    type="date"
                                    className="border rounded px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                />
                            </div>
                            <div className="text-xs text-gray-500">{t('dashboard.cards.attendance.notes.pickAnyRange')}</div>
                        </div>
                    ) : (
                        <div className="mt-2 text-xs text-gray-600">{t('dashboard.cards.attendance.notes.showsRecords')}</div>
                    )}
                </div>

                <div ref={exportCaptureRef} className="flex flex-col gap-4">
                    {exporting ? (
                        <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="text-sm font-semibold text-gray-900">{t('dashboard.cards.attendance.export.title')}</div>
                            <div className="mt-1 text-xs text-gray-600">{exportFilterSummary}</div>
                        </div>
                    ) : null}

                {isError ? (
                    <Alert variant="danger">{t('dashboard.cards.attendance.errors.loadFailed')}</Alert>
                ) : loading ? (
                    <div className="space-y-2">
                        <UiLoadingState label={t('teachers.dashboard.attendance.loading')} className="border-0 bg-transparent p-0 justify-start" />
                        {Array.from({ length: 6 }).map((_, i) => (
                            <SkeletonRow key={i} />
                        ))}
                    </div>
                ) : trend.length === 0 ? (
                    <div className="text-sm text-gray-600">{t('teachers.dashboard.attendance.noData')}</div>
                ) : view === 'performance' ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="text-sm font-medium text-gray-800">{t('teachers.dashboard.attendance.performance.title')}</div>
                            <div className="text-xs text-gray-500">{t('dashboard.cards.attendance.performance.subtitle')}</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-accent-50) p-3">
                                <div className="text-xs font-semibold text-(--nb-color-brand)">{t('attendance.status.present')}</div>
                                <div className="text-xl font-bold text-(--nb-color-brand) tabular-nums">{Number(performanceAgg.presentPct || 0).toFixed(1)}%</div>
                                <div className="text-[11px] text-(--nb-color-brand)/70">{Number(performanceAgg.totals.present || 0)} / {Number(performanceAgg.total || 0)}</div>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <div className="text-xs font-semibold text-gray-900">{t('teachers.dashboard.attendance.performance.markedDays')}</div>
                                <div className="text-xl font-bold text-gray-900 tabular-nums">{trend.length}</div>
                                <div className="text-[11px] text-gray-600">{t('teachers.dashboard.attendance.performance.markedDaysNote')}</div>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <div className="text-xs font-semibold text-gray-900">{t('dashboard.cards.attendance.performance.totalRecordsTitle')}</div>
                                <div className="text-xl font-bold text-gray-900 tabular-nums">{Number(performanceAgg.total || 0)}</div>
                                <div className="text-[11px] text-gray-600">{t('dashboard.cards.attendance.performance.totalRecordsNote')}</div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                            <div className="px-4 py-2 bg-(--nb-color-brand) text-white flex items-center justify-between gap-3 flex-wrap">
                                <div className="text-sm font-semibold">{t('teachers.dashboard.attendance.performance.statusPercentages')}</div>
                                <div className="text-xs text-white/80">{t('teachers.dashboard.attendance.performance.totalRecords', { count: Number(performanceAgg.total || 0) })}</div>
                            </div>
                            <div className="p-4 space-y-2">
                                {STATUSES
                                    .map((s) => ({ ...s, pct: Number(performanceAgg.pct?.[s.key] || 0) }))
                                    .sort((a, b) => b.pct - a.pct)
                                    .map((s) => (
                                        <PercentBar key={s.key} label={s.label} pct={s.pct} tone={s.bar} />
                                    ))}
                            </div>
                        </div>
                    </div>
                ) : view === 'periods' ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="text-sm font-medium text-gray-800">{t('teachers.dashboard.attendance.byPeriod.title')}</div>
                            <div className="text-xs text-gray-500">{t('dashboard.cards.attendance.byPeriod.subtitle')}</div>
                        </div>

                        <MiniLegend items={STATUSES.map((s) => ({ label: s.label, dot: s.dot }))} />

                        {(() => {
                            const rows = (attendanceByPeriod || [])
                                .filter((r) => String(r?.periodCode || '').toUpperCase() !== 'DAY')
                                .map((r) => {
                                    const periodCode = String(r?.periodCode || '');
                                    const segments = STATUSES.map((s) => ({
                                        key: `${periodCode}__${s.key}`,
                                        label: s.label,
                                        value: Number(r?.[s.key] || 0),
                                        className: s.bar,
                                    }));
                                    return { periodCode, segments };
                                })
                                .filter((r) => r.periodCode);

                            if (rows.length === 0) {
                                return <div className="text-sm text-gray-600">{t('dashboard.cards.attendance.byPeriod.noLessonData')}</div>;
                            }

                            return (
                                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                                    <div className="px-4 py-2 bg-(--nb-color-brand) text-white flex items-center justify-between gap-3 flex-wrap">
                                        <div className="text-sm font-semibold">{t('dashboard.cards.attendance.byPeriod.periodsTitle')}</div>
                                        <div className="text-xs text-white/80">{t('dashboard.cards.attendance.byPeriod.excludesAllDay')}</div>
                                    </div>
                                    <div className={listScrollClassName}>
                                        {rows.map((r) => (
                                            <StackedBar key={r.periodCode} label={r.periodCode} segments={r.segments} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-800">{t('teachers.dashboard.attendance.statusTrend.title')}</div>
                            <div className="text-xs text-gray-500">{t('dashboard.cards.attendance.statusTrend.subtitle')}</div>
                        </div>

                        <MiniLegend items={STATUSES.map((s) => ({ label: s.label, dot: s.dot }))} />

                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                            <div className="px-4 py-2 bg-(--nb-color-brand) text-white flex items-center justify-between gap-3 flex-wrap">
                                <div className="text-sm font-semibold">{t('teachers.dashboard.attendance.statusTrend.dailyTrend')}</div>
                                <div className="text-xs text-white/80">{t('dashboard.cards.attendance.statusTrend.hoverNote')}</div>
                            </div>

                            <div className={listScrollClassName}>
                                {trend.map((r) => (
                                    <StackedBar
                                        key={r.date}
                                        label={
                                            <span className="inline-flex items-center gap-2">
                                                <span className="tabular-nums">{String(r.date).slice(5)}</span>
                                                {r.hasAllDay ? <TinyBadge tone={String(r.preferSource).toUpperCase() === 'DAY' ? 'emerald' : 'gray'}>{t('teachers.dashboard.attendance.badges.allDay')}</TinyBadge> : null}
                                                {r.hasPerPeriod ? <TinyBadge tone={String(r.preferSource).toUpperCase() === 'LESSON' ? 'indigo' : 'gray'}>{t('teachers.dashboard.attendance.badges.period')}</TinyBadge> : null}
                                            </span>
                                        }
                                        segments={STATUSES.map((s) => ({
                                            key: `${r.date}__${s.key}`,
                                            label: s.label,
                                            value: Number(r?.[s.key] || 0),
                                            className: s.bar,
                                        }))}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                        <div className="text-xs text-gray-500">{t('dashboard.cards.attendance.footer.source')}</div>
                        <div className="text-xs text-gray-600">{t('dashboard.cards.attendance.footer.kpisLine')}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
