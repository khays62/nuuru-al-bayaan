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

const ToggleButton = ({ active, onClick, icon: Icon, label }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        `inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition shadow-sm ` +
        (active
          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
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

const HistogramBar = ({ label, value, max }) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-16 text-[11px] text-gray-600 tabular-nums">{label}</div>
      <div className="flex-1">
        <div className="h-3 w-full overflow-hidden rounded bg-gray-100 border border-gray-200">
          <div
            className="h-full bg-indigo-600"
            style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
            title={`${label}: ${value}`}
          />
        </div>
      </div>
      <div className="w-10 text-right text-[11px] text-gray-700 tabular-nums">{value}</div>
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
      <rect x="0" y="0" width={w} height={h} fill="#F9FAFB" rx="10" />

      {/* Y grid + labels */}
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

      {/* Bars */}
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

export default function TeacherResultsChartsCard() {
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
  const assignmentsError = assignmentsQuery.isError ? 'Failed to load teacher assignments.' : '';

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
        sectionNum ? `Sec ${sectionNum}` : null,
        tail ? `(${tail})` : null,
      ].filter(Boolean).join(' - ');
      return { value: String(gs?._id || ''), label: label || gs?.sectionName || 'Section' };
    });
  }, [teacherSections]);

  const subjectOptions = useMemo(() => {
    if (!gradeSectionId) return [];
    const map = new Map();
    for (const a of teacherAssignments || []) {
      if (String(a?.gradeSection?._id || '') !== String(gradeSectionId)) continue;
      const sid = String(a?.subject?._id || '');
      if (!sid) continue;
      if (!map.has(sid)) map.set(sid, String(a?.subject?.subjectName || 'Subject'));
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [teacherAssignments, gradeSectionId]);

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
      if (!ok) throw new Error(err || 'Failed to load summary');
      return data || { results: [], classAverage: 0, subjects: [] };
    },
  });

  const summary = summaryQuery.data || { results: [], classAverage: 0, subjects: [] };
  const loading = summaryQuery.isLoading;
  const error = summaryQuery.isError ? (summaryQuery.error?.message || 'Failed to load summary') : '';

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
        const avg = n ? (sum / n) : 0;
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
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `results_${String(academicYearId || 'ay')}_${String(gradeSectionId || 'section')}_${String(mode)}_${String(mode === 'subject' ? subjectId : examTypeId) || 'filter'}_${String(view)}.png`;
      a.click();
    } catch (e) {
      console.error('PNG download failed:', e);
      alert('Download failed. Please try again.');
    }
  };

  const downloadPdf = async () => {
    const node = chartCaptureRef.current;
    if (!node) return;
    try {
      const canvas = await toCanvas(node, {
        backgroundColor: '#ffffff',
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
      alert('Download failed. Please try again.');
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
    <div className="rounded-2xl border border-indigo-100 bg-white shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <div className="px-5 py-4 bg-gray-900 text-white border-b border-gray-800 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-lg font-semibold">Results</div>
          <div className="text-sm text-white/80 mt-1">Live data (teacher-scoped)</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ActionButton disabled={!canDownload} onClick={downloadPng} icon={Download} label="PNG" />
          <ActionButton disabled={!canDownload} onClick={downloadPdf} icon={FileDown} label="PDF" />
          <ToggleButton
            active={view === 'distribution'}
            onClick={() => setView('distribution')}
            icon={BarChart3}
            label="Distribution"
          />
          <ToggleButton
            active={view === 'top'}
            onClick={() => setView('top')}
            icon={LineChart}
            label="Top students"
          />
          <ToggleButton
            active={view === 'performance'}
            onClick={() => setView('performance')}
            icon={SlidersHorizontal}
            label="Performance"
          />
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-800">
              <SlidersHorizontal size={16} />
              <span>Filters</span>
            </div>
            <div className="text-xs text-gray-500">Teacher modes: Subject / Exam Type</div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Academic Year</div>
              <AcademicYearSelect
                value={academicYearId}
                onChange={(v) => { setAcademicYearId(v); setExamTypeId(''); }}
                placeholder="Select year"
                searchable
                maxVisible={5}
                className="w-full"
              />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Section</div>
              <DropdownSelect
                value={gradeSectionId}
                onChange={setGradeSectionId}
                disabled={!isTeacher || assignmentsLoading || !teacherRef}
                placeholder={assignmentsLoading ? 'Loading…' : 'Select section'}
                options={sectionOptions}
              />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Mode</div>
              <DropdownSelect
                value={mode}
                onChange={(v) => setMode(v || 'subject')}
                options={[
                  { value: 'subject', label: 'Subject' },
                  { value: 'examType', label: 'Exam Type' },
                ]}
              />
            </div>

            {mode === 'subject' ? (
              <div className="lg:col-span-2">
                <div className="text-xs font-medium text-gray-600 mb-1">Subject</div>
                <DropdownSelect
                  value={subjectId}
                  onChange={setSubjectId}
                  disabled={!gradeSectionId || subjectOptions.length === 0}
                  placeholder={gradeSectionId ? 'Select subject' : 'Select section first'}
                  options={subjectOptions}
                />
              </div>
            ) : (
              <div className="lg:col-span-2">
                <div className="text-xs font-medium text-gray-600 mb-1">Exam Type</div>
                <DropdownSelect
                  value={examTypeId}
                  onChange={setExamTypeId}
                  disabled={!gradeSectionId || !academicYearId}
                  placeholder={!academicYearId ? 'Select year first' : 'Select exam type'}
                  options={(examTypes || []).map((et) => ({ value: String(et?._id || ''), label: String(et?.typeName || 'Exam Type') }))}
                />
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-gray-600">{assignmentsError ? assignmentsError : ''}</div>
            <div className="text-xs text-gray-700">
              <span className="font-medium">Class Avg</span>: {Number(summary?.classAverage ?? 0).toFixed?.(2) ?? summary?.classAverage}
            </div>
          </div>
        </div>

        {!isTeacher ? (
          <div className="text-sm text-gray-600">This card is available for teachers only.</div>
        ) : !teacherRef ? (
          <div className="text-sm text-gray-600">No teacherRef found on your account.</div>
        ) : (view === 'performance' && perfError) ? (
          <Alert variant="danger">{perfError}</Alert>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : (view === 'performance' && perfLoading) ? (
          <UiLoadingState label="Loading performance…" className="border-0 bg-transparent p-0 justify-start" />
        ) : loading ? (
          <UiLoadingState label="Loading results…" className="border-0 bg-transparent p-0 justify-start" />
        ) : !canRun ? (
          <div className="text-sm text-gray-600">Select Academic Year + Section + (Subject/Exam Type) to view charts.</div>
        ) : (view === 'performance' && (perf?.rows || []).length === 0) ? (
          <div className="text-sm text-gray-600">No performance data found for the selected filters.</div>
        ) : results.length === 0 ? (
          <div className="text-sm text-gray-600">No exam marks found for the selected filters.</div>
        ) : view === 'performance' ? (
          <div ref={chartCaptureRef} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-2 bg-gray-900 text-white flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm font-semibold">Exam type performance</div>
              <div className="text-xs text-white/80">
                {String((mode === 'subject' && subjectId) ? 'Subject' : 'Overall')} • Template {perf?.templateVersion ? `v${String(perf.templateVersion)}` : '—'}
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-xs text-gray-600">Vertical bars = exam types • Left axis = percentage (avg / maxScore)</div>
              <ExamTypeBarChart rows={perf.rows} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {perf.rows.map((r) => (
                  <div key={r.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <div className="text-xs font-semibold text-gray-900 truncate">{r.label}</div>
                    <div className="text-[11px] text-gray-600">Avg: {Number(r.avg || 0).toFixed(1)} / {Number(r.maxScore || 0).toFixed(0)} ({Number(r.pct || 0).toFixed(1)}%)</div>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-gray-500">Tip: switch Mode=Subject to see performance for a single subject; otherwise it uses Overall.</div>
            </div>
          </div>
        ) : view === 'distribution' ? (
          <div ref={chartCaptureRef} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-2 bg-gray-900 text-white flex items-center justify-between">
              <div className="text-sm font-semibold">Score distribution</div>
              <div className="text-xs text-white/80">Students per range</div>
            </div>
            <div className="p-4 space-y-2">
              {histogram.map((b) => (
                <HistogramBar key={b.label} label={b.label} value={b.value} max={maxBin} />
              ))}
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-800 mt-2">
                KPI idea: <span className="font-medium">Class Avg</span> • <span className="font-medium">Pass %</span> • <span className="font-medium">Top/Bottom</span>
              </div>
            </div>
          </div>
        ) : (
          <div ref={chartCaptureRef} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-2 bg-gray-900 text-white flex items-center justify-between">
              <div className="text-sm font-semibold">Top students</div>
              <div className="text-xs text-white/80">By average</div>
            </div>
            <div className="p-4 space-y-2">
              {topStudents.map((s) => (
                <HistogramBar
                  key={String(s?.studentId || s?._id || s?.fullName || Math.random())}
                  label={String(s?.fullName || '').slice(0, 12) || 'Student'}
                  value={Number(s?.average || 0)}
                  max={topMax}
                />
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-gray-500">Source: Exams summary (teacher-scoped)</div>
          <div className="text-xs text-gray-600">Modes: <span className="font-medium">Subject</span> / <span className="font-medium">Exam Type</span></div>
        </div>
      </div>
    </div>
  );
}
