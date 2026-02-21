import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Download, FileDown, LineChart, SlidersHorizontal } from 'lucide-react';
import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../../../auth/AuthContext';
import DropdownSelect from '../../../../shared/components/ui/DropdownSelect.jsx';
import Alert from '../../../../shared/components/ui/Alert.jsx';
import UiLoadingState from '../../../../shared/components/ui/LoadingState.jsx';
import AcademicYearSelect from '../../../lookups/components/AcademicYearSelect';

import { getAcademicYears } from '../../../../api';
import { getAssignments as getTeacherAssignments } from '../../api/teachersApi';
import { getExamSummaryAbort, getExamTypes } from '../../../exams/api/exams';
import { teacherKeys } from '../../queryKeys';
import { getSessionSignal } from '../../../../api/sessionAbort';
import { useI18n } from '../../../../i18n/I18nProvider';

const ToggleButton = ({ active, onClick, icon: Icon, label }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        `inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition shadow-sm ` +
        (active
          ? 'bg-(--nb-color-brand) text-white border-(--nb-color-brand) shadow-sm'
          : 'bg-(--nb-color-bg-card) text-(--nb-color-text) border-(--nb-color-border) hover:bg-(--nb-color-bg) hover:shadow')
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
          : 'bg-(--nb-color-bg-card) text-(--nb-color-text) border-(--nb-color-border) hover:bg-(--nb-color-bg) hover:shadow')
      }
      title={label}
    >
      {Icon ? <Icon size={16} /> : null}
      {label}
    </button>
  );
};

const HistogramBar = ({ label, value, max }) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-16 text-[11px] text-(--nb-color-muted) tabular-nums">{label}</div>
      <div className="flex-1">
        <div className="h-3 w-full overflow-hidden rounded bg-(--nb-color-bg) border border-(--nb-color-border)">
          <div
            className="h-full bg-(--nb-color-accent)"
            style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
            title={`${label}: ${value}`}
          />
        </div>
      </div>
      <div className="w-10 text-right text-[11px] text-(--nb-color-text) tabular-nums">{value}</div>
    </div>
  );
};

