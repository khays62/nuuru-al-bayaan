import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Download, FileDown, Layers, SlidersHorizontal } from 'lucide-react';
import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../../../auth/AuthContext';
import DropdownSelect from '../../../../shared/components/ui/DropdownSelect.jsx';

import { getAssignments as getTeacherAssignments } from '../../api/teachersApi';
import { getSlotsWithOptions } from '../../../timetable/api/timetable';
import { getAttendanceReportSummaryWithOptions } from '../../../attendance/api/attendanceReports';
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
          ? 'bg-[color:var(--nb-color-brand)] text-white border-[color:var(--nb-color-brand)] shadow-sm'
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

const MiniLegend = ({ items }) => {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
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
    <div className="w-16 h-3 rounded bg-gray-200" />
    <div className="flex-1 h-3 rounded bg-gray-200" />
    <div className="w-12 h-3 rounded bg-gray-200" />
  </div>
);

const TinyBadge = ({ tone = 'gray', children }) => {
  const tones = {
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
    emerald: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    indigo: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    amber: 'bg-amber-100 text-amber-900 border-amber-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
};

const StackedBar = ({ label, segments, showLabel = true }) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  return (
    <div className="flex items-center gap-3">
      {showLabel ? (
        <div className="w-16 text-[11px] text-gray-600 tabular-nums">{label}</div>
      ) : null}
      <div className="flex-1">
        <div className="h-3 w-full overflow-hidden rounded bg-gray-100 border border-gray-200">
          <div className="flex h-full">
            {segments.map((s) => (
              <div
                key={s.key}
                className={s.className}
                style={{ width: `${Math.max(0, (s.value / total) * 100)}%` }}
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

const PercentBar = ({ label, pct, tone = 'bg-indigo-600' }) => {
  const v = Number(pct || 0);
  const clamped = Math.max(0, Math.min(100, v));
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-[11px] text-gray-600 truncate">{label}</div>
      <div className="flex-1">
        <div className="h-3 w-full overflow-hidden rounded bg-gray-100 border border-gray-200">
          <div className={`h-full ${tone}`} style={{ width: `${Math.max(2, clamped)}%` }} />
        </div>
      </div>
      <div className="w-12 text-right text-[11px] text-gray-700 tabular-nums">{clamped.toFixed(1)}%</div>
    </div>
  );
};

export default function TeacherAttendanceChartsCard() {
  const { auth } = useAuth();
  const isTeacher = String(auth?.user?.role || '').toLowerCase() === 'teacher';
  const teacherRef = String(auth?.user?.teacherRef || '');

  const sessionSignal = useMemo(() => getSessionSignal(), []);

  const [view, setView] = useState('status'); // status | periods | performance

  const todayUTC = useMemo(() => new Date().toISOString().slice(0, 10), []);

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

  const clampRangeToMonth = (fromStr, toStr) => {
    const a = new Date(`${String(fromStr)}T00:00:00.000Z`);
    const b = new Date(`${String(toStr)}T00:00:00.000Z`);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return { from: fromStr, to: toStr };
    if (b < a) return { from: fromStr, to: fromStr };
    const diffDays = Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;
    if (diffDays <= 31) return { from: fromStr, to: toStr };
    const maxTo = new Date(a.getTime() + 30 * 86400000);
    return { from: fromStr, to: maxTo.toISOString().slice(0, 10) };
  };

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

  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const [rangeTab, setRangeTab] = useState('today'); // today | last7 | custom
  const [from, setFrom] = useState(todayUTC);
  const [to, setTo] = useState(todayUTC);

  const subjectSlotsQuery = useQuery({
    queryKey: teacherKeys.subjectSlots({ gradeSectionId: sectionId, subjectId }),
    enabled: Boolean(isTeacher && teacherRef && sectionId && subjectId),
    queryFn: async () => {
      const res = await getSlotsWithOptions(
        { gs: sectionId, subject: subjectId, mine: 1 },
        { signal: sessionSignal }
      );
      return Array.isArray(res?.data) ? res.data : [];
    },
  });

  const subjectSlotsLoading = subjectSlotsQuery.isLoading;
  const subjectPeriodCodes = useMemo(() => {
    const rows = Array.isArray(subjectSlotsQuery.data) ? subjectSlotsQuery.data : [];
    const isBreakSlot = (v) => v === true || v === 'true' || v === 1 || v === '1';
    const codes = Array.from(
      new Set(
        rows
          .filter((s) => !isBreakSlot(s?.isBreak))
          .map((s) => `${String(s?.startTime || '')}-${String(s?.endTime || '')}`)
          .filter(Boolean)
      )
    ).sort((a, b) => String(a).localeCompare(String(b)));
    return codes;
  }, [subjectSlotsQuery.data]);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const chartCaptureRef = useRef(null);

  const STATUSES = useMemo(() => ([
    { key: 'present', label: 'Present', dot: 'bg-emerald-600', bar: 'bg-emerald-600' },
    { key: 'absent', label: 'Absent', dot: 'bg-red-500', bar: 'bg-red-500' },
    { key: 'late', label: 'Late', dot: 'bg-amber-500', bar: 'bg-amber-500' },
    // Use excusedExact to avoid double-counting (backend still provides legacy `excused` aggregate).
    { key: 'excusedExact', label: 'Excused', dot: 'bg-violet-600', bar: 'bg-violet-600' },
    { key: 'sick', label: 'Sick', dot: 'bg-sky-600', bar: 'bg-sky-600' },
    { key: 'medical', label: 'Medical', dot: 'bg-teal-600', bar: 'bg-teal-600' },
    { key: 'family', label: 'Family', dot: 'bg-pink-600', bar: 'bg-pink-600' },
    { key: 'other', label: 'Other', dot: 'bg-gray-600', bar: 'bg-gray-600' },
  ]), []);

  // (assignments are provided by React Query)

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
    if (!sectionId) return [];
    const map = new Map();
    for (const a of teacherAssignments || []) {
      if (String(a?.gradeSection?._id || '') !== String(sectionId)) continue;
      const sid = String(a?.subject?._id || '');
      if (!sid) continue;
      if (!map.has(sid)) map.set(sid, String(a?.subject?.subjectName || 'Subject'));
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [teacherAssignments, sectionId]);

  // Auto-pick defaults when possible.
  useEffect(() => {
    if (!isTeacher) return;
    if (!sectionId && sectionOptions.length > 0) setSectionId(String(sectionOptions[0].value));
  }, [isTeacher, sectionId, sectionOptions]);

  useEffect(() => {
    if (!sectionId) {
      setSubjectId('');
      setReport(null);
      return;
    }
    if (!subjectId) {
      if (subjectOptions.length > 0) setSubjectId(String(subjectOptions[0].value));
      return;
    }
    const ok = subjectOptions.some((s) => String(s.value) === String(subjectId));
    if (!ok) setSubjectId('');
  }, [sectionId, subjectId, subjectOptions]);

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
    const r = clampRangeToMonth(from, to);
    if (r.from !== from) setFrom(r.from);
    if (r.to !== to) setTo(r.to);
  }, [rangeTab, from, to]);

  const canRun = Boolean(isTeacher && teacherRef && sectionId && subjectId && from && to && !subjectSlotsLoading);

  const reportQuery = useQuery({
    queryKey: teacherKeys.attendanceReportSummary({ gradeSectionId: sectionId, from, to }),
    enabled: Boolean(canRun),
    queryFn: async () => {
      const res = await getAttendanceReportSummaryWithOptions(
        {
          gradeSectionId: sectionId,
          from,
          to,
          mode: 'both',
          rosterScope: 'current',
        },
        { signal: sessionSignal }
      );
      return res;
    },
  });

  // Fetch attendance report summary (teacher-scoped filtering is applied client-side using subjectPeriodCodes)
  useEffect(() => {
    setLoading(reportQuery.isLoading);
    setError(reportQuery.isError ? 'Failed to load attendance report.' : '');

    if (!canRun) {
      setReport(null);
      return;
    }

    const res = reportQuery.data;
    if (!res) {
      if (!reportQuery.isLoading) setReport(null);
      return;
    }

    const allowed = new Set((subjectPeriodCodes || []).map(String));
    const filteredLesson = Array.isArray(res?.lesson)
      ? res.lesson.filter((r) => allowed.has(String(r?.periodCode || '')))
      : [];
    setReport({ ...res, lesson: filteredLesson });
  }, [canRun, reportQuery.data, reportQuery.isLoading, reportQuery.isError, subjectPeriodCodes]);

  const aggByDate = (rows) => {
    const map = new Map();
    for (const r of rows || []) {
      const date = String(r?.date || '');
      if (!date) continue;
      if (!map.has(date)) {
        map.set(date, {
          date,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excusedExact: 0,
          sick: 0,
          medical: 0,
          family: 0,
          other: 0,
        });
      }
      const row = map.get(date);
      row.total += Number(r?.total || 0);
      row.present += Number(r?.present || 0);
      row.absent += Number(r?.absent || 0);
      row.late += Number(r?.late || 0);
      row.excusedExact += Number(r?.excusedExact || 0);
      row.sick += Number(r?.sick || 0);
      row.medical += Number(r?.medical || 0);
      row.family += Number(r?.family || 0);
      row.other += Number(r?.other || 0);
    }
    return Array.from(map.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  };

  const trendDayAgg = useMemo(() => {
    const daily = Array.isArray(report?.daily) ? report.daily : [];
    return aggByDate(daily);
  }, [report]);

  const trendPeriodAgg = useMemo(() => {
    const lesson = Array.isArray(report?.lesson) ? report.lesson : [];
    return aggByDate(lesson);
  }, [report]);

  const trendDates = useMemo(() => {
    const set = new Set();
    for (const r of trendDayAgg || []) set.add(String(r?.date || ''));
    for (const r of trendPeriodAgg || []) set.add(String(r?.date || ''));
    return Array.from(set).filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));
  }, [trendDayAgg, trendPeriodAgg]);

  const trendDayByDate = useMemo(() => {
    const m = new Map();
    for (const r of trendDayAgg || []) m.set(String(r?.date || ''), r);
    return m;
  }, [trendDayAgg]);

  const trendLessonByDate = useMemo(() => {
    const m = new Map();
    for (const r of trendPeriodAgg || []) m.set(String(r?.date || ''), r);
    return m;
  }, [trendPeriodAgg]);

  const combinedTrend = useMemo(() => {
    const sumRow = (row) => {
      if (!row) return 0;
      return (
        Number(row.present || 0) +
        Number(row.absent || 0) +
        Number(row.late || 0) +
        Number(row.excusedExact || 0) +
        Number(row.sick || 0) +
        Number(row.medical || 0) +
        Number(row.family || 0) +
        Number(row.other || 0)
      );
    };

    const out = [];
    for (const date of trendDates || []) {
      const dayRow = trendDayByDate.get(date) || null;
      const lessonRow = trendLessonByDate.get(date) || null;
      const dayTotal = sumRow(dayRow);
      const lessonTotal = sumRow(lessonRow);

      if (dayTotal > 0) {
        out.push({ date, source: 'DAY', row: dayRow });
        continue;
      }
      if (lessonTotal > 0) {
        out.push({ date, source: 'PERIOD', row: lessonRow });
      }
    }
    return out;
  }, [trendDates, trendDayByDate, trendLessonByDate]);

  const periodAgg = useMemo(() => {
    const lesson = Array.isArray(report?.lesson) ? report.lesson : [];
    const map = new Map();
    for (const r of lesson) {
      const code = String(r?.periodCode || '');
      if (!code) continue;
      if (!map.has(code)) {
        map.set(code, {
          code,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excusedExact: 0,
          sick: 0,
          medical: 0,
          family: 0,
          other: 0,
        });
      }
      const row = map.get(code);
      row.total += Number(r?.total || 0);
      row.present += Number(r?.present || 0);
      row.absent += Number(r?.absent || 0);
      row.late += Number(r?.late || 0);
      row.excusedExact += Number(r?.excusedExact || 0);
      row.sick += Number(r?.sick || 0);
      row.medical += Number(r?.medical || 0);
      row.family += Number(r?.family || 0);
      row.other += Number(r?.other || 0);
    }
    return Array.from(map.values()).sort((a, b) => String(a.code).localeCompare(String(b.code)));
  }, [report]);

  const performanceAgg = useMemo(() => {
    const totals = {};
    for (const s of STATUSES) totals[s.key] = 0;
    let total = 0;
    for (const it of combinedTrend || []) {
      const row = it?.row || {};
      for (const s of STATUSES) {
        const v = Number(row?.[s.key] || 0);
        totals[s.key] += v;
        total += v;
      }
    }
    const pct = {};
    for (const s of STATUSES) {
      pct[s.key] = total > 0 ? (Number(totals[s.key] || 0) / total) * 100 : 0;
    }
    const presentPct = total > 0 ? (Number(totals.present || 0) / total) * 100 : 0;
    return { totals, total, pct, presentPct };
  }, [combinedTrend, STATUSES]);

  const canDownload = useMemo(() => {
    if (loading) return false;
    if (error) return false;
    if (view === 'status') return combinedTrend.length > 0;
    if (view === 'periods') return periodAgg.length > 0;
    if (view === 'performance') return combinedTrend.length > 0;
    return false;
  }, [loading, error, view, combinedTrend, periodAgg]);

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
      a.download = `attendance_${String(sectionId || 'section')}_${String(subjectId || 'subject')}_${String(from)}_${String(to)}_${String(view)}.png`;
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
      pdf.save(`attendance_${String(sectionId || 'section')}_${String(subjectId || 'subject')}_${String(from)}_${String(to)}_${String(view)}.pdf`);
    } catch (e) {
      console.error('PDF download failed:', e);
      alert('Download failed. Please try again.');
    }
  };

  const kpis = useMemo(() => {
    const pctFor = (rows) => {
      let present = 0;
      let total = 0;
      for (const d of rows || []) {
        present += Number(d.present || 0);
        total += Number(d.total || 0) || (
          Number(d.present || 0) +
          Number(d.absent || 0) +
          Number(d.late || 0) +
          Number(d.excusedExact || 0) +
          Number(d.sick || 0) +
          Number(d.medical || 0) +
          Number(d.family || 0) +
          Number(d.other || 0)
        );
      }
      return total > 0 ? Math.round((present / total) * 1000) / 10 : 0;
    };

    const roster = Number(report?.meta?.rosterCount || 0) || null;
    const dayPct = pctFor(trendDayAgg);
    const periodPct = pctFor(trendPeriodAgg);

    return {
      dayPct,
      periodPct,
      markedDaysDay: trendDayAgg.length,
      markedDaysPeriod: trendPeriodAgg.length,
      roster,
    };
  }, [trendDayAgg, trendPeriodAgg, report]);

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <div className="px-5 py-4 bg-gray-900 text-white border-b border-gray-800 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-lg font-semibold">Attendance</div>
          <div className="text-sm text-white/80 mt-1">Live data (teacher-scoped)</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ActionButton disabled={!canDownload} onClick={downloadPng} icon={Download} label="PNG" />
          <ActionButton disabled={!canDownload} onClick={downloadPdf} icon={FileDown} label="PDF" />
          <ToggleButton
            active={view === 'status'}
            onClick={() => setView('status')}
            icon={BarChart3}
            label="Status trend"
          />
          <ToggleButton
            active={view === 'periods'}
            onClick={() => setView('periods')}
            icon={Layers}
            label="By periods"
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
            <div className="text-xs text-gray-500">Max range: 31 days</div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Section</div>
              <DropdownSelect
                value={sectionId}
                onChange={(v) => { setSectionId(v); setReport(null); }}
                disabled={!isTeacher || assignmentsLoading || !teacherRef}
                placeholder={assignmentsLoading ? 'Loading…' : 'Select section'}
                options={sectionOptions}
              />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Subject</div>
              <DropdownSelect
                value={subjectId}
                onChange={(v) => { setSubjectId(v); setReport(null); }}
                disabled={!sectionId || subjectOptions.length === 0}
                placeholder={sectionId ? 'Select subject' : 'Select section first'}
                options={subjectOptions}
              />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Range</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setRangeTab('today')} className={`px-3 py-2 rounded-lg border text-sm ${rangeTab==='today'?'bg-gray-900 text-white border-gray-900':'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>Today</button>
                <button type="button" onClick={() => setRangeTab('last7')} className={`px-3 py-2 rounded-lg border text-sm ${rangeTab==='last7'?'bg-gray-900 text-white border-gray-900':'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>Last 7</button>
                <button type="button" onClick={() => setRangeTab('custom')} className={`px-3 py-2 rounded-lg border text-sm ${rangeTab==='custom'?'bg-gray-900 text-white border-gray-900':'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>Custom</button>
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Dates</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => { setFrom(e.target.value); setRangeTab('custom'); }}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => { setTo(e.target.value); setRangeTab('custom'); }}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-gray-600">
              {subjectSlotsLoading ? 'Loading timetable periods…' : (subjectId && sectionId && subjectPeriodCodes.length === 0 ? 'No timetable periods for this subject.' : '')}
              {assignmentsError ? ` ${assignmentsError}` : ''}
            </div>
            <div className="text-xs text-gray-700">
              <span className="font-medium">All-day%</span>: {kpis.dayPct}% • <span className="font-medium">Per-period%</span>: {kpis.periodPct}%
              {kpis.roster ? ` • ` : ''}{kpis.roster ? (<><span className="font-medium">Roster</span>: {kpis.roster}</>) : null}
            </div>
          </div>
        </div>

        {!isTeacher ? (
          <div className="text-sm text-gray-600">This card is available for teachers only.</div>
        ) : !teacherRef ? (
          <div className="text-sm text-gray-600">No teacherRef found on your account.</div>
        ) : error ? (
          <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">{error}</div>
        ) : loading ? (
          <div className="space-y-2">
            <div className="text-sm text-gray-600">Loading attendance…</div>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : !canRun ? (
          <div className="text-sm text-gray-600">Select Section + Subject + date range to view charts.</div>
        ) : (trendDates.length === 0) ? (
          <div className="text-sm text-gray-600">No attendance data found for the selected filters.</div>
        ) : view === 'performance' ? (
          <div ref={chartCaptureRef} className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm font-medium text-gray-800">Attendance performance</div>
              <div className="text-xs text-gray-500">Percent breakdown (prefers ALL DAY per date)</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-xs font-semibold text-emerald-900">Present</div>
                <div className="text-xl font-bold text-emerald-900 tabular-nums">{Number(performanceAgg.presentPct || 0).toFixed(1)}%</div>
                <div className="text-[11px] text-emerald-900/70">{Number(performanceAgg.totals.present || 0)} / {Number(performanceAgg.total || 0)}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs font-semibold text-gray-900">Marked days</div>
                <div className="text-xl font-bold text-gray-900 tabular-nums">{combinedTrend.length}</div>
                <div className="text-[11px] text-gray-600">One row per date (DAY else PERIOD)</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs font-semibold text-gray-900">Roster</div>
                <div className="text-xl font-bold text-gray-900 tabular-nums">{Number(kpis.roster || 0) || '—'}</div>
                <div className="text-[11px] text-gray-600">From report meta</div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2 bg-gray-900 text-white flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm font-semibold">Status percentages</div>
                <div className="text-xs text-white/80">Total records: {Number(performanceAgg.total || 0)}</div>
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
        ) : view === 'status' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-800">Attendance status trend</div>
              <div className="text-xs text-gray-500">All-day (DAY) and Per-period (LESSON)</div>
            </div>
            <MiniLegend
              items={STATUSES.map((s) => ({ label: s.label, dot: s.dot }))}
            />

            <div ref={chartCaptureRef} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2 bg-gray-900 text-white flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm font-semibold">Daily trend</div>
                <div className="text-xs text-white/80">One line per date (prefers ALL DAY)</div>
              </div>

              <div className="p-4 space-y-2">
                {combinedTrend.length === 0 ? (
                  <div className="text-sm text-gray-600">No trend rows found.</div>
                ) : (
                  combinedTrend.map(({ date, source, row }) => (
                    <div key={date} className="flex items-start gap-3">
                      <div className="w-16 shrink-0 pt-0.5 text-[11px] text-gray-600 tabular-nums">{String(date).slice(5)}</div>
                      <div className="w-20 shrink-0 pt-0.5">
                        {source === 'DAY' ? <TinyBadge tone="emerald">ALL DAY</TinyBadge> : <TinyBadge tone="indigo">PERIOD</TinyBadge>}
                      </div>
                      <div className="flex-1">
                        <StackedBar
                          label={source}
                          showLabel={false}
                          segments={STATUSES.map((s) => ({
                            key: `${source}__${date}__${s.key}`,
                            label: s.label,
                            value: Number(row?.[s.key] || 0),
                            className: s.bar,
                          }))}
                        />
                      </div>
                    </div>
                  ))
                )}

                {subjectPeriodCodes.length === 0 ? (
                  <div className="text-xs text-gray-500">Note: no timetable periods found for this subject; PERIOD rows may be missing.</div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div ref={chartCaptureRef} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-800">Attendance by period</div>
              <div className="text-xs text-gray-500">Present total</div>
            </div>
            <MiniLegend items={STATUSES.map((s) => ({ label: s.label, dot: s.dot }))} />
            <div className="space-y-2">
              {periodAgg.length === 0 ? (
                <div className="text-sm text-gray-600">No lesson periods found in this range.</div>
              ) : periodAgg.map((p) => (
                <StackedBar
                  key={p.code}
                  label={p.code}
                  segments={STATUSES.map((s) => ({
                    key: `${p.code}__${s.key}`,
                    label: s.label,
                    value: Number(p?.[s.key] || 0),
                    className: s.bar,
                  }))}
                />
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-gray-500">Source: Attendance Reports summary (teacher-scoped)</div>
          <div className="text-xs text-gray-600">
            KPIs: <span className="font-medium">Attendance %</span> • <span className="font-medium">Marked days</span> • <span className="font-medium">Roster</span>
          </div>
        </div>
      </div>
    </div>
  );
}
