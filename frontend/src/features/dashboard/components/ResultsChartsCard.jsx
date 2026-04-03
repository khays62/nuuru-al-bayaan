import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Download, FileDown, LineChart, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../../auth/AuthContext';
import Alert from '../../../shared/components/ui/Alert.jsx';
import UiLoadingState from '../../../shared/components/ui/LoadingState.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';

import AcademicYearSelect from '../../lookups/components/AcademicYearSelect.jsx';
import GradeSelect from '../../lookups/components/GradeSelect.jsx';
import ShiftSelect from '../../lookups/components/ShiftSelect.jsx';
import GradeSectionSelect from '../../lookups/components/GradeSectionSelect.jsx';

import { getAcademicYears, getGrades, getShifts } from '../../lookups/api/lookups';
import { listGradeSections, getGradeSectionById } from '../../grades/api/gradeSections';
import { getExamSummaryAbort, getExamTypes } from '../../exams/api/exams';
import { getSessionSignal } from '../../../api/sessionAbort';
import { useI18n } from '../../../i18n/useI18n';

const EMPTY_SUMMARY = { results: [], classAverage: 0, subjects: [] };

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

const HistogramBar = ({ label, value, max, valueLabel }) => {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="flex items-center gap-3">
            <div className="w-16 shrink-0 text-[11px] text-(--nb-color-muted) tabular-nums">{label}</div>
            <div className="flex-1">
                <div className="h-3 w-full overflow-hidden rounded bg-(--nb-color-bg) border border-(--nb-color-border)">
                    <div
                        className="h-full bg-(--nb-color-accent)"
                        style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
                        title={`${label}: ${value}`}
                    />
                </div>
            </div>
            <div className="w-12 text-right text-[11px] text-(--nb-color-text) tabular-nums">{valueLabel ?? value}</div>
        </div>
    );
};