const ExamTypeBarChart = ({ rows }) => {
  // rows: [{ id, label, avg, maxScore, pct }]
  const w = 560;
  const h = 220;
  const padL = 42;
  const padR = 12;
  const padT = 14;
  const padB = 46;

  const safe = Array.isArray(rows) ? rows : [];
  const maxY = Math.max(1, ...safe.map(r => Number(r?.pct || 0)));
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
      <rect x="0" y="0" width={w} height={h} fill="var(--nb-color-bg)" rx="10" />

      {/* Y grid + labels */}
      {tickVals.map((tv, idx) => {
        const yy = y(tv);
        return (
          <g key={idx}>
            <line x1={padL} x2={w - padR} y1={yy} y2={yy} stroke="var(--nb-color-border)" strokeWidth="1" />
            <text x={padL - 6} y={yy + 4} textAnchor="end" fontSize="10" fill="var(--nb-color-muted)">
              {tv.toFixed(0)}%
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {safe.map((r, i) => {
        const x = padL + i * (barW + gap);
        const vv = Number(r?.pct || 0);
        const yy = y(vv);
        const hh = Math.max(0, y0 - yy);
        return (
          <g key={r.id || i}>
            <rect x={x} y={yy} width={barW} height={hh} rx="6" fill="var(--nb-color-accent)" />
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

export default function TeacherResultsChartsCard() {
  const { t } = useI18n();
  const { auth } = useAuth();
  const isTeacher = String(auth?.user?.role || '').toLowerCase() === 'teacher';
  const teacherRef = String(auth?.user?.teacherRef || '');

  const [view, setView] = useState('distribution'); // distribution | top | performance

  const [academicYearId, setAcademicYearId] = useState('');
  const [gradeSectionId, setGradeSectionId] = useState('');
  const [mode, setMode] = useState('subject'); // subject | examType
  const [subjectId, setSubjectId] = useState('');
  const [examTypeId, setExamTypeId] = useState('');

  const sessionSignal = useMemo(() => getSessionSignal(), []);
  const chartCaptureRef = useRef(null);

  // Auto-pick a default Academic Year (latest by server sort) so the dashboard always loads.
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!isTeacher) return;
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
    return () => { ignore = true; };
  }, [isTeacher, academicYearId]);

  const assignmentsQuery = useQuery({
    queryKey: teacherKeys.assignments(teacherRef),
    enabled: Boolean(isTeacher && teacherRef),
    queryFn: async () => {
      const res = await getTeacherAssignments(teacherRef, {}, { signal: sessionSignal });
      return Array.isArray(res?.data) ? res.data : [];
    },
  });

  const teacherAssignments = assignmentsQuery.data || [];
  const assignmentsLoading = assignmentsQuery.isLoading;
  const assignmentsError = assignmentsQuery.isError
    ? t('teachers.dashboard.results.assignmentsLoadFailed', { defaultValue: 'Failed to load teacher assignments.' })
    : '';

  const teacherSections = useMemo(() => {
    const unique = [];
    const seen = new Set();
    for (const a of teacherAssignments || []) {
      const gs = a?.gradeSection;
      const id = String(gs?._id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      unique.push(gs);
    }
    return unique;
  }, [teacherAssignments]);

  const sectionOptions = useMemo(() => {
    return (teacherSections || []).map((gs) => {
      const gradeName = gs?.grade?.gradeName;
      const sectionNum = gs?.section;
      const shiftName = gs?.shift?.shiftName;
      const tail = [shiftName].filter(Boolean).join(' - ');
      const label = [
        gradeName ? `${gradeName}` : null,
        sectionNum ? `${t('teachers.dashboard.common.sectionPrefix', { defaultValue: 'Sec' })} ${sectionNum}` : null,
        tail ? `(${tail})` : null,
      ].filter(Boolean).join(' - ');
      return {
        value: String(gs?._id || ''),
        label: label || gs?.sectionName || t('teachers.dashboard.common.section', { defaultValue: 'Section' }),
      };
    });
  }, [teacherSections, t]);

  const subjectOptions = useMemo(() => {
    if (!gradeSectionId) return [];
    const map = new Map();
    for (const a of teacherAssignments || []) {
      if (String(a?.gradeSection?._id || '') !== String(gradeSectionId)) continue;
      const sid = String(a?.subject?._id || '');
      if (!sid) continue;
      if (!map.has(sid)) map.set(sid, String(a?.subject?.subjectName || t('teachers.dashboard.common.subject', { defaultValue: 'Subject' })));
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [teacherAssignments, gradeSectionId, t]);

  // Keep teacher within allowed modes
  useEffect(() => {
    const allowed = new Set(['subject', 'examType']);
    if (!allowed.has(String(mode))) setMode('subject');
  }, [mode]);

  // Clear dependent filters when section/mode changes
  useEffect(() => {
    setSubjectId('');
    setExamTypeId('');
  }, [gradeSectionId, mode]);

  // Auto-pick defaults
  useEffect(() => {
    if (!isTeacher) return;
    if (!gradeSectionId && sectionOptions.length > 0) setGradeSectionId(String(sectionOptions[0].value));
  }, [isTeacher, gradeSectionId, sectionOptions]);

  useEffect(() => {
    if (mode !== 'subject') return;
    if (!gradeSectionId) return;
    if (!subjectId && subjectOptions.length > 0) setSubjectId(String(subjectOptions[0].value));
  }, [mode, gradeSectionId, subjectId, subjectOptions]);

  const examTypesQuery = useQuery({
    queryKey: teacherKeys.examTypes({ academicYearId, gradeSectionId, templateVersion: '' }),
    enabled: Boolean(academicYearId && gradeSectionId),
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

  // Fetch summary
  const canRun = Boolean(
    isTeacher && teacherRef && academicYearId && gradeSectionId &&
    ((mode === 'subject' && subjectId) || (mode === 'examType' && examTypeId))
  );

  const summaryParams = useMemo(() => {
    const params = {
      academicYearId,
      gradeSectionId,
      enrollmentStatus: 'active',
      mode,
    };
    if (mode === 'subject') params.subjectId = subjectId;
    if (mode === 'examType') params.examTypeId = examTypeId;
    return params;
  }, [academicYearId, gradeSectionId, mode, subjectId, examTypeId]);

  const summaryQuery = useQuery({
    queryKey: teacherKeys.examSummary(summaryParams),
    enabled: Boolean(canRun),
    queryFn: async () => {
      const { ok, data, error: err } = await getExamSummaryAbort(summaryParams, { signal: sessionSignal });
      if (!ok) throw new Error(err || t('teachers.dashboard.results.summaryLoadFailed', { defaultValue: 'Failed to load summary' }));
      return data || { results: [], classAverage: 0, subjects: [] };
    },
  });

  const summary = summaryQuery.data || { results: [], classAverage: 0, subjects: [] };
  const loading = summaryQuery.isLoading;
  const error = summaryQuery.isError
    ? (summaryQuery.error?.message || t('teachers.dashboard.results.summaryLoadFailed', { defaultValue: 'Failed to load summary' }))
    : '';

  const perfMode = (mode === 'subject' && subjectId) ? 'subject' : 'overall';
  const perfSummaryParams = useMemo(() => {
    const params = { academicYearId, gradeSectionId, mode: perfMode };
    if (perfMode === 'subject') params.subjectId = subjectId;
    return params;
  }, [academicYearId, gradeSectionId, perfMode, subjectId]);

  const perfSummaryQuery = useQuery({
    queryKey: teacherKeys.examSummary(perfSummaryParams),
    enabled: Boolean(view === 'performance' && isTeacher && academicYearId && gradeSectionId),
    queryFn: async () => {
      const { ok, data, error: errMsg } = await getExamSummaryAbort(perfSummaryParams, { signal: sessionSignal });
      if (!ok) throw new Error(errMsg || t('teachers.dashboard.results.performanceLoadFailed', { defaultValue: 'Failed to load performance' }));
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
        const avg = n ? (sum / n) : 0;
        const maxScore = Number(et?.maxScore || 0);
        const pct = maxScore > 0 ? (avg / maxScore) * 100 : 0;
        return {
          id: etId,
          label: String(et?.typeName || t('teachers.dashboard.results.examFallback', { defaultValue: 'Exam' })),
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
  const perfError = perfSummaryQuery.isError
    ? t('teachers.dashboard.results.performanceLoadFailed', { defaultValue: 'Failed to load performance.' })
    : '';

  const results = useMemo(() => Array.isArray(summary?.results) ? summary.results : [], [summary]);

  const canDownload = useMemo(() => {
    if (view === 'performance') {
      if (perfLoading) return false;
      if (perfError) return false;
      return (perf?.rows || []).length > 0;
    }
    if (loading) return false;
    if (error) return false;
    return results.length > 0;
  }, [view, loading, error, results, perfLoading, perfError, perf]);

  const downloadPng = async () => {
    const node = chartCaptureRef.current;
    if (!node) return;
    try {
      const canvas = await toCanvas(node, {
        backgroundColor: 'var(--nb-color-bg-card)',
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `results_${String(academicYearId || 'ay')}_${String(gradeSectionId || 'section')}_${String(mode)}_${String(mode === 'subject' ? subjectId : examTypeId) || 'filter'}_${String(view)}.png`;
      a.click();
    } catch (e) {
      console.error('PNG download failed:', e);
      alert(t('teachers.dashboard.common.downloadFailed', { defaultValue: 'Download failed. Please try again.' }));
    }
  };

  const downloadPdf = async () => {
    const node = chartCaptureRef.current;
    if (!node) return;
    try {
      const canvas = await toCanvas(node, {
        backgroundColor: 'var(--nb-color-bg-card)',
        pixelRatio: 2,
        cacheBust: true,
      });
      const imgData = canvas.toDataURL('image/png');

      const orientation = canvas.width > canvas.height ? 'l' : 'p';
      const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;

      pdf.addImage(imgData, 'PNG', x, y, w, h);
      pdf.save(`results_${String(academicYearId || 'ay')}_${String(gradeSectionId || 'section')}_${String(mode)}_${String(mode === 'subject' ? subjectId : examTypeId) || 'filter'}_${String(view)}.pdf`);
    } catch (e) {
      console.error('PDF download failed:', e);
      alert(t('teachers.dashboard.common.downloadFailed', { defaultValue: 'Download failed. Please try again.' }));
    }
  };

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
    const list = [...results]
      .filter((r) => Number.isFinite(Number(r?.average)))
      .sort((a, b) => Number(b?.average || 0) - Number(a?.average || 0))
      .slice(0, 10);
    return list;
  }, [results]);

  const topMax = useMemo(() => Math.max(1, ...topStudents.map((s) => Number(s?.average || 0))), [topStudents]);

  return (
    <div className="rounded-2xl border border-(--nb-color-border) bg-(--nb-color-bg-card) shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <div className="px-5 py-4 bg-(--nb-color-brand) text-white border-b border-(--nb-color-brand) flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-lg font-semibold">{t('teachers.dashboard.results.title', { defaultValue: 'Results' })}</div>
          <div className="text-sm text-white/80 mt-1">{t('teachers.dashboard.common.liveTeacherScoped', { defaultValue: 'Live data (teacher-scoped)' })}</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ActionButton disabled={!canDownload} onClick={downloadPng} icon={Download} label={t('teachers.dashboard.common.downloadPng', { defaultValue: 'PNG' })} />
          <ActionButton disabled={!canDownload} onClick={downloadPdf} icon={FileDown} label={t('teachers.dashboard.common.downloadPdf', { defaultValue: 'PDF' })} />
          <ToggleButton
            active={view === 'distribution'}
            onClick={() => setView('distribution')}
            icon={BarChart3}
            label={t('teachers.dashboard.results.views.distribution', { defaultValue: 'Distribution' })}
          />
          <ToggleButton
            active={view === 'top'}
            onClick={() => setView('top')}
            icon={LineChart}
            label={t('teachers.dashboard.results.views.topStudents', { defaultValue: 'Top students' })}
          />
          <ToggleButton
            active={view === 'performance'}
            onClick={() => setView('performance')}
            icon={SlidersHorizontal}
            label={t('teachers.dashboard.results.views.performance', { defaultValue: 'Performance' })}
          />
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">

        <div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg) p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-(--nb-color-text)">
              <SlidersHorizontal size={16} />
              <span>{t('teachers.dashboard.common.filters', { defaultValue: 'Filters' })}</span>
            </div>
            <div className="text-xs text-(--nb-color-muted)">{t('teachers.dashboard.results.modesNote', { defaultValue: 'Teacher modes: Subject / Exam Type' })}</div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <div className="text-xs font-medium text-(--nb-color-muted) mb-1">{t('teachers.dashboard.results.filters.academicYear', { defaultValue: 'Academic Year' })}</div>
              <AcademicYearSelect
                value={academicYearId}
                onChange={(v) => { setAcademicYearId(v); setExamTypeId(''); }}
                placeholder={t('teachers.dashboard.results.filters.selectYear', { defaultValue: 'Select year' })}
                searchable
                maxVisible={5}
                className="w-full"
              />
            </div>
            <div>
              <div className="text-xs font-medium text-(--nb-color-muted) mb-1">{t('teachers.dashboard.common.section', { defaultValue: 'Section' })}</div>
              <DropdownSelect
                value={gradeSectionId}
                onChange={setGradeSectionId}
                disabled={!isTeacher || assignmentsLoading || !teacherRef}
                placeholder={assignmentsLoading ? t('common.loading', { defaultValue: 'Loading…' }) : t('teachers.dashboard.common.selectSection', { defaultValue: 'Select section' })}
                options={sectionOptions}
              />
            </div>
            <div>
              <div className="text-xs font-medium text-(--nb-color-muted) mb-1">{t('teachers.dashboard.results.filters.mode', { defaultValue: 'Mode' })}</div>
              <DropdownSelect
                value={mode}
                onChange={(v) => setMode(v || 'subject')}
                options={[
                  { value: 'subject', label: t('teachers.dashboard.common.subject', { defaultValue: 'Subject' }) },
                  { value: 'examType', label: t('teachers.dashboard.results.examType', { defaultValue: 'Exam Type' }) },
                ]}
              />
            </div>

            {mode === 'subject' ? (
              <div className="lg:col-span-2">
                <div className="text-xs font-medium text-(--nb-color-muted) mb-1">{t('teachers.dashboard.common.subject', { defaultValue: 'Subject' })}</div>
                <DropdownSelect
                  value={subjectId}
                  onChange={setSubjectId}
                  disabled={!gradeSectionId || subjectOptions.length === 0}
                  placeholder={gradeSectionId ? t('teachers.dashboard.common.selectSubject', { defaultValue: 'Select subject' }) : t('teachers.dashboard.common.selectSectionFirst', { defaultValue: 'Select section first' })}
                  options={subjectOptions}
                />
              </div>
            ) : (
              <div className="lg:col-span-2">
                <div className="text-xs font-medium text-(--nb-color-muted) mb-1">{t('teachers.dashboard.results.examType', { defaultValue: 'Exam Type' })}</div>
                <DropdownSelect
                  value={examTypeId}
                  onChange={setExamTypeId}
                  disabled={!gradeSectionId || !academicYearId}
                  placeholder={!academicYearId ? t('teachers.dashboard.results.filters.selectYearFirst', { defaultValue: 'Select year first' }) : t('teachers.dashboard.results.filters.selectExamType', { defaultValue: 'Select exam type' })}
                  options={(examTypes || []).map((et) => ({ value: String(et?._id || ''), label: String(et?.typeName || t('teachers.dashboard.results.examType', { defaultValue: 'Exam Type' })) }))}
                />
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-(--nb-color-muted)">{assignmentsError ? assignmentsError : ''}</div>
            <div className="text-xs text-(--nb-color-text)">
              <span className="font-medium">{t('teachers.dashboard.results.kpis.classAvg', { defaultValue: 'Class Avg' })}</span>: {Number(summary?.classAverage ?? 0).toFixed?.(2) ?? summary?.classAverage}
            </div>
          </div>
        </div>

        {!isTeacher ? (
          <div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.common.teachersOnly', { defaultValue: 'This card is available for teachers only.' })}</div>
        ) : !teacherRef ? (
          <div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.common.noTeacherRef', { defaultValue: 'No teacherRef found on your account.' })}</div>
        ) : (view === 'performance' && perfError) ? (
          <Alert variant="danger">{perfError}</Alert>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : (view === 'performance' && perfLoading) ? (
          <UiLoadingState label={t('teachers.dashboard.results.loadingPerformance', { defaultValue: 'Loading performance…' })} className="border-0 bg-transparent p-0 justify-start" />
        ) : loading ? (
          <UiLoadingState label={t('teachers.dashboard.results.loading', { defaultValue: 'Loading results…' })} className="border-0 bg-transparent p-0 justify-start" />
        ) : !canRun ? (
          <div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.results.selectFilters', { defaultValue: 'Select Academic Year + Section + (Subject/Exam Type) to view charts.' })}</div>
        ) : (view === 'performance' && (perf?.rows || []).length === 0) ? (
          <div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.results.noPerformanceData', { defaultValue: 'No performance data found for the selected filters.' })}</div>
        ) : results.length === 0 ? (
          <div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.results.noMarks', { defaultValue: 'No exam marks found for the selected filters.' })}</div>
        ) : view === 'performance' ? (
          <div ref={chartCaptureRef} className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden">
            <div className="px-4 py-2 bg-(--nb-color-brand) text-white flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm font-semibold">{t('teachers.dashboard.results.performance.title', { defaultValue: 'Exam type performance' })}</div>
              <div className="text-xs text-white/80">
                {t((mode === 'subject' && subjectId) ? 'teachers.dashboard.results.performance.subjectMode' : 'teachers.dashboard.results.performance.overallMode', {
                  defaultValue: (mode === 'subject' && subjectId) ? 'Subject' : 'Overall',
                })} • {t('teachers.dashboard.results.performance.template', { defaultValue: 'Template' })} {perf?.templateVersion ? `v${String(perf.templateVersion)}` : '—'}
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-xs text-(--nb-color-muted)">{t('teachers.dashboard.results.performance.help', { defaultValue: 'Vertical bars = exam types • Left axis = percentage (avg / maxScore)' })}</div>
              <ExamTypeBarChart rows={perf.rows} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {perf.rows.map((r) => (
                  <div key={r.id} className="rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2">
                    <div className="text-xs font-semibold text-(--nb-color-text) truncate">{r.label}</div>
                    <div className="text-[11px] text-(--nb-color-muted)">{t('teachers.dashboard.results.performance.avg', { defaultValue: 'Avg' })}: {Number(r.avg || 0).toFixed(1)} / {Number(r.maxScore || 0).toFixed(0)} ({Number(r.pct || 0).toFixed(1)}%)</div>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-(--nb-color-muted)">{t('teachers.dashboard.results.performance.tip', { defaultValue: 'Tip: switch Mode=Subject to see performance for a single subject; otherwise it uses Overall.' })}</div>
            </div>
          </div>
        ) : view === 'distribution' ? (
          <div ref={chartCaptureRef} className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden">
            <div className="px-4 py-2 bg-(--nb-color-brand) text-white flex items-center justify-between">
              <div className="text-sm font-semibold">{t('teachers.dashboard.results.distribution.title', { defaultValue: 'Score distribution' })}</div>
              <div className="text-xs text-white/80">{t('teachers.dashboard.results.distribution.subtitle', { defaultValue: 'Students per range' })}</div>
            </div>
            <div className="p-4 space-y-2">
              {histogram.map((b) => (
                <HistogramBar key={b.label} label={b.label} value={b.value} max={maxBin} />
              ))}
              <div className="rounded-lg border border-(--nb-color-border) bg-(--nb-color-accent-50) px-3 py-2 text-xs text-(--nb-color-fg) mt-2">
                {t('teachers.dashboard.results.distribution.kpiIdea', { defaultValue: 'KPI idea:' })} <span className="font-medium">{t('teachers.dashboard.results.kpis.classAvg', { defaultValue: 'Class Avg' })}</span> • <span className="font-medium">{t('teachers.dashboard.results.kpis.passPct', { defaultValue: 'Pass %' })}</span> • <span className="font-medium">{t('teachers.dashboard.results.kpis.topBottom', { defaultValue: 'Top/Bottom' })}</span>
              </div>
            </div>
          </div>
        ) : (
          <div ref={chartCaptureRef} className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden">
            <div className="px-4 py-2 bg-(--nb-color-brand) text-white flex items-center justify-between">
              <div className="text-sm font-semibold">{t('teachers.dashboard.results.top.title', { defaultValue: 'Top students' })}</div>
              <div className="text-xs text-white/80">{t('teachers.dashboard.results.top.subtitle', { defaultValue: 'By average' })}</div>
            </div>
            <div className="p-4 space-y-2">
              {topStudents.map((s) => (
                <HistogramBar
                  key={String(s?.studentId || s?._id || s?.fullName || Math.random())}
                  label={String(s?.fullName || '').slice(0, 12) || t('teachers.dashboard.results.studentFallback', { defaultValue: 'Student' })}
                  value={Number(s?.average || 0)}
                  max={topMax}
                />
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-(--nb-color-border) flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-(--nb-color-muted)">{t('teachers.dashboard.results.source', { defaultValue: 'Source: Exams summary (teacher-scoped)' })}</div>
          <div className="text-xs text-(--nb-color-muted)">{t('teachers.dashboard.results.modesFooter', { defaultValue: 'Modes:' })} <span className="font-medium">{t('teachers.dashboard.common.subject', { defaultValue: 'Subject' })}</span> / <span className="font-medium">{t('teachers.dashboard.results.examType', { defaultValue: 'Exam Type' })}</span></div>
        </div>
      </div>
    </div>
  );
}
