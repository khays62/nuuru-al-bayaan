import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Download, FileDown, Layers, SlidersHorizontal } from 'lucide-react';
import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../../../auth/AuthContext';
import DropdownSelect from '../../../../shared/components/ui/DropdownSelect.jsx';
import Alert from '../../../../shared/components/ui/Alert.jsx';
import UiLoadingState from '../../../../shared/components/ui/LoadingState.jsx';
import { useI18n } from '../../../../i18n/useI18n';

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
    emerald: 'bg-(--nb-color-accent-50) text-(--nb-color-fg) border-(--nb-color-border)',
    indigo: 'bg-(--nb-color-brand-50) text-(--nb-color-fg) border-(--nb-color-border)',
    amber: 'bg-(--nb-color-brand-50) text-(--nb-color-fg) border-(--nb-color-border)',
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
        <div className="w-16 text-[11px] text-(--nb-color-muted) tabular-nums">{label}</div>
      ) : null}
      <div className="flex-1">
        <div className="h-3 w-full overflow-hidden rounded bg-(--nb-color-bg) border border-(--nb-color-border)">
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
      <div className="w-12 text-right text-[11px] text-(--nb-color-text) tabular-nums">{total}</div>
    </div>
  );
};

const PercentBar = ({ label, pct, tone = 'bg-(--nb-color-brand)' }) => {
  const v = Number(pct || 0);
  const clamped = Math.max(0, Math.min(100, v));
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 text-[11px] text-(--nb-color-muted) truncate">{label}</div>
      <div className="flex-1">
        <div className="h-3 w-full overflow-hidden rounded bg-(--nb-color-bg) border border-(--nb-color-border)">
          <div className={`h-full ${tone}`} style={{ width: `${Math.max(2, clamped)}%` }} />
        </div>
      </div>
      <div className="w-12 text-right text-[11px] text-(--nb-color-text) tabular-nums">{clamped.toFixed(1)}%</div>
    </div>
  );
};