const ExamTypeBarChart = ({ rows }) => {
    const w = 560;
    const h = 220;
    const padL = 42;
    const padR = 12;
    const padT = 14;
    const padB = 46;

    const safe = Array.isArray(rows) ? rows : [];
    const maxY = Math.max(1, ...safe.map((r) => Number(r?.pct || 0)));
    const n = safe.length || 1;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const gap = 8;
    const barW = Math.max(10, (innerW - gap * (n - 1)) / n);

    const y = (v) => padT + (1 - Math.max(0, Math.min(1, v / maxY))) * innerH;
    const y0 = padT + innerH;

    const ticks = 4;
    const tickVals = Array.from({ length: ticks + 1 }, (_, i) => (maxY * i) / ticks);

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56">
            <rect x="0" y="0" width={w} height={h} fill="var(--nb-chart-tooltip-bg)" rx="10" />

            {tickVals.map((tv, idx) => {
                const yy = y(tv);
                return (
                    <g key={`tick-${idx}`}>
                        <line x1={padL} x2={w - padR} y1={yy} y2={yy} stroke="var(--nb-chart-grid)" strokeWidth="1" />
                        <text x={padL - 6} y={yy + 4} textAnchor="end" fontSize="10" fill="var(--nb-chart-axis)">
                            {tv.toFixed(0)}%
                        </text>
                    </g>
                );
            })}

            {safe.map((r, i) => {
                const x = padL + i * (barW + gap);
                const vv = Number(r?.pct || 0);
                const yy = y(vv);
                const hh = Math.max(0, y0 - yy);
                return (
                    <g key={`bar-${String(r.id ?? i)}`}>
                        <rect x={x} y={yy} width={barW} height={hh} rx="6" fill="var(--nb-chart-series-1)" />
                        <text x={x + barW / 2} y={yy - 6} textAnchor="middle" fontSize="10" fill="var(--nb-color-fg)">
                            {Number.isFinite(vv) ? vv.toFixed(0) : 0}%
                        </text>
                        <text x={x + barW / 2} y={h - 22} textAnchor="middle" fontSize="10" fill="var(--nb-color-fg)">
                            {String(r.label || '').slice(0, 10)}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

const fmtNum = (n, digits = 1) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return '-';
    return v.toFixed(digits);
};

export default function ResultsChartsCard() {
    const { t } = useI18n();
    const { auth } = useAuth();
    const role = String(auth?.user?.role || '').toLowerCase();
    const isAdminOrStaff = role === 'admin' || role === 'staff';

    const sessionSignal = useMemo(() => getSessionSignal(), []);

    const [view, setView] = useState('distribution'); // distribution | top | performance

    const [academicYearId, setAcademicYearId] = useState('');
    const [gradeId, setGradeId] = useState('');
    const [shiftId, setShiftId] = useState('');
    const [gradeSectionId, setGradeSectionId] = useState('');

    const [mode, setMode] = useState('overall'); // overall | subject | examType
    const [subjectId, setSubjectId] = useState('');
    const [examTypeId, setExamTypeId] = useState('');

    const exportCaptureRef = useRef(null);
    const [exporting, setExporting] = useState(false);

    // Auto-pick default Academic Year for convenience.
    useEffect(() => {
        let ignore = false;
        (async () => {
            if (!isAdminOrStaff) return;
            if (academicYearId) return;
            try {
                const list = await getAcademicYears();
                const years = Array.isArray(list) ? list : (list?.data || []);
                const first = years?.[0]?._id ? String(years[0]._id) : '';
                if (!ignore && first) setAcademicYearId(first);
            } catch {
                // ignore
            }
        })();
        return () => {
            ignore = true;
        };
    }, [isAdminOrStaff, academicYearId]);

    // Keep mode safe
    useEffect(() => {
        const allowed = new Set(['overall', 'subject', 'examType']);
        if (!allowed.has(String(mode))) setMode('overall');
    }, [mode]);

    // Clear dependent fields
    useEffect(() => {
        setGradeSectionId('');
    }, [gradeId, shiftId]);

    useEffect(() => {
        setSubjectId('');
        setExamTypeId('');
    }, [gradeSectionId, mode]);

    // Lightweight lookup labels for export summary
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
                const res = await listGradeSections({ grade: gradeId, shift: shiftId, limit: 250 });
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

    const gradeSectionDetailQuery = useQuery({
        queryKey: ['gradeSections', 'detail', gradeSectionId],
        enabled: Boolean(isAdminOrStaff && gradeSectionId),
        queryFn: async () => {
            const res = await getGradeSectionById(gradeSectionId);
            if (!res?.ok) throw new Error(res?.error || 'Failed to load class');
            return res?.data;
        },
    });

    const sectionDetail = gradeSectionDetailQuery.data || null;

    const subjectOptions = useMemo(() => {
        const subjects = Array.isArray(sectionDetail?.subjects) ? sectionDetail.subjects : [];
        return subjects
            .map((s) => ({
                value: String(s?._id || ''),
                label: String(s?.subjectName || 'Subject'),
            }))
            .filter((o) => o.value)
            .sort((a, b) => String(a.label).localeCompare(String(b.label)));
    }, [sectionDetail]);

    // Subject filter is optional for admin/staff: we do NOT auto-pick a subject.

    const examTypesQuery = useQuery({
        queryKey: ['exams', 'types', { academicYearId, gradeSectionId }],
        enabled: Boolean(isAdminOrStaff && academicYearId && gradeSectionId),
        queryFn: async () => {
            const list = await getExamTypes({ academicYearId, gradeSectionId });
            return Array.isArray(list) ? list : (list?.data || []);
        },
    });

    const examTypes = useMemo(() => (examTypesQuery.data || []), [examTypesQuery.data]);

    useEffect(() => {
        if (mode !== 'examType') return;
        if (!academicYearId || !gradeSectionId) return;
        if (examTypeId) return;
        if ((examTypes || []).length > 0) setExamTypeId(String(examTypes[0]?._id || ''));
    }, [mode, academicYearId, gradeSectionId, examTypes, examTypeId]);

    const effectiveMode = useMemo(() => {
        if (mode === 'examType') return 'examType';
        if (mode === 'subject' && subjectId) return 'subject';
        return 'overall';
    }, [mode, subjectId]);

    const canRun = Boolean(
        isAdminOrStaff && academicYearId && gradeSectionId &&
        (effectiveMode !== 'examType' || Boolean(examTypeId))
    );

    const summaryParams = useMemo(() => {
        const params = {
            academicYearId,
            gradeSectionId,
            enrollmentStatus: 'active',
            mode: effectiveMode,
        };
        if (effectiveMode === 'subject') params.subjectId = subjectId;
        if (effectiveMode === 'examType') params.examTypeId = examTypeId;
        return params;
    }, [academicYearId, gradeSectionId, effectiveMode, subjectId, examTypeId]);

    const summaryQuery = useQuery({
        queryKey: ['exams', 'summary', summaryParams],
        enabled: Boolean(canRun),
        queryFn: async () => {
            const { ok, data, error } = await getExamSummaryAbort(summaryParams, { signal: sessionSignal });
            if (!ok) throw new Error(error || 'Failed to load summary');
            return data || { results: [], classAverage: 0, subjects: [] };
        },
    });

    const summary = useMemo(() => (summaryQuery.data || EMPTY_SUMMARY), [summaryQuery.data]);
    const loading = summaryQuery.isLoading;
    const error = summaryQuery.isError ? (summaryQuery.error?.message || 'Failed to load summary') : '';

    const perfMode = mode === 'subject' && subjectId ? 'subject' : 'overall';
    const perfSummaryParams = useMemo(() => {
        const params = { academicYearId, gradeSectionId, mode: perfMode };
        if (perfMode === 'subject') params.subjectId = subjectId;
        return params;
    }, [academicYearId, gradeSectionId, perfMode, subjectId]);

    const perfSummaryQuery = useQuery({
        queryKey: ['exams', 'summary', perfSummaryParams],
        enabled: Boolean(view === 'performance' && isAdminOrStaff && academicYearId && gradeSectionId),
        queryFn: async () => {
            const { ok, data, error: errMsg } = await getExamSummaryAbort(perfSummaryParams, { signal: sessionSignal });
            if (!ok) throw new Error(errMsg || 'Failed to load performance');
            return data || { results: [] };
        },
    });

    const perf = useMemo(() => {
        if (view !== 'performance') return { rows: [], templateVersion: null };
        const data = perfSummaryQuery.data || null;
        const results = Array.isArray(data?.results) ? data.results : [];
        const templateVersion = data?.templateVersion ?? null;
        const n = results.length || 0;

        const rows = (examTypes || [])
            .map((et) => {
                const etId = String(et?._id || '');
                if (!etId) return null;
                let sum = 0;
                for (const r of results) sum += Number(r?.examTypeTotals?.[etId] || 0);
                const avg = n ? sum / n : 0;
                const maxScore = Number(et?.maxScore || 0);
                const pct = maxScore > 0 ? (avg / maxScore) * 100 : 0;
                return {
                    id: etId,
                    label: String(et?.typeName || 'Exam'),
                    avg,
                    maxScore,
                    pct,
                    order: Number(et?.order || 0),
                };
            })
            .filter(Boolean)
            .sort((a, b) => (a.order - b.order) || String(a.label).localeCompare(String(b.label)));

        return { rows, templateVersion };
    }, [view, perfSummaryQuery.data, examTypes]);

    const perfLoading = perfSummaryQuery.isLoading || examTypesQuery.isLoading;
    const perfError = perfSummaryQuery.isError ? 'Failed to load performance.' : '';

    const results = useMemo(() => (Array.isArray(summary?.results) ? summary.results : []), [summary]);

    const histogram = useMemo(() => {
        const bins = Array.from({ length: 10 }, (_, i) => ({
            i,
            label: `${i * 10}-${(i + 1) * 10}`,
            value: 0,
        }));
        for (const r of results) {
            const v = Number(r?.average);
            if (!Number.isFinite(v)) continue;
            const idx = Math.max(0, Math.min(9, Math.floor(v / 10)));
            bins[idx].value += 1;
        }
        return bins;
    }, [results]);

    const maxBin = useMemo(() => Math.max(1, ...histogram.map((b) => b.value)), [histogram]);

    const topStudents = useMemo(() => {
        return [...results]
            .filter((r) => Number.isFinite(Number(r?.average)))
            .sort((a, b) => Number(b?.average || 0) - Number(a?.average || 0))
            .slice(0, 10);
    }, [results]);

    const topMax = useMemo(() => Math.max(1, ...topStudents.map((s) => Number(s?.average || 0))), [topStudents]);

    const classAvg = Number(summary?.classAverage ?? 0);
    const passThreshold = 50;
    const passPct = useMemo(() => {
        const n = results.length;
        if (!n) return 0;
        const pass = results.filter((r) => Number(r?.average || 0) >= passThreshold).length;
        return (pass / n) * 100;
    }, [results]);

    const canDownload = useMemo(() => {
        if (exporting) return false;
        if (view === 'performance') {
            if (perfLoading) return false;
            if (perfError) return false;
            return (perf?.rows || []).length > 0;
        }
        if (loading) return false;
        if (error) return false;
        return results.length > 0;
    }, [exporting, view, perfLoading, perfError, perf, loading, error, results]);

    const yearLabel = lookupYears.find((y) => y?._id === academicYearId)?.yearName;
    const gradeLabel = lookupGrades.find((g) => g?._id === gradeId)?.gradeName;
    const shiftLabel = lookupShifts.find((s) => s?._id === shiftId)?.shiftName;

    const sectionObj = lookupSections.find((gs) => gs?._id === gradeSectionId) || sectionDetail;
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

    const subjectLabel = subjectOptions.find((s) => s.value === subjectId)?.label || '';
    const examTypeLabel = (examTypes || []).find((et) => String(et?._id || '') === String(examTypeId || ''))?.typeName || '';

    const subjectsPreview = useMemo(() => {
        const names = (subjectOptions || []).map((s) => String(s?.label || '')).filter(Boolean);
        if (names.length === 0) return '';
        const head = names.slice(0, 6);
        const more = names.length - head.length;
        const base = head.join(', ');
        return more > 0 ? `${base} ${t('common.moreCount', { count: more })}` : base;
    }, [t, subjectOptions]);

    const exportFilterSummary = useMemo(() => {
        const parts = [];
        if (academicYearId) parts.push(`${t('common.filters.academicYearShort')}: ${yearLabel || t('common.selected')}`);
        if (gradeId) parts.push(`${t('common.filters.level')}: ${gradeLabel || t('common.selected')}`);
        if (shiftId) parts.push(`${t('common.filters.shift')}: ${shiftLabel || t('common.selected')}`);
        if (gradeSectionId) parts.push(`${t('common.filters.section')}: ${sectionLabel || t('common.selected')}`);
        parts.push(`${t('teachers.dashboard.results.filters.mode')}: ${
            effectiveMode === 'examType'
                ? t('dashboard.cards.results.modes.examType')
                : (effectiveMode === 'subject'
                    ? t('dashboard.cards.results.modes.subject')
                    : t('dashboard.cards.results.modes.allSubjects'))
        }`);
        if (effectiveMode === 'subject' && subjectId) parts.push(`${t('dashboard.cards.results.labels.subject')}: ${subjectLabel || t('common.selected')}`);
        if (effectiveMode === 'examType' && examTypeId) parts.push(`${t('teachers.dashboard.results.examType')}: ${examTypeLabel || t('common.selected')}`);
        return parts.join(' - ');
    }, [t, academicYearId, gradeId, shiftId, gradeSectionId, yearLabel, gradeLabel, shiftLabel, sectionLabel, effectiveMode, subjectId, examTypeId, subjectLabel, examTypeLabel]);

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
            a.download = `results-dashboard_${String(academicYearId || 'ay')}_${String(gradeSectionId || 'class')}_${String(view)}.png`;
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
            pdf.save(`results-dashboard_${String(academicYearId || 'ay')}_${String(gradeSectionId || 'class')}_${String(view)}.pdf`);
        } finally {
            setExporting(false);
        }
    };

    if (!isAdminOrStaff) return null;

    const listScrollClassName = exporting
        ? 'p-4 space-y-2'
        : 'p-4 space-y-2 max-h-[420px] overflow-y-auto pr-2';

    return (
        <div className="rounded-2xl border border-(--nb-color-border) bg-(--nb-color-bg-card) shadow-md hover:shadow-lg transition-shadow overflow-hidden">
            <div className="px-5 py-4 bg-(--nb-color-brand) text-white border-b border-white/10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="text-lg font-semibold">{t('teachers.dashboard.results.title')}</div>
                    <div className="text-sm text-white/80 mt-1">{t('dashboard.cards.results.subtitle')}</div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <ActionButton disabled={!canDownload} onClick={downloadPng} icon={Download} label="PNG" />
                    <ActionButton disabled={!canDownload} onClick={downloadPdf} icon={FileDown} label="PDF" />
                    <ToggleButton active={view === 'distribution'} onClick={() => setView('distribution')} icon={BarChart3} label={t('teachers.dashboard.results.views.distribution')} />
                    <ToggleButton active={view === 'top'} onClick={() => setView('top')} icon={LineChart} label={t('teachers.dashboard.results.views.topStudents')} />
                    <ToggleButton active={view === 'performance'} onClick={() => setView('performance')} icon={SlidersHorizontal} label={t('teachers.dashboard.results.views.performance')} />
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
                                setMode('overall');
                                setSubjectId('');
                                setExamTypeId('');
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
                                    id="dash-res-ay"
                                    name="dash-res-ay"
                                    aria-label={t('common.filters.academicYear')}
                                    value={academicYearId}
                                    onChange={(v) => {
                                        setAcademicYearId(v);
                                        setExamTypeId('');
                                    }}
                                    placeholder={t('common.filters.academicYear')}
                                    searchable
                                    maxVisible={5}
                                    searchPlaceholder={t('common.searchPlaceholders.academicYears')}
                                    className="w-full"
                                />
                            </FilterItem>

                            <FilterItem grow minWidthClass="min-w-40">
                                <GradeSelect
                                    id="dash-res-grade"
                                    name="dash-res-grade"
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
                                    id="dash-res-shift"
                                    name="dash-res-shift"
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
                                    id="dash-res-section"
                                    name="dash-res-section"
                                    aria-label={t('common.filters.section')}
                                    academicYearId={academicYearId}
                                    gradeId={gradeId}
                                    shiftId={shiftId}
                                    value={gradeSectionId}
                                    onChange={(v) => setGradeSectionId(v)}
                                    placeholder={t('common.filters.section')}
                                    toastOnEmpty
                                    toastOnEmptyMessage={t('attendance.marking.errors.noSectionsForSelectedLevelShift')}
                                    toastKeyPrefix="DashboardResults"
                                    searchable
                                    maxVisible={6}
                                    searchPlaceholder={t('common.searchPlaceholders.sections')}
                                    className="w-full"
                                />
                            </FilterItem>

                            <FilterItem grow minWidthClass="min-w-40">
                                <DropdownSelect
                                    value={mode}
                                    onChange={(v) => setMode(v || 'overall')}
                                    placeholder={t('teachers.dashboard.results.filters.mode')}
                                    options={[
                                        { value: 'overall', label: t('dashboard.cards.results.modes.allSubjects') },
                                        { value: 'subject', label: t('dashboard.cards.results.modes.subject') },
                                        { value: 'examType', label: t('dashboard.cards.results.modes.examType') },
                                    ]}
                                    clearable={false}
                                />
                            </FilterItem>

                            {mode === 'subject' ? (
                                <FilterItem grow minWidthClass="min-w-56">
                                    <DropdownSelect
                                        value={subjectId}
                                        onChange={(v) => {
                                            setSubjectId(v);
                                            if (!v) {
                                                setMode('overall');
                                            }
                                        }}
                                        disabled={!gradeSectionId || subjectOptions.length === 0}
                                        placeholder={gradeSectionId ? t('dashboard.cards.results.placeholders.subjectOptional') : t('dashboard.cards.results.placeholders.selectSectionFirst')}
                                        options={subjectOptions}
                                    />
                                </FilterItem>
                            ) : (
                                <FilterItem grow minWidthClass="min-w-56">
                                    <DropdownSelect
                                        value={examTypeId}
                                        onChange={setExamTypeId}
                                        disabled={!gradeSectionId || !academicYearId}
                                        placeholder={!academicYearId ? t('dashboard.cards.results.placeholders.selectYearFirst') : t('teachers.dashboard.results.examType')}
                                        options={(examTypes || []).map((et) => ({
                                            value: String(et?._id || ''),
                                            label: String(et?.typeName || t('teachers.dashboard.results.examType')),
                                        }))}
                                    />
                                </FilterItem>
                            )}
                        </FilterRow>
                    </div>

                    {mode === 'overall' && gradeSectionId && subjectOptions.length > 0 ? (
                        <div className="mt-2 text-[11px] text-(--nb-color-muted)">
                            {t('dashboard.cards.results.notes.modeTip')}{' '}
                            <span className="font-semibold">{t('teachers.dashboard.results.filters.mode')} = {t('dashboard.cards.results.modes.subject')}</span>{' '}
                            {t('dashboard.cards.results.notes.modeTipTail')}{' '}
                            <span className="font-semibold">{t('dashboard.cards.results.modes.allSubjects')}</span>.
                        </div>
                    ) : null}

                    {gradeSectionId && subjectsPreview ? (
                        <div className="mt-1 text-[11px] text-(--nb-color-muted)">
                            <span className="font-semibold">{t('dashboard.cards.results.labels.subjectsInClass')}</span>: {subjectsPreview}
                        </div>
                    ) : null}

                    <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                        <div className="text-xs text-(--nb-color-muted)">
                            {gradeSectionDetailQuery.isError ? t('dashboard.cards.results.errors.loadClassSubjectsFailed') : null}
                            {!gradeSectionDetailQuery.isError && gradeSectionId ? (
                                <span>
                                    {effectiveMode === 'overall' ? (
                                        <span>
                                            {t('dashboard.cards.results.labels.showing')}{' '}
                                            <span className="font-medium">{t('dashboard.cards.results.modes.allSubjects')}</span>
                                            {subjectOptions.length ? ` (${subjectOptions.length})` : ''}.
                                        </span>
                                    ) : null}
                                </span>
                            ) : null}
                        </div>
                        <div className="text-xs text-(--nb-color-text)">
                            <span className="font-medium">{t('teachers.dashboard.results.kpis.classAvg')}</span>: {fmtNum(classAvg, 2)} -{' '}
                            <span className="font-medium">{t('teachers.dashboard.results.kpis.passPct')}</span> (≥{passThreshold}): {fmtNum(passPct, 1)}%
                        </div>
                    </div>
                </div>

                <div ref={exportCaptureRef} className="flex flex-col gap-4">
                    {exporting ? (
                        <div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) p-3">
                            <div className="text-sm font-semibold text-(--nb-color-text)">{t('dashboard.cards.results.export.title')}</div>
                            <div className="mt-1 text-xs text-(--nb-color-muted)">{exportFilterSummary}</div>
                        </div>
                    ) : null}

                    {!isAdminOrStaff ? (
                        <div className="text-sm text-(--nb-color-muted)">{t('dashboard.cards.results.onlyAdminStaff')}</div>
                    ) : (view === 'performance' && perfError) ? (
                        <Alert variant="danger">{perfError}</Alert>
                    ) : error ? (
                        <Alert variant="danger">{error}</Alert>
                    ) : (view === 'performance' && perfLoading) ? (
                        <UiLoadingState label={t('teachers.dashboard.results.loadingPerformance')} className="border-0 bg-transparent p-0 justify-start" />
                    ) : loading ? (
                        <UiLoadingState label={t('teachers.dashboard.results.loading')} className="border-0 bg-transparent p-0 justify-start" />
                    ) : !canRun ? (
                        <div className="text-sm text-(--nb-color-muted)">{t('dashboard.cards.results.selectFilters')}</div>
                    ) : (view === 'performance' && (perf?.rows || []).length === 0) ? (
                        <div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.results.noPerformanceData')}</div>
                    ) : results.length === 0 ? (
                        <div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.results.noMarks')}</div>
                    ) : view === 'performance' ? (
                        <div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden">
                            <div className="px-4 py-2 bg-(--nb-color-brand) text-white flex items-center justify-between gap-3 flex-wrap">
                                <div className="text-sm font-semibold">{t('teachers.dashboard.results.performance.title')}</div>
                                <div className="text-xs text-white/80">
                                    {String(perfMode === 'subject' ? t('teachers.dashboard.results.performance.subjectMode') : t('teachers.dashboard.results.performance.overallMode'))} - {t('teachers.dashboard.results.performance.template')} {perf?.templateVersion ? `v${String(perf.templateVersion)}` : '-'}
                                </div>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="text-xs text-(--nb-color-muted)">{t('teachers.dashboard.results.performance.help')}</div>
                                <ExamTypeBarChart rows={perf.rows} />
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {perf.rows.map((r) => (
                                        <div key={r.id} className="rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2">
                                            <div className="text-xs font-semibold text-(--nb-color-text) truncate">{r.label}</div>
                                            <div className="text-[11px] text-(--nb-color-muted)">
                                                {t('teachers.dashboard.results.performance.avg')}: {fmtNum(r.avg, 1)} / {fmtNum(r.maxScore, 0)} ({fmtNum(r.pct, 1)}%)
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-[11px] text-(--nb-color-muted)">{t('teachers.dashboard.results.performance.tip')}</div>
                            </div>
                        </div>
                    ) : view === 'distribution' ? (
                        <div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden">
                            <div className="px-4 py-2 bg-(--nb-color-brand) text-white flex items-center justify-between">
                                <div className="text-sm font-semibold">{t('teachers.dashboard.results.distribution.title')}</div>
                                <div className="text-xs text-white/80">{t('teachers.dashboard.results.distribution.subtitle')}</div>
                            </div>
                            <div className="p-4 space-y-2">
                                {histogram.map((b) => (
                                    <HistogramBar key={b.label} label={b.label} value={b.value} max={maxBin} />
                                ))}
                                <div className="rounded-lg border border-(--nb-color-border) bg-(--nb-color-accent-50) px-3 py-2 text-xs text-(--nb-color-brand) mt-2">
                                    {t('dashboard.cards.results.distribution.kpiLine')}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden">
                            <div className="px-4 py-2 bg-(--nb-color-brand) text-white flex items-center justify-between">
                                <div className="text-sm font-semibold">{t('teachers.dashboard.results.top.title')}</div>
                                <div className="text-xs text-white/80">{t('teachers.dashboard.results.top.subtitle')}</div>
                            </div>
                            <div className={listScrollClassName}>
                                {topStudents.map((s) => (
                                    <HistogramBar
                                        key={String(s?.studentId || s?._id || s?.fullName || Math.random())}
                                            label={String(s?.fullName || '').slice(0, 12) || t('teachers.dashboard.results.top.studentFallback')}
                                        value={Number(s?.average || 0)}
                                        valueLabel={fmtNum(Number(s?.average || 0), 1)}
                                        max={topMax}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-2 border-t border-(--nb-color-border) flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs text-(--nb-color-muted)">{t('dashboard.cards.results.footer.source')}</div>
                    <div className="text-xs text-(--nb-color-muted)">
                        {t('teachers.dashboard.results.modesFooter')}{' '}
                        <span className="font-medium">{t('dashboard.cards.results.modes.allSubjects')}</span> /{' '}
                        <span className="font-medium">{t('dashboard.cards.results.modes.subject')}</span> /{' '}
                        <span className="font-medium">{t('dashboard.cards.results.modes.examType')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
