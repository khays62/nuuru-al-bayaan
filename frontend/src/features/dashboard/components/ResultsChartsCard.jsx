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

const ToggleButton = ({ active, onClick, icon: Icon, label }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                `inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition shadow-sm ` +
                (active
                    ? 'bg-(--nb-color-brand) text-white border-(--nb-color-brand) shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:shadow')
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
                    ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
                    : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50 hover:shadow')
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
            <div className="w-16 shrink-0 text-[11px] text-gray-600 tabular-nums">{label}</div>
            <div className="flex-1">
                <div className="h-3 w-full overflow-hidden rounded bg-gray-100 border border-gray-200">
                    <div
                        className="h-full bg-indigo-600"
                        style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
                        title={`${label}: ${value}`}
                    />
                </div>
            </div>
            <div className="w-12 text-right text-[11px] text-gray-700 tabular-nums">{valueLabel ?? value}</div>
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
            <rect x="0" y="0" width={w} height={h} fill="#F9FAFB" rx="10" />

            {tickVals.map((tv, idx) => {
                const yy = y(tv);
                return (
                    <g key={idx}>
                        <line x1={padL} x2={w - padR} y1={yy} y2={yy} stroke="#E5E7EB" strokeWidth="1" />
                        <text x={padL - 6} y={yy + 4} textAnchor="end" fontSize="10" fill="#6B7280">
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
                    <g key={r.id || i}>
                        <rect x={x} y={yy} width={barW} height={hh} rx="6" fill="#4F46E5" />
                        <text x={x + barW / 2} y={yy - 6} textAnchor="middle" fontSize="10" fill="#374151">
                            {Number.isFinite(vv) ? vv.toFixed(0) : 0}%
                        </text>
                        <text x={x + barW / 2} y={h - 22} textAnchor="middle" fontSize="10" fill="#374151">
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
    if (!Number.isFinite(v)) return '—';
    return v.toFixed(digits);
};

export default function ResultsChartsCard() {
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

    const examTypes = examTypesQuery.data || [];

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

    const summary = summaryQuery.data || { results: [], classAverage: 0, subjects: [] };
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
            sec ? `Sec ${sec}` : null,
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
        return more > 0 ? `${base} (+${more} more)` : base;
    }, [subjectOptions]);

    const exportFilterSummary = useMemo(() => {
        const parts = [];
        if (academicYearId) parts.push(`AY: ${yearLabel || 'Selected'}`);
        if (gradeId) parts.push(`Level: ${gradeLabel || 'Selected'}`);
        if (shiftId) parts.push(`Shift: ${shiftLabel || 'Selected'}`);
        if (gradeSectionId) parts.push(`Class: ${sectionLabel || 'Selected'}`);
        parts.push(`Mode: ${effectiveMode === 'examType' ? 'Exam Type' : (effectiveMode === 'subject' ? 'Subject' : 'All Subjects')}`);
        if (effectiveMode === 'subject' && subjectId) parts.push(`Subject: ${subjectLabel || 'Selected'}`);
        if (effectiveMode === 'examType' && examTypeId) parts.push(`Exam Type: ${examTypeLabel || 'Selected'}`);
        return parts.join(' • ');
    }, [academicYearId, gradeId, shiftId, gradeSectionId, yearLabel, gradeLabel, shiftLabel, sectionLabel, effectiveMode, subjectId, examTypeId, subjectLabel, examTypeLabel]);

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
        <div className="rounded-2xl border border-indigo-100 bg-white shadow-md hover:shadow-lg transition-shadow overflow-hidden">
            <div className="px-5 py-4 bg-gray-900 text-white border-b border-gray-800 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="text-lg font-semibold">Results</div>
                    <div className="text-sm text-white/80 mt-1">Admin/Staff overview (selected class)</div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <ActionButton disabled={!canDownload} onClick={downloadPng} icon={Download} label="PNG" />
                    <ActionButton disabled={!canDownload} onClick={downloadPdf} icon={FileDown} label="PDF" />
                    <ToggleButton active={view === 'distribution'} onClick={() => setView('distribution')} icon={BarChart3} label="Distribution" />
                    <ToggleButton active={view === 'top'} onClick={() => setView('top')} icon={LineChart} label="Top students" />
                    <ToggleButton active={view === 'performance'} onClick={() => setView('performance')} icon={SlidersHorizontal} label="Performance" />
                </div>
            </div>

            <div className="p-5 flex flex-col gap-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-800">
                            <SlidersHorizontal size={16} />
                            <span>Filters</span>
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
                            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                            title="Reset filters"
                        >
                            <RotateCcw size={14} />
                            Reset
                        </button>
                    </div>

                    <div className="mt-3">
                        <FilterRow className="gap-3" align="end">
                            <FilterItem grow minWidthClass="min-w-40">
                                <AcademicYearSelect
                                    id="dash-res-ay"
                                    name="dash-res-ay"
                                    aria-label="Academic Year"
                                    value={academicYearId}
                                    onChange={(v) => {
                                        setAcademicYearId(v);
                                        setExamTypeId('');
                                    }}
                                    placeholder="Academic Year"
                                    searchable
                                    maxVisible={5}
                                    searchPlaceholder="Search academic years…"
                                    className="w-full"
                                />
                            </FilterItem>

                            <FilterItem grow minWidthClass="min-w-40">
                                <GradeSelect
                                    id="dash-res-grade"
                                    name="dash-res-grade"
                                    aria-label="Level"
                                    value={gradeId}
                                    onChange={(v) => {
                                        setGradeId(v);
                                        setShiftId('');
                                        setGradeSectionId('');
                                    }}
                                    placeholder="Level"
                                    className="w-full"
                                />
                            </FilterItem>

                            <FilterItem grow minWidthClass="min-w-36">
                                <ShiftSelect
                                    id="dash-res-shift"
                                    name="dash-res-shift"
                                    aria-label="Shift"
                                    value={shiftId}
                                    onChange={(v) => {
                                        setShiftId(v);
                                        setGradeSectionId('');
                                    }}
                                    placeholder="Shift"
                                    className="w-full"
                                />
                            </FilterItem>

                            <FilterItem grow minWidthClass="min-w-56">
                                <GradeSectionSelect
                                    id="dash-res-section"
                                    name="dash-res-section"
                                    aria-label="Section"
                                    academicYearId={academicYearId}
                                    gradeId={gradeId}
                                    shiftId={shiftId}
                                    value={gradeSectionId}
                                    onChange={(v) => setGradeSectionId(v)}
                                    placeholder="Section"
                                    toastOnEmpty
                                    toastOnEmptyMessage="No classes (sections) exist for the selected level and shift."
                                    toastKeyPrefix="DashboardResults"
                                    searchable
                                    maxVisible={6}
                                    searchPlaceholder="Search sections…"
                                    className="w-full"
                                />
                            </FilterItem>

                            <FilterItem grow minWidthClass="min-w-40">
                                <DropdownSelect
                                    value={mode}
                                    onChange={(v) => setMode(v || 'overall')}
                                    placeholder="Mode"
                                    options={[
                                        { value: 'overall', label: 'All Subjects' },
                                        { value: 'subject', label: 'Subject' },
                                        { value: 'examType', label: 'Exam Type' },
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
                                        placeholder={gradeSectionId ? 'Subject (optional)' : 'Select section first'}
                                        options={subjectOptions}
                                    />
                                </FilterItem>
                            ) : (
                                <FilterItem grow minWidthClass="min-w-56">
                                    <DropdownSelect
                                        value={examTypeId}
                                        onChange={setExamTypeId}
                                        disabled={!gradeSectionId || !academicYearId}
                                        placeholder={!academicYearId ? 'Select year first' : 'Exam Type'}
                                        options={(examTypes || []).map((et) => ({
                                            value: String(et?._id || ''),
                                            label: String(et?.typeName || 'Exam Type'),
                                        }))}
                                    />
                                </FilterItem>
                            )}
                        </FilterRow>
                    </div>

                    {mode === 'overall' && gradeSectionId && subjectOptions.length > 0 ? (
                        <div className="mt-2 text-[11px] text-gray-600">
                            Tip: switch <span className="font-semibold">Mode = Subject</span> to filter by one subject, or keep <span className="font-semibold">All Subjects</span>.
                        </div>
                    ) : null}

                    {gradeSectionId && subjectsPreview ? (
                        <div className="mt-1 text-[11px] text-gray-600">
                            <span className="font-semibold">Subjects in this class</span>: {subjectsPreview}
                        </div>
                    ) : null}

                    <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                        <div className="text-xs text-gray-600">
                            {gradeSectionDetailQuery.isError ? 'Failed to load class subjects.' : null}
                            {!gradeSectionDetailQuery.isError && gradeSectionId ? (
                                <span>
                                    {effectiveMode === 'overall' ? (
                                        <span>Showing <span className="font-medium">All Subjects</span>{subjectOptions.length ? ` (${subjectOptions.length})` : ''}.</span>
                                    ) : null}
                                </span>
                            ) : null}
                        </div>
                        <div className="text-xs text-gray-700">
                            <span className="font-medium">Class Avg</span>: {fmtNum(classAvg, 2)} •{' '}
                            <span className="font-medium">Pass%</span> (≥{passThreshold}): {fmtNum(passPct, 1)}%
                        </div>
                    </div>
                </div>

                <div ref={exportCaptureRef} className="flex flex-col gap-4">
                    {exporting ? (
                        <div className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="text-sm font-semibold text-gray-900">Results dashboard export</div>
                            <div className="mt-1 text-xs text-gray-600">{exportFilterSummary}</div>
                        </div>
                    ) : null}

                    {!isAdminOrStaff ? (
                        <div className="text-sm text-gray-600">This card is available for admin/staff only.</div>
                    ) : (view === 'performance' && perfError) ? (
                        <Alert variant="danger">{perfError}</Alert>
                    ) : error ? (
                        <Alert variant="danger">{error}</Alert>
                    ) : (view === 'performance' && perfLoading) ? (
                        <UiLoadingState label="Loading performance…" className="border-0 bg-transparent p-0 justify-start" />
                    ) : loading ? (
                        <UiLoadingState label="Loading results…" className="border-0 bg-transparent p-0 justify-start" />
                    ) : !canRun ? (
                        <div className="text-sm text-gray-600">Select Academic Year + Section to view charts. (Subject/Exam Type filters are optional.)</div>
                    ) : (view === 'performance' && (perf?.rows || []).length === 0) ? (
                        <div className="text-sm text-gray-600">No performance data found for the selected filters.</div>
                    ) : results.length === 0 ? (
                        <div className="text-sm text-gray-600">No exam marks found for the selected filters.</div>
                    ) : view === 'performance' ? (
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                            <div className="px-4 py-2 bg-gray-900 text-white flex items-center justify-between gap-3 flex-wrap">
                                <div className="text-sm font-semibold">Exam type performance</div>
                                <div className="text-xs text-white/80">
                                    {String(perfMode === 'subject' ? 'Subject' : 'Overall')} • Template {perf?.templateVersion ? `v${String(perf.templateVersion)}` : '—'}
                                </div>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="text-xs text-gray-600">Vertical bars = exam types • Left axis = percentage (avg / maxScore)</div>
                                <ExamTypeBarChart rows={perf.rows} />
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {perf.rows.map((r) => (
                                        <div key={r.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                                            <div className="text-xs font-semibold text-gray-900 truncate">{r.label}</div>
                                            <div className="text-[11px] text-gray-600">
                                                Avg: {fmtNum(r.avg, 1)} / {fmtNum(r.maxScore, 0)} ({fmtNum(r.pct, 1)}%)
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-[11px] text-gray-500">Tip: Mode=Subject shows performance for a single subject; otherwise it uses Overall.</div>
                            </div>
                        </div>
                    ) : view === 'distribution' ? (
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                            <div className="px-4 py-2 bg-gray-900 text-white flex items-center justify-between">
                                <div className="text-sm font-semibold">Score distribution</div>
                                <div className="text-xs text-white/80">Students per range</div>
                            </div>
                            <div className="p-4 space-y-2">
                                {histogram.map((b) => (
                                    <HistogramBar key={b.label} label={b.label} value={b.value} max={maxBin} />
                                ))}
                                <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-800 mt-2">
                                    KPI: <span className="font-medium">Class Avg</span> • <span className="font-medium">Pass %</span> • <span className="font-medium">Top 10</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                            <div className="px-4 py-2 bg-gray-900 text-white flex items-center justify-between">
                                <div className="text-sm font-semibold">Top students</div>
                                <div className="text-xs text-white/80">By average</div>
                            </div>
                            <div className={listScrollClassName}>
                                {topStudents.map((s) => (
                                    <HistogramBar
                                        key={String(s?.studentId || s?._id || s?.fullName || Math.random())}
                                        label={String(s?.fullName || '').slice(0, 12) || 'Student'}
                                        value={Number(s?.average || 0)}
                                        valueLabel={fmtNum(Number(s?.average || 0), 1)}
                                        max={topMax}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs text-gray-500">Source: Exams summary (admin/staff scope)</div>
                    <div className="text-xs text-gray-600">Modes: <span className="font-medium">All Subjects</span> / <span className="font-medium">Subject</span> / <span className="font-medium">Exam Type</span></div>
                </div>
            </div>
        </div>
    );
}