export default function TeacherAttendanceChartsCard() {
  const { t } = useI18n();
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
  const assignmentsError = assignmentsQuery.isError
    ? t('teachers.dashboard.attendance.assignmentsLoadFailed', { defaultValue: 'Failed to load teacher assignments.' })
    : '';

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
    { key: 'present', label: t('teachers.dashboard.attendance.status.present', { defaultValue: 'Present' }), dot: 'bg-(--nb-color-accent)', bar: 'bg-(--nb-color-accent)' },
    { key: 'absent', label: t('teachers.dashboard.attendance.status.absent', { defaultValue: 'Absent' }), dot: 'bg-(--nb-color-brand) opacity-85', bar: 'bg-(--nb-color-brand) opacity-85' },
    { key: 'late', label: t('teachers.dashboard.attendance.status.late', { defaultValue: 'Late' }), dot: 'bg-(--nb-color-brand) opacity-65', bar: 'bg-(--nb-color-brand) opacity-65' },
    // Use excusedExact to avoid double-counting (backend still provides legacy `excused` aggregate).
    { key: 'excusedExact', label: t('teachers.dashboard.attendance.status.excused', { defaultValue: 'Excused' }), dot: 'bg-(--nb-color-accent) opacity-80', bar: 'bg-(--nb-color-accent) opacity-80' },
    { key: 'sick', label: t('teachers.dashboard.attendance.status.sick', { defaultValue: 'Sick' }), dot: 'bg-(--nb-color-accent) opacity-65', bar: 'bg-(--nb-color-accent) opacity-65' },
    { key: 'medical', label: t('teachers.dashboard.attendance.status.medical', { defaultValue: 'Medical' }), dot: 'bg-(--nb-color-accent) opacity-50', bar: 'bg-(--nb-color-accent) opacity-50' },
    { key: 'family', label: t('teachers.dashboard.attendance.status.family', { defaultValue: 'Family' }), dot: 'bg-(--nb-color-brand) opacity-50', bar: 'bg-(--nb-color-brand) opacity-50' },
    { key: 'other', label: t('teachers.dashboard.attendance.status.other', { defaultValue: 'Other' }), dot: 'bg-(--nb-color-muted)', bar: 'bg-(--nb-color-muted)' },
  ]), [t]);

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
        sectionNum ? `${t('teachers.dashboard.common.sectionPrefix', { defaultValue: 'Sec' })} ${sectionNum}` : null,
        tail ? `(${tail})` : null,
      ].filter(Boolean).join(' - ');
      return { value: String(gs?._id || ''), label: label || gs?.sectionName || t('teachers.dashboard.common.section', { defaultValue: 'Section' }) };
    });
  }, [teacherSections, t]);

  const subjectOptions = useMemo(() => {
    if (!sectionId) return [];
    const map = new Map();
    for (const a of teacherAssignments || []) {
      if (String(a?.gradeSection?._id || '') !== String(sectionId)) continue;
      const sid = String(a?.subject?._id || '');
      if (!sid) continue;
      if (!map.has(sid)) map.set(sid, String(a?.subject?.subjectName || t('teachers.dashboard.common.subject', { defaultValue: 'Subject' })));
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [teacherAssignments, sectionId, t]);

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
    setError(reportQuery.isError ? t('teachers.dashboard.attendance.reportLoadFailed', { defaultValue: 'Failed to load attendance report.' }) : '');

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
        backgroundColor: 'var(--nb-color-bg-card)',
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `attendance_${String(sectionId || 'section')}_${String(subjectId || 'subject')}_${String(from)}_${String(to)}_${String(view)}.png`;
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
      pdf.save(`attendance_${String(sectionId || 'section')}_${String(subjectId || 'subject')}_${String(from)}_${String(to)}_${String(view)}.pdf`);
    } catch (e) {
      console.error('PDF download failed:', e);
      alert(t('teachers.dashboard.common.downloadFailed', { defaultValue: 'Download failed. Please try again.' }));
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
    <div className="rounded-2xl border border-(--nb-color-border) bg-(--nb-color-bg-card) shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <div className="px-5 py-4 bg-(--nb-color-brand) text-white border-b border-(--nb-color-brand) flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-lg font-semibold">{t('teachers.dashboard.attendance.title', { defaultValue: 'Attendance' })}</div>
          <div className="text-sm text-white/80 mt-1">{t('teachers.dashboard.common.liveTeacherScoped', { defaultValue: 'Live data (teacher-scoped)' })}</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ActionButton disabled={!canDownload} onClick={downloadPng} icon={Download} label={t('teachers.dashboard.common.downloadPng', { defaultValue: 'PNG' })} />
          <ActionButton disabled={!canDownload} onClick={downloadPdf} icon={FileDown} label={t('teachers.dashboard.common.downloadPdf', { defaultValue: 'PDF' })} />
          <ToggleButton
            active={view === 'status'}
            onClick={() => setView('status')}
            icon={BarChart3}
            label={t('teachers.dashboard.attendance.views.statusTrend', { defaultValue: 'Status trend' })}
          />
          <ToggleButton
            active={view === 'periods'}
            onClick={() => setView('periods')}
            icon={Layers}
            label={t('teachers.dashboard.attendance.views.byPeriods', { defaultValue: 'By periods' })}
          />
          <ToggleButton
            active={view === 'performance'}
            onClick={() => setView('performance')}
            icon={SlidersHorizontal}
            label={t('teachers.dashboard.attendance.views.performance', { defaultValue: 'Performance' })}
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
            <div className="text-xs text-(--nb-color-muted)">{t('teachers.dashboard.attendance.maxRange', { defaultValue: 'Max range: 31 days' })}</div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <div className="text-xs font-medium text-(--nb-color-muted) mb-1">{t('teachers.dashboard.common.section', { defaultValue: 'Section' })}</div>
              <DropdownSelect
                value={sectionId}
                onChange={(v) => { setSectionId(v); setReport(null); }}
                disabled={!isTeacher || assignmentsLoading || !teacherRef}
                placeholder={assignmentsLoading ? t('common.loading', { defaultValue: 'Loadingâ€¦' }) : t('teachers.dashboard.common.selectSection', { defaultValue: 'Select section' })}
                options={sectionOptions}
              />
            </div>
            <div>
              <div className="text-xs font-medium text-(--nb-color-muted) mb-1">{t('teachers.dashboard.common.subject', { defaultValue: 'Subject' })}</div>
              <DropdownSelect
                value={subjectId}
                onChange={(v) => { setSubjectId(v); setReport(null); }}
                disabled={!sectionId || subjectOptions.length === 0}
                placeholder={sectionId ? t('teachers.dashboard.common.selectSubject', { defaultValue: 'Select subject' }) : t('teachers.dashboard.common.selectSectionFirst', { defaultValue: 'Select section first' })}
                options={subjectOptions}
              />
            </div>
            <div>
              <div className="text-xs font-medium text-(--nb-color-muted) mb-1">{t('teachers.dashboard.attendance.range.title', { defaultValue: 'Range' })}</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setRangeTab('today')} className={`px-3 py-2 rounded-lg border text-sm ${rangeTab==='today'?'bg-(--nb-color-brand) text-white border-(--nb-color-brand)':'bg-(--nb-color-bg-card) text-(--nb-color-text) border-(--nb-color-border) hover:bg-(--nb-color-bg)'}`}>{t('teachers.dashboard.attendance.range.today', { defaultValue: 'Today' })}</button>
                <button type="button" onClick={() => setRangeTab('last7')} className={`px-3 py-2 rounded-lg border text-sm ${rangeTab==='last7'?'bg-(--nb-color-brand) text-white border-(--nb-color-brand)':'bg-(--nb-color-bg-card) text-(--nb-color-text) border-(--nb-color-border) hover:bg-(--nb-color-bg)'}`}>{t('teachers.dashboard.attendance.range.last7', { defaultValue: 'Last 7' })}</button>
                <button type="button" onClick={() => setRangeTab('custom')} className={`px-3 py-2 rounded-lg border text-sm ${rangeTab==='custom'?'bg-(--nb-color-brand) text-white border-(--nb-color-brand)':'bg-(--nb-color-bg-card) text-(--nb-color-text) border-(--nb-color-border) hover:bg-(--nb-color-bg)'}`}>{t('teachers.dashboard.attendance.range.custom', { defaultValue: 'Custom' })}</button>
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-(--nb-color-muted) mb-1">{t('teachers.dashboard.attendance.dates', { defaultValue: 'Dates' })}</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => { setFrom(e.target.value); setRangeTab('custom'); }}
                  className="w-full px-3 py-2 bg-(--nb-color-bg-card) border border-(--nb-color-border) rounded-lg text-sm"
                />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => { setTo(e.target.value); setRangeTab('custom'); }}
                  className="w-full px-3 py-2 bg-(--nb-color-bg-card) border border-(--nb-color-border) rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-(--nb-color-muted)">
              {subjectSlotsLoading ? t('teachers.dashboard.attendance.loadingTimetablePeriods', { defaultValue: 'Loading timetable periodsâ€¦' }) : (subjectId && sectionId && subjectPeriodCodes.length === 0 ? t('teachers.dashboard.attendance.noPeriodsForSubject', { defaultValue: 'No timetable periods for this subject.' }) : '')}
              {assignmentsError ? ` ${assignmentsError}` : ''}
            </div>
            <div className="text-xs text-(--nb-color-text)">
              <span className="font-medium">{t('teachers.dashboard.attendance.kpis.allDayPct', { defaultValue: 'All-day%' })}</span>: {kpis.dayPct}% â€¢ <span className="font-medium">{t('teachers.dashboard.attendance.kpis.perPeriodPct', { defaultValue: 'Per-period%' })}</span>: {kpis.periodPct}%
              {kpis.roster ? ` â€¢ ` : ''}{kpis.roster ? (<><span className="font-medium">{t('teachers.dashboard.attendance.kpis.roster', { defaultValue: 'Roster' })}</span>: {kpis.roster}</>) : null}
            </div>
          </div>
        </div>

        {!isTeacher ? (
          <div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.common.teachersOnly', { defaultValue: 'This card is available for teachers only.' })}</div>
        ) : !teacherRef ? (
          <div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.common.noTeacherRef', { defaultValue: 'No teacherRef found on your account.' })}</div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : loading ? (
          <div className="space-y-2">
            <UiLoadingState label={t('teachers.dashboard.attendance.loading', { defaultValue: 'Loading attendanceâ€¦' })} className="border-0 bg-transparent p-0 justify-start" />
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : !canRun ? (
          <div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.attendance.selectFilters', { defaultValue: 'Select Section + Subject + date range to view charts.' })}</div>
        ) : (trendDates.length === 0) ? (
          <div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.attendance.noData', { defaultValue: 'No attendance data found for the selected filters.' })}</div>
        ) : view === 'performance' ? (
          <div ref={chartCaptureRef} className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm font-medium text-(--nb-color-text)">{t('teachers.dashboard.attendance.performance.title', { defaultValue: 'Attendance performance' })}</div>
              <div className="text-xs text-(--nb-color-muted)">{t('teachers.dashboard.attendance.performance.subtitle', { defaultValue: 'Percent breakdown (prefers ALL DAY per date)' })}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-accent-50) p-3">
                <div className="text-xs font-semibold text-(--nb-color-fg)">{t('teachers.dashboard.attendance.status.present', { defaultValue: 'Present' })}</div>
                <div className="text-xl font-bold text-(--nb-color-fg) tabular-nums">{Number(performanceAgg.presentPct || 0).toFixed(1)}%</div>
                <div className="text-[11px] text-(--nb-color-muted)">{Number(performanceAgg.totals.present || 0)} / {Number(performanceAgg.total || 0)}</div>
              </div>
              <div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg) p-3">
                <div className="text-xs font-semibold text-(--nb-color-text)">{t('teachers.dashboard.attendance.performance.markedDays', { defaultValue: 'Marked days' })}</div>
                <div className="text-xl font-bold text-(--nb-color-text) tabular-nums">{combinedTrend.length}</div>
                <div className="text-[11px] text-(--nb-color-muted)">{t('teachers.dashboard.attendance.performance.markedDaysNote', { defaultValue: 'One row per date (DAY else PERIOD)' })}</div>
              </div>
              <div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg) p-3">
                <div className="text-xs font-semibold text-(--nb-color-text)">{t('teachers.dashboard.attendance.kpis.roster', { defaultValue: 'Roster' })}</div>
                <div className="text-xl font-bold text-(--nb-color-text) tabular-nums">{Number(kpis.roster || 0) || 'â€”'}</div>
                <div className="text-[11px] text-(--nb-color-muted)">{t('teachers.dashboard.attendance.performance.rosterNote', { defaultValue: 'From report meta' })}</div>
              </div>
            </div>

            <div className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden">
              <div className="px-4 py-2 bg-(--nb-color-brand) text-white flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm font-semibold">{t('teachers.dashboard.attendance.performance.statusPercentages', { defaultValue: 'Status percentages' })}</div>
                <div className="text-xs text-white/80">{t('teachers.dashboard.attendance.performance.totalRecords', { defaultValue: 'Total records: {{count}}', count: Number(performanceAgg.total || 0) })}</div>
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
              <div className="text-sm font-medium text-(--nb-color-text)">{t('teachers.dashboard.attendance.statusTrend.title', { defaultValue: 'Attendance status trend' })}</div>
              <div className="text-xs text-(--nb-color-muted)">{t('teachers.dashboard.attendance.statusTrend.subtitle', { defaultValue: 'All-day (DAY) and Per-period (LESSON)' })}</div>
            </div>
            <MiniLegend
              items={STATUSES.map((s) => ({ label: s.label, dot: s.dot }))}
            />

            <div ref={chartCaptureRef} className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden">
              <div className="px-4 py-2 bg-(--nb-color-brand) text-white flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm font-semibold">{t('teachers.dashboard.attendance.statusTrend.dailyTrend', { defaultValue: 'Daily trend' })}</div>
                <div className="text-xs text-white/80">{t('teachers.dashboard.attendance.statusTrend.dailyTrendNote', { defaultValue: 'One line per date (prefers ALL DAY)' })}</div>
              </div>

              <div className="p-4 space-y-2">
                {combinedTrend.length === 0 ? (
                  <div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.attendance.statusTrend.noTrendRows', { defaultValue: 'No trend rows found.' })}</div>
                ) : (
                  combinedTrend.map(({ date, source, row }) => (
                    <div key={date} className="flex items-start gap-3">
                      <div className="w-16 shrink-0 pt-0.5 text-[11px] text-(--nb-color-muted) tabular-nums">{String(date).slice(5)}</div>
                      <div className="w-20 shrink-0 pt-0.5">
                        {source === 'DAY' ? <TinyBadge tone="emerald">{t('teachers.dashboard.attendance.badges.allDay', { defaultValue: 'ALL DAY' })}</TinyBadge> : <TinyBadge tone="indigo">{t('teachers.dashboard.attendance.badges.period', { defaultValue: 'PERIOD' })}</TinyBadge>}
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
                  <div className="text-xs text-(--nb-color-muted)">{t('teachers.dashboard.attendance.statusTrend.noTimetablePeriodsNote', { defaultValue: 'Note: no timetable periods found for this subject; PERIOD rows may be missing.' })}</div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div ref={chartCaptureRef} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-(--nb-color-text)">{t('teachers.dashboard.attendance.byPeriod.title', { defaultValue: 'Attendance by period' })}</div>
              <div className="text-xs text-(--nb-color-muted)">{t('teachers.dashboard.attendance.byPeriod.subtitle', { defaultValue: 'Present total' })}</div>
            </div>
            <MiniLegend items={STATUSES.map((s) => ({ label: s.label, dot: s.dot }))} />
            <div className="space-y-2">
              {periodAgg.length === 0 ? (
                <div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.attendance.byPeriod.empty', { defaultValue: 'No lesson periods found in this range.' })}</div>
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

        <div className="pt-2 border-t border-(--nb-color-border) flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-(--nb-color-muted)">{t('teachers.dashboard.attendance.source', { defaultValue: 'Source: Attendance Reports summary (teacher-scoped)' })}</div>
          <div className="text-xs text-(--nb-color-muted)">
            {t('teachers.dashboard.common.kpis', { defaultValue: 'KPIs' })}: <span className="font-medium">{t('teachers.dashboard.attendance.kpis.attendancePct', { defaultValue: 'Attendance %' })}</span> â€¢ <span className="font-medium">{t('teachers.dashboard.attendance.performance.markedDays', { defaultValue: 'Marked days' })}</span> â€¢ <span className="font-medium">{t('teachers.dashboard.attendance.kpis.roster', { defaultValue: 'Roster' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
