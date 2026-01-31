import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Eye, Printer, RotateCcw } from 'lucide-react';

import { useAuth } from '../../../auth/AuthContext';
import { getAssignments as getTeacherAssignments } from '../../teachers/api/teachersApi';
import { getSlotsWithOptions } from '../../timetable/api/timetable';

import DataToolbar from '../../../shared/components/DataToolbar/DataToolbar.jsx';
import GradeSelect from '../../lookups/components/GradeSelect';
import ShiftSelect from '../../lookups/components/ShiftSelect';
import GradeSectionSelect from '../../lookups/components/GradeSectionSelect';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import FilterDropdownSelect from '../../../shared/components/DataToolbar/FilterDropdownSelect.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import Tabs from '../components/Tabs';
import AttendanceReportTable from '../components/reports/AttendanceReportTable';
import AttendanceStatusBadge from '../components/reports/AttendanceStatusBadge';
import Modal from '../../../shared/components/ui/Modal.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import { PdfDownloadButton, ExcelDownloadButton, CsvDownloadButton, CopyTableButton } from '../../../shared/components/exports/downloadButtons';
import PrintHeader from '../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../shared/components/print/PrintFooter.jsx';

import headerImg from '../../../assets/nuuruBayaanHeader.png';

import { getAttendanceReportDetailsWithOptions, getAttendanceReportSummaryWithOptions } from '../api/attendanceReports';
import { teacherKeys } from '../../teachers/queryKeys.js';
import { on as onEvent, off as offEvent, EVENTS } from '../../../utils/events';

export default function AttendanceReportsPage() {
  const { auth, hasPermission } = useAuth();
  const role = String(auth?.user?.role || '').toLowerCase();
  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';
  const teacherRef = String(auth?.user?.teacherRef || '');

  // Backward compatibility: older setups used `attendance.*` for reports.
  const hasReportsPermission = (action) => {
    if (isAdmin) return true;
    if (isTeacher) return true;
    return Boolean(
      hasPermission('attendanceReports', action) ||
      hasPermission('attendance', action)
    );
  };

  const canPrint = hasReportsPermission('print');
  const canDownload = hasReportsPermission('download');

  const todayUTC = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const dayNameUTC = (isoDateOnly) => {
    const m = String(isoDateOnly || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (Number.isNaN(dt.getTime())) return '';
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return names[dt.getUTCDay()] || '';
  };

  const formatDateWithDay = (isoDateOnly) => {
    const dn = dayNameUTC(isoDateOnly);
    return dn ? `${dn} • ${isoDateOnly}` : String(isoDateOnly || '');
  };

  const statusLabel = (status) => {
    const s = String(status || '').toLowerCase();
    if (!s || s === 'not_marked') return 'Not marked';
    if (s === 'present') return 'Present';
    if (s === 'absent') return 'Absent';
    if (s === 'late') return 'Late';
    if (s === 'excused') return 'Excused';
    if (s === 'sick') return 'Sick';
    if (s === 'medical') return 'Medical';
    if (s === 'family') return 'Family';
    if (s === 'other') return 'Other';
    return s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
  };


  const formatActor = (actor) => {
    if (!actor) return '—';
    const name = String(actor?.name || '').trim() || '—';
    const role = String(actor?.role || '').trim();
    return role ? `${name} (${role})` : name;
  };

  const parseISODateOnlyUTC = (s) => {
    const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(d)) return null;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const fmtISODateOnlyUTC = (dt) => {
    if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return '';
    return dt.toISOString().slice(0, 10);
  };

  const clampRangeToMonth = (fromStr, toStr) => {
    const fromDt = parseISODateOnlyUTC(fromStr);
    const toDt = parseISODateOnlyUTC(toStr);
    if (!fromDt || !toDt) return { from: fromStr, to: toStr, clamped: false };

    // Normalize if user picked a reversed range.
    if (toDt < fromDt) {
      return { from: fromStr, to: fromStr, clamped: true };
    }

    const diffDays = Math.floor((toDt.getTime() - fromDt.getTime()) / 86400000) + 1;
    if (diffDays <= 31) return { from: fromStr, to: toStr, clamped: false };

    const maxTo = new Date(fromDt.getTime() + (30 * 86400000));
    return { from: fromStr, to: fmtISODateOnlyUTC(maxTo), clamped: true };
  };


  const runWithConcurrency = async (taskFactories, limit = 8) => {
    const tasks = Array.isArray(taskFactories) ? taskFactories : [];
    const n = Math.max(1, Number(limit) || 1);
    const results = new Array(tasks.length);
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < tasks.length) {
        const i = nextIndex;
        nextIndex++;
        const fn = tasks[i];
        results[i] = await (typeof fn === 'function' ? fn() : fn);
      }
    };

    const workers = Array.from({ length: Math.min(n, tasks.length) }, () => worker());
    await Promise.all(workers);
    return results;
  };

  const [gradeId, setGradeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const [subjectId, setSubjectId] = useState('');
  const [subjectPeriodCodes, setSubjectPeriodCodes] = useState([]);
  const [subjectSlotsLoading, setSubjectSlotsLoading] = useState(false);
  const subjectSlotsAbortRef = useRef(null);

  // Admin/staff: lookup timetable subject+teacher per (dayOfWeek, periodCode)
  const [sectionSlotInfoByKey, setSectionSlotInfoByKey] = useState({});
  const sectionSlotsAbortRef = useRef(null);
  const sectionSlotsCacheRef = useRef(new Map());
  const noSubjectPeriodsToastKeyRef = useRef('');

  const [teacherSections, setTeacherSections] = useState([]);
  const [teacherSectionsLoading, setTeacherSectionsLoading] = useState(false);
  const [teacherAssignments, setTeacherAssignments] = useState([]);

  const [from, setFrom] = useState(todayUTC);
  const [to, setTo] = useState(todayUTC);

  const [rangeTab, setRangeTab] = useState('today'); // today | last7 | custom

  // Tabs-based UX:
  // - reportType: summary | details
  const [reportType, setReportType] = useState('summary');

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsGrid, setDetailsGrid] = useState(null);

  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [printContext, setPrintContext] = useState(null); // null | 'table' | 'student'
  const [printStudent, setPrintStudent] = useState(null);
  // Roster source for reports
  // - current: active enrollments now
  // - asOf: enrollment membership on the selected date (or overlapping the selected range for summaries)
  const [rosterScope, setRosterScope] = useState('current');

  useEffect(() => {
    if (!isTeacher) return;
    if (rosterScope !== 'current') setRosterScope('current');
  }, [isTeacher, rosterScope]);

  useEffect(() => {
    // For teachers, we now allow Level/Shift filters to narrow assigned sections.
    // No auto-clear here; keep grade/shift usable for teacher filtering.
  }, [isTeacher]);

  const teacherAssignmentsQuery = useQuery({
    queryKey: teacherKeys.assignments(teacherRef),
    enabled: Boolean(isTeacher && teacherRef),
    queryFn: async ({ signal }) => {
      const res = await getTeacherAssignments(teacherRef, {}, { signal });
      return Array.isArray(res?.data) ? res.data : [];
    },
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!isTeacher) {
      setTeacherAssignments([]);
      setTeacherSectionsLoading(false);
      return;
    }
    setTeacherSectionsLoading(teacherAssignmentsQuery.isLoading);
    setTeacherAssignments(Array.isArray(teacherAssignmentsQuery.data) ? teacherAssignmentsQuery.data : []);
  }, [isTeacher, teacherAssignmentsQuery.data, teacherAssignmentsQuery.isLoading]);

  useEffect(() => {
    if (!isTeacher) return;
    const unique = [];
    const seen = new Set();
    for (const a of teacherAssignments || []) {
      const gs = a?.gradeSection;
      const id = String(gs?._id || '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      unique.push(gs);
    }
    setTeacherSections(unique);
  }, [isTeacher, teacherAssignments, teacherSectionsLoading]);

  useEffect(() => {
    if (!isTeacher) return;
    if (!sectionId) return;
    const ok = (teacherSections || []).some((s) => String(s?._id) === String(sectionId));
    if (!ok) setSectionId('');
  }, [isTeacher, sectionId, teacherSections]);

  const teacherSubjectsForSection = useMemo(() => {
    if (!isTeacher) return [];
    if (!sectionId) return [];
    const map = new Map();
    for (const a of (teacherAssignments || [])) {
      if (String(a?.gradeSection?._id || '') !== String(sectionId)) continue;
      const sid = String(a?.subject?._id || '');
      if (!sid) continue;
      if (!map.has(sid)) map.set(sid, String(a?.subject?.subjectName || 'Subject'));
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [isTeacher, teacherAssignments, sectionId]);

  useEffect(() => {
    if (!isTeacher) return;
    if (!sectionId) {
      setSubjectId('');
      return;
    }
    if (!subjectId) {
      if (teacherSubjectsForSection.length === 1) setSubjectId(String(teacherSubjectsForSection[0].value));
      return;
    }
    const ok = teacherSubjectsForSection.some((s) => String(s.value) === String(subjectId));
    if (!ok) setSubjectId('');
  }, [isTeacher, sectionId, subjectId, teacherSubjectsForSection]);

  const subjectSlotsQuery = useQuery({
    queryKey: teacherKeys.subjectSlots({ gradeSectionId: sectionId, subjectId }),
    enabled: Boolean(isTeacher && sectionId && subjectId),
    queryFn: async ({ signal }) => {
      const res = await getSlotsWithOptions({ gs: sectionId, subject: subjectId, mine: 1 }, { signal });
      return Array.isArray(res?.data) ? res.data : [];
    },
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!isTeacher || !sectionId || !subjectId) {
      setSubjectPeriodCodes([]);
      setSubjectSlotsLoading(false);
      return;
    }

    setSubjectSlotsLoading(Boolean(subjectSlotsQuery.isLoading && subjectSlotsQuery.data == null));

    if (subjectSlotsQuery.isError) {
      setSubjectPeriodCodes([]);
      return;
    }

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

    setSubjectPeriodCodes(codes);

    if (codes.length === 0) {
      const toastKey = `no-subject-periods|${String(sectionId)}|${String(subjectId)}|${String(teacherRef)}`;
      if (noSubjectPeriodsToastKeyRef.current !== toastKey) {
        noSubjectPeriodsToastKeyRef.current = toastKey;
        toast.error('No timetable periods found for this subject.');
      }
    }
  }, [isTeacher, sectionId, subjectId, teacherRef, subjectSlotsQuery.data, subjectSlotsQuery.isLoading, subjectSlotsQuery.isError]);

  // Build teacher-assigned filter sets similar to AttendancePage
  const assignedSectionIds = useMemo(() => {
    const set = new Set();
    if (!isTeacher) return set;
    for (const a of (teacherAssignments || [])) {
      if (a?.gradeSection?._id) set.add(String(a.gradeSection._id));
    }
    return set;
  }, [isTeacher, teacherAssignments]);

  const teacherAssignedSections = useMemo(() => {
    if (!isTeacher) return [];
    return (teacherSections || []).filter(gs => assignedSectionIds.has(String(gs?._id)));
  }, [isTeacher, teacherSections, assignedSectionIds]);

  const teacherAssignedGrades = useMemo(() => {
    const map = new Map();
    for (const gs of teacherAssignedSections) {
      const id = String(gs?.grade?._id || '');
      if (!id) continue;
      if (!map.has(id)) map.set(id, gs.grade?.gradeName || '');
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [teacherAssignedSections]);

  const teacherAssignedShifts = useMemo(() => {
    const map = new Map();
    for (const gs of teacherAssignedSections) {
      const id = String(gs?.shift?._id || '');
      if (!id) continue;
      if (!map.has(id)) map.set(id, gs.shift?.shiftName || '');
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [teacherAssignedSections]);

  const teacherFilteredSections = useMemo(() => {
    if (!isTeacher) return teacherSections || [];
    return teacherAssignedSections.filter(gs => {
      const matchGrade = !gradeId || String(gs?.grade?._id) === String(gradeId);
      const matchShift = !shiftId || String(gs?.shift?._id) === String(shiftId);
      return matchGrade && matchShift;
    });
  }, [isTeacher, teacherAssignedSections, teacherSections, gradeId, shiftId]);

  const isSummary = reportType === 'summary';
  const isDetails = reportType === 'details';

  // Enforce max 31-day range.
  useEffect(() => {
    if (!isSummary && !isDetails) return;
    const r = clampRangeToMonth(from, to);
    if (r.clamped && r.to !== to) {
      toast.error('Max range is 1 month. Clamped the end date.');
      setTo(r.to);
    }
  }, [isSummary, isDetails, from, to]);

  const canRun = Boolean(
    sectionId && from && to && (!isTeacher || (subjectId && !subjectSlotsLoading && subjectPeriodCodes.length > 0))
  );

  const [realtimeTick, setRealtimeTick] = useState(0);

  // Live refresh: keep reports synced across browsers/tabs.
  // We don't refactor the report fetching logic here; we just trigger the existing debounced auto-run.
  useEffect(() => {
    const handler = () => {
      // Only refresh when the current selection can run; avoids unnecessary work.
      if (!canRun) return;
      setRealtimeTick((t) => t + 1);
    };

    onEvent(EVENTS.ATTENDANCE_CHANGED, handler);
    // Enrollment & timetable changes can affect roster/period mapping.
    onEvent(EVENTS.STUDENTS_CHANGED, handler);
    onEvent(EVENTS.PROMOTIONS_CHANGED, handler);
    onEvent(EVENTS.TRANSFERS_CHANGED, handler);
    onEvent(EVENTS.TIMETABLE_CHANGED, handler);

    return () => {
      offEvent(EVENTS.ATTENDANCE_CHANGED, handler);
      offEvent(EVENTS.STUDENTS_CHANGED, handler);
      offEvent(EVENTS.PROMOTIONS_CHANGED, handler);
      offEvent(EVENTS.TRANSFERS_CHANGED, handler);
      offEvent(EVENTS.TIMETABLE_CHANGED, handler);
    };
  }, [canRun]);

  const summaryAbortRef = useRef(null);
  const detailsAbortRef = useRef(null);

  const abortInFlight = () => {
    try { summaryAbortRef.current?.abort?.(); } catch { /* ignore */ }
    try { detailsAbortRef.current?.abort?.(); } catch { /* ignore */ }
    try { subjectSlotsAbortRef.current?.abort?.(); } catch { /* ignore */ }
    try { sectionSlotsAbortRef.current?.abort?.(); } catch { /* ignore */ }
  };

  const getTimetableDayIndexFromISODate = (isoDate) => {
    // Timetable uses: 0=Saturday,1=Sunday,2=Monday,3=Tuesday,4=Wednesday,5=Thursday,6=Friday
    // Use UTC to avoid local timezone shifting YYYY-MM-DD.
    const s = String(isoDate || '').trim();
    if (!s) return null;
    const d = new Date(`${s}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return null;
    const js = d.getUTCDay(); // 0=Sunday..6=Saturday
    if (js === 6) return 0; // Saturday
    if (js === 0) return 1; // Sunday
    return js + 1; // Monday..Friday
  };

  // Admin/staff: fetch full timetable slots for the selected section (weekly) so we can display Subject/Teacher per period.
  useEffect(() => {
    const run = async () => {
      if (isTeacher) {
        setSectionSlotInfoByKey({});
        return;
      }
      if (!sectionId) {
        setSectionSlotInfoByKey({});
        return;
      }

      const cacheKey = `gs:${String(sectionId)}`;
      const cached = sectionSlotsCacheRef.current.get(cacheKey);
      if (cached && cached.data && (Date.now() - (cached.at || 0)) < 60_000) {
        setSectionSlotInfoByKey(cached.data);
        return;
      }

      try {
        try { sectionSlotsAbortRef.current?.abort?.(); } catch { /* ignore */ }
        const ac = new AbortController();
        sectionSlotsAbortRef.current = ac;

        const res = await getSlotsWithOptions({ gs: sectionId }, { signal: ac.signal });
        const rows = Array.isArray(res?.data) ? res.data : [];

        const isBreakSlot = (v) => v === true || v === 'true' || v === 1 || v === '1';
        const next = {};
        for (const s of rows) {
          if (isBreakSlot(s?.isBreak)) continue;
          const dow = Number(s?.dayOfWeek);
          if (!Number.isFinite(dow)) continue;
          const startTime = String(s?.startTime || '').trim();
          const endTime = String(s?.endTime || '').trim();
          if (!startTime || !endTime) continue;
          const periodCode = `${startTime}-${endTime}`;

          const subjectName = String(s?.subject?.subjectName || '').trim();
          const teacherName = String(s?.teacher?.fullName || '').trim();
          next[`${dow}__${periodCode}`] = {
            subjectName: subjectName || '—',
            teacherName: teacherName || '—',
          };
        }

        sectionSlotsCacheRef.current.set(cacheKey, { data: next, at: Date.now() });
        setSectionSlotInfoByKey(next);
      } catch (e) {
        if (e?.name === 'AbortError') return;
        setSectionSlotInfoByKey({});
      }
    };
    run();
  }, [isTeacher, sectionId]);

  useEffect(() => {
    const onAfterPrint = () => {
      setPrintContext(null);
      setPrintStudent(null);
    };
    window.addEventListener('afterprint', onAfterPrint);
    return () => window.removeEventListener('afterprint', onAfterPrint);
  }, []);

  const triggerPrint = (ctx, studentRow) => {
    setPrintContext(ctx);
    setPrintStudent(studentRow || null);
    setTimeout(() => window.print(), 50);
  };

  const buildExportPayload = async () => {
    const filenameBase = `attendance_report_${reportType}_${from}_to_${to}`;

    if (isSummary) {
      const headers = summaryColumns.map((c) => String(c.header || c.key || ''));
      const rows = summaryMatrix.rows.map((r) => [
        formatDateWithDay(r.date),
        ...summaryMatrix.periodCodes.map((code) => {
          const c = r.byPeriod?.[code];
          if (!c) return '—';
          const m = c?.markedBy ? formatActor(c.markedBy) : '—';
          const u = c?.updatedBy ? formatActor(c.updatedBy) : '—';
          let subjLine = '';
          let teacherLine = '';
          if (!isTeacher && code !== 'DAY') {
            const dow = getTimetableDayIndexFromISODate(r.date);
            const info = (dow == null) ? null : (sectionSlotInfoByKey?.[`${dow}__${String(code)}`] || null);
            subjLine = `\nSubject: ${info?.subjectName || '—'}`;
            teacherLine = `\nTeacher: ${info?.teacherName || '—'}`;
          }
          return `P:${c.present} A:${c.absent} L:${c.late} E:${c.excused}\nMarked: ${m}\nUpdated: ${u}${subjLine}${teacherLine}`;
        }),
      ]);

      const subtitle = meta
        ? `Range: ${formatDateWithDay(meta.from)} to ${formatDateWithDay(meta.to)} • Roster: ${meta.rosterCount}`
        : `Range: ${formatDateWithDay(from)} to ${formatDateWithDay(to)}`;

      return {
        filename: `${filenameBase}.pdf`,
        title: 'Attendance Report',
        subtitle,
        headerImageSrc: headerImg,
        headers,
        rows,
        sheetName: 'Summary',
      };
    }

    // Details
    const groups = Array.isArray(detailsGrid?.groups) ? detailsGrid.groups : [];
    const flatCols = [];
    for (const g of groups) {
      const periods = Array.isArray(g.periods) ? g.periods : [];
      for (const p of periods) flatCols.push({ date: String(g.date), period: String(p) });
    }

    const headers = [
      'Student ID',
      'Full Name',
      ...flatCols.map((c) => `${formatDateWithDay(c.date)} • ${c.period === 'DAY' ? 'All day' : c.period}`),
    ];

    const rows = (Array.isArray(detailsGrid?.rows) ? detailsGrid.rows : []).map((r) => {
      const cells = flatCols.map((c) => {
        const key = `${c.date}__${c.period}`;
        const status = r?.byCell?.[key]?.status || 'not_marked';
        return statusLabel(status);
      });
      return [r.studentId, r.fullName, ...cells];
    });

    const m = detailsGrid?.meta;
    const subtitle = m
      ? `Range: ${formatDateWithDay(m.from)} to ${formatDateWithDay(m.to)}`
      : `Range: ${formatDateWithDay(from)} to ${formatDateWithDay(to)}`;

    return {
      filename: `${filenameBase}.pdf`,
      title: 'Attendance Report',
      subtitle,
      headerImageSrc: headerImg,
      headers,
      rows,
      sheetName: 'Details',
    };
  };

  const prevGradeIdRef = useRef('');
  const prevShiftIdRef = useRef('');
  const prevSectionIdRef = useRef('');

  const clearOutputs = () => {
    setReport(null);
    setDetailsGrid(null);
    setSelectedStudent(null);
    setStudentModalOpen(false);
  };

  const resetAll = () => {
    setGradeId('');
    setShiftId('');
    setSectionId('');
    setSubjectId('');
    setFrom(todayUTC);
    setTo(todayUTC);
    setRangeTab('today');
    setReportType('summary');
    setReport(null);
    setDetailsGrid(null);
    setRosterScope('current');
    setSelectedStudent(null);
    setStudentModalOpen(false);
  };

  async function runSummary() {
    if (!sectionId || !from || !to || (isTeacher && !subjectId)) {
      toast.error(isTeacher ? 'Please select Section, Subject, and date range' : 'Please select Level, Shift, Section, and date range');
      return;
    }

    if (isTeacher && (!subjectPeriodCodes || subjectPeriodCodes.length === 0)) {
      toast.error('No timetable periods found for this subject.');
      return;
    }

    setLoading(true);
    try {
      if (summaryAbortRef.current) summaryAbortRef.current.abort();
      const ac = new AbortController();
      summaryAbortRef.current = ac;

      const res = await getAttendanceReportSummaryWithOptions({
        gradeSectionId: sectionId,
        from,
        to,
        mode: 'both',
        rosterScope,
      }, { signal: ac.signal });

      if (isTeacher) {
        const allowed = new Set((subjectPeriodCodes || []).map(String));
        const filteredLesson = Array.isArray(res?.lesson)
          ? res.lesson.filter((r) => allowed.has(String(r?.periodCode || '')))
          : [];
        setReport({ ...res, lesson: filteredLesson });
      } else {
        setReport(res);
      }
    } catch (e) {
      if (e?.name === 'AbortError') return;
      toast.error(e?.data?.message || e?.message || 'Failed to load report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }


  // Clear downstream selects when upstream filters change (mirrors AttendancePage)
  useEffect(() => {
    const prev = prevGradeIdRef.current;
    if (prev !== '' && prev !== gradeId) {
      setShiftId('');
      setSectionId('');
      clearOutputs();
    }
    prevGradeIdRef.current = gradeId;
  }, [gradeId]);

  useEffect(() => {
    const prev = prevShiftIdRef.current;
    if (prev !== '' && prev !== shiftId) {
      setSectionId('');
      clearOutputs();
    }
    prevShiftIdRef.current = shiftId;
  }, [shiftId]);

  useEffect(() => {
    const prev = prevSectionIdRef.current;
    if (prev !== '' && prev !== sectionId) {
      clearOutputs();
    }
    prevSectionIdRef.current = sectionId;
  }, [sectionId]);

  useEffect(() => {
    if (!isTeacher) return;
    if (!subjectId) {
      clearOutputs();
      return;
    }
    clearOutputs();
  }, [isTeacher, subjectId]);

  async function runDetailsRange() {
    if (!sectionId || !from || !to) return;
    if (isTeacher && !subjectId) return;
    if (isTeacher && (!subjectPeriodCodes || subjectPeriodCodes.length === 0)) return;

    setDetailsLoading(true);
    try {
      if (detailsAbortRef.current) detailsAbortRef.current.abort();
      const ac = new AbortController();
      detailsAbortRef.current = ac;

      const clamped = clampRangeToMonth(from, to);
      const rangeFrom = clamped.from;
      const rangeTo = clamped.to;

      // Fast path: use ONE summary request to discover which dates exist and which periodCodes exist per date.
      // This avoids calling attendance meta per day (which was slow).
      const summaryRes = await getAttendanceReportSummaryWithOptions({
        gradeSectionId: sectionId,
        from: rangeFrom,
        to: rangeTo,
        mode: 'both',
        rosterScope,
      }, { signal: ac.signal });

      const daily = Array.isArray(summaryRes?.daily) ? summaryRes.daily : [];
      let lesson = Array.isArray(summaryRes?.lesson) ? summaryRes.lesson : [];

      if (isTeacher) {
        const allowed = new Set((subjectPeriodCodes || []).map(String));
        lesson = lesson.filter((r) => allowed.has(String(r?.periodCode || '')));
      }

      const dailyDates = new Set(daily.map(r => String(r?.date || '')).filter(Boolean));
      const lessonByDate = new Map();
      for (const r of lesson) {
        const d = String(r?.date || '');
        const p = String(r?.periodCode || '');
        if (!d || !p) continue;
        if (!lessonByDate.has(d)) lessonByDate.set(d, new Set());
        lessonByDate.get(d).add(p);
      }

      // Only show days with attendance.
      const allDatesWithAttendance = new Set([...dailyDates, ...lessonByDate.keys()]);
      const sortedDates = Array.from(allDatesWithAttendance)
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b)));

      const groups = [];
      for (const date of sortedDates) {
        if (dailyDates.has(date)) {
          // If daily exists for the date, we treat that date as Daily (no lesson columns).
          groups.push({ date, periods: ['DAY'] });
          continue;
        }
        const set = lessonByDate.get(date);
        const periods = Array.from(set || []).sort((a, b) => String(a).localeCompare(String(b)));
        if (periods.length) groups.push({ date, periods });
      }

      if (!groups.length) {
        setDetailsGrid({
          meta: { from: rangeFrom, to: rangeTo },
          groups: [],
          rows: [],
        });
        return;
      }

      // Fetch statuses for each day/period and build a student matrix.
      let baseRows = null;
      const byId = new Map();

      const fetchAndMerge = async (date, periodCode) => {
        const isDaily = periodCode === 'DAY';
        const res = await getAttendanceReportDetailsWithOptions(
          isDaily
            ? { gradeSectionId: sectionId, date, mode: 'daily', rosterScope }
            : { gradeSectionId: sectionId, date, mode: 'lesson', periodCode, rosterScope },
          { signal: ac.signal }
        );

        const list = Array.isArray(res?.data) ? res.data : [];
        if (!baseRows && list.length) {
          baseRows = list.map(stu => ({
            _id: String(stu._id),
            studentId: stu.studentId,
            fullName: stu.fullName,
            byCell: {},
          }));
          for (const r of baseRows) byId.set(r._id, r);
        }

        if (!baseRows) return;

        const map = new Map(list.map(x => [
          String(x._id),
          { status: String(x.status || ''), remarks: String(x.remarks || '') },
        ]));
        const cellKey = `${date}__${periodCode}`;
        for (const row of baseRows) {
          const hit = map.get(row._id) || null;
          row.byCell[cellKey] = hit
            ? { status: hit.status || 'absent', remarks: hit.remarks || '' }
            : { status: 'not_marked', remarks: '' };
        }
      };

      const taskFactories = [];
      for (const g of groups) {
        for (const p of g.periods) {
          taskFactories.push(() => fetchAndMerge(g.date, p));
        }
      }

      // Parallelize requests to reduce perceived latency, without exploding the browser/network.
      await runWithConcurrency(taskFactories, 8);

      setDetailsGrid({
        meta: { from: rangeFrom, to: rangeTo },
        groups,
        rows: baseRows || [],
      });
    } catch (e) {
      if (e?.name === 'AbortError') return;
      toast.error(e?.data?.message || e?.message || 'Failed to load details');
      setDetailsGrid(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  // Auto-run on filter changes (debounced) — no Run button.
  useEffect(() => {
    if (!canRun) return;

    const t = setTimeout(() => {
      if (isSummary) runSummary();
      else runDetailsRange();
    }, 250);

    return () => {
      clearTimeout(t);
      // Important: cancel stale in-flight requests immediately when filters change.
      // Without this, an older request may finish and repopulate the table after we switched tabs.
      if (isSummary) {
        try { summaryAbortRef.current?.abort?.(); } catch { /* ignore */ }
      } else {
        try { detailsAbortRef.current?.abort?.(); } catch { /* ignore */ }
      }
    };
  }, [
    reportType,
    canRun,
    sectionId,
    from,
    to,
    rosterScope,
    realtimeTick,
  ]);

  const meta = report?.meta || null;

  const summaryMatrix = useMemo(() => {
    const daily = Array.isArray(report?.daily) ? report.daily : [];
    const lesson = Array.isArray(report?.lesson) ? report.lesson : [];

    const dates = new Set();
    for (const r of daily) dates.add(String(r.date));
    for (const r of lesson) dates.add(String(r.date));

    const hasDaily = daily.length > 0;
    const lessonCodes = Array.from(new Set(lesson.map(r => String(r.periodCode || '')).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
    const periodCodes = [
      ...((hasDaily || isTeacher) ? ['DAY'] : []),
      ...lessonCodes,
    ];

    const byDate = new Map();
    for (const d of dates) byDate.set(d, { date: d, byPeriod: {} });
    for (const r of daily) {
      const row = byDate.get(String(r.date));
      if (!row) continue;
      row.byPeriod.DAY = r;
    }
    for (const r of lesson) {
      const row = byDate.get(String(r.date));
      if (!row) continue;
      row.byPeriod[String(r.periodCode)] = r;
    }

    const rows = Array.from(byDate.values())
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map((r) => ({
        ...r,
      }));

    return { periodCodes, rows };
  }, [report, isTeacher, formatActor]);

  const summaryColumns = useMemo(() => {
    const cols = [
      { key: 'date', header: 'Date', skeletonClassName: 'w-24', render: (r) => formatDateWithDay(r.date) },
    ];
    for (const code of summaryMatrix.periodCodes) {
      const header = code === 'DAY' ? 'Daily' : code;
      cols.push({
        key: `p_${code}`,
        header,
        skeletonClassName: 'w-40',
        render: (r) => {
          const c = r.byPeriod?.[code];
          if (!c) return '—';
          const m = c?.markedBy ? formatActor(c.markedBy) : '—';
          const u = c?.updatedBy ? formatActor(c.updatedBy) : '—';

          let subjectName = '';
          let teacherName = '';
          if (!isTeacher && code !== 'DAY') {
            const dow = getTimetableDayIndexFromISODate(r.date);
            const info = (dow == null) ? null : (sectionSlotInfoByKey?.[`${dow}__${String(code)}`] || null);
            subjectName = String(info?.subjectName || '—');
            teacherName = String(info?.teacherName || '—');
          }

          return (
            <div className="leading-tight">
              <div>{`P:${c.present} A:${c.absent} L:${c.late} E:${c.excused}`}</div>
              <div className="text-[11px] text-gray-600 mt-1">Marked: {m}</div>
              <div className="text-[11px] text-gray-600">Updated: {u}</div>
              {!isTeacher && code !== 'DAY' ? (
                <>
                  <div className="text-[11px] text-gray-600 mt-1">Subject: {subjectName}</div>
                  <div className="text-[11px] text-gray-600">Teacher: {teacherName}</div>
                </>
              ) : null}
            </div>
          );
        },
      });
    }
    return cols;
  }, [summaryMatrix.periodCodes, formatActor, isTeacher, sectionSlotInfoByKey]);

  const detailsHeaderRows = useMemo(() => {
    if (!detailsGrid?.groups?.length) return null;

    const row1 = [
      { key: 'view', label: '', rowSpan: 2, className: 'no-print w-10' },
      { key: 'studentId', label: 'Student ID', rowSpan: 2 },
      { key: 'fullName', label: 'Full Name', rowSpan: 2 },
      ...detailsGrid.groups.map((g) => ({
        key: `g_${g.date}`,
        label: formatDateWithDay(g.date),
        colSpan: Math.max(1, Array.isArray(g.periods) ? g.periods.length : 1),
      })),
    ];

    const row2 = detailsGrid.groups.flatMap((g) =>
      (Array.isArray(g.periods) ? g.periods : ['DAY']).map((p) => ({
        key: `p_${g.date}__${p}`,
        label: p === 'DAY' ? 'Daily' : String(p),
      }))
    );

    return [row1, row2];
  }, [detailsGrid, formatDateWithDay]);

  const detailsColumns = useMemo(() => {
    const cols = [
      {
        key: 'view',
        header: '',
        skeletonClassName: 'w-10',
        headerClassName: 'no-print',
        cellClassName: 'no-print',
        render: (r) => (
          <button
            type="button"
            className="inline-flex items-center justify-center p-1 rounded hover:bg-blue-50 text-blue-600"
            title="View student"
            aria-label={`View ${r?.fullName || 'student'}`}
            onClick={() => {
              setSelectedStudent(r || null);
              setStudentModalOpen(true);
            }}
          >
            <Eye size={18} />
          </button>
        ),
      },
      { key: 'studentId', header: 'Student ID', skeletonClassName: 'w-20', render: (r) => r.studentId },
      { key: 'fullName', header: 'Full Name', skeletonClassName: 'w-56', render: (r) => r.fullName, cellClassName: 'font-medium text-gray-900' },
    ];

    const groups = Array.isArray(detailsGrid?.groups) ? detailsGrid.groups : [];
    for (const g of groups) {
      const periods = Array.isArray(g.periods) ? g.periods : [];
      for (const p of periods) {
        const cellKey = `${g.date}__${p}`;
        cols.push({
          key: cellKey,
          header: p === 'DAY' ? 'Daily' : String(p),
          skeletonClassName: 'w-24',
          render: (r) => <AttendanceStatusBadge status={r?.byCell?.[cellKey]?.status || 'not_marked'} />,
        });
      }
    }
    return cols;
  }, [detailsGrid]);

  const detailsHeaderRowsPrint = useMemo(() => {
    if (!detailsGrid?.groups?.length) return null;

    const row1 = [
      { key: 'studentId', label: 'Student ID', rowSpan: 2 },
      { key: 'fullName', label: 'Full Name', rowSpan: 2 },
      ...detailsGrid.groups.map((g) => ({
        key: `pg_${g.date}`,
        label: formatDateWithDay(g.date),
        colSpan: Math.max(1, Array.isArray(g.periods) ? g.periods.length : 1),
      })),
    ];

    const row2 = detailsGrid.groups.flatMap((g) =>
      (Array.isArray(g.periods) ? g.periods : ['DAY']).map((p) => ({
        key: `pp_${g.date}__${p}`,
        label: p === 'DAY' ? 'All day' : String(p),
      }))
    );

    return [row1, row2];
  }, [detailsGrid, formatDateWithDay]);

  const detailsColumnsPrint = useMemo(() => {
    const cols = [
      { key: 'studentId', header: 'Student ID', skeletonClassName: 'w-20', render: (r) => r.studentId },
      { key: 'fullName', header: 'Full Name', skeletonClassName: 'w-56', render: (r) => r.fullName, cellClassName: 'font-medium text-gray-900' },
    ];

    const groups = Array.isArray(detailsGrid?.groups) ? detailsGrid.groups : [];
    for (const g of groups) {
      const periods = Array.isArray(g.periods) ? g.periods : [];
      for (const p of periods) {
        const cellKey = `${g.date}__${p}`;
        cols.push({
          key: cellKey,
          header: p === 'DAY' ? 'All day' : String(p),
          skeletonClassName: 'w-24',
          render: (r) => <AttendanceStatusBadge status={r?.byCell?.[cellKey]?.status || 'not_marked'} />,
        });
      }
    }
    return cols;
  }, [detailsGrid]);

  const renderStudentCards = (studentRow, { print = false } = {}) => {
    const groups = Array.isArray(detailsGrid?.groups) ? detailsGrid.groups : [];
    if (!studentRow || !groups.length) {
      return <div className="text-sm text-gray-600">No data.</div>;
    }

    return (
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
      >
        {groups.map((g) => (
          <div key={g.date} className={`border border-gray-200 rounded-lg ${print ? 'avoid-break' : ''} bg-white overflow-hidden`}>
            <div className="px-4 py-2 bg-gray-800 text-white">
              <div className="font-semibold">{formatDateWithDay(g.date)}</div>
            </div>
            <div className="p-4 space-y-2">
              {(Array.isArray(g.periods) ? g.periods : []).map((p) => {
                const cellKey = `${g.date}__${p}`;
                const entry = studentRow?.byCell?.[cellKey] || { status: 'not_marked', remarks: '' };
                const label = p === 'DAY' ? 'All day' : `Period: ${p}`;
                return (
                  <div key={cellKey} className="border border-gray-200 rounded-md p-3 bg-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500">{label}</div>
                        <div className="mt-0.5 text-sm text-gray-900 font-semibold">{statusLabel(entry.status)}</div>
                        {entry.remarks ? (
                          <div className="mt-1 text-sm text-gray-700">
                            <span className="text-xs text-gray-500">Remarks:</span>{' '}
                            <span className="wrap-break-word">{entry.remarks}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0">
                        <AttendanceStatusBadge status={entry.status} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <PrintHeader />
      <PrintFooter left="Generated by Nuuru Al-Bayaan" />

      <div className="print-only space-y-4 attendance-report-print">
        {isSummary ? (
          <>
            <div className="text-lg font-semibold">Attendance Report</div>
            {meta && (
              <div className="text-sm text-gray-700">
                Range: <span className="font-medium">{formatDateWithDay(meta.from)}</span> to <span className="font-medium">{formatDateWithDay(meta.to)}</span> · Roster count: <span className="font-medium">{meta.rosterCount}</span>
              </div>
            )}
            <AttendanceReportTable
              columns={summaryColumns}
              rows={summaryMatrix.rows}
              loading={false}
              emptyMessage="No attendance found for this range."
            />
          </>
        ) : (
          <>
            <div className="text-lg font-semibold">Attendance Report</div>
            {(() => {
              const m = detailsGrid?.meta;
              if (!m) return null;
              return (
                <div className="text-sm text-gray-700">
                  Range: <span className="font-medium">{formatDateWithDay(m.from)}</span> to <span className="font-medium">{formatDateWithDay(m.to)}</span>
                </div>
              );
            })()}

            {printContext === 'student' && printStudent ? (
              <>
                <div className="text-sm text-gray-700">
                  Student: <span className="font-medium">{printStudent.fullName}</span> · ID: <span className="font-medium">{printStudent.studentId}</span>
                </div>
                {renderStudentCards(printStudent, { print: true })}
              </>
            ) : (
              <AttendanceReportTable
                columns={detailsColumnsPrint}
                headerRows={detailsHeaderRowsPrint}
                rows={Array.isArray(detailsGrid?.rows) ? detailsGrid.rows : []}
                loading={false}
                emptyMessage="No attendance records found for this range."
              />
            )}
          </>
        )}
      </div>

      <div className="w-full flex justify-center">
        <div className="flex flex-wrap justify-center gap-3 no-print">
          {!isTeacher && (
            <Tabs
              value={rosterScope}
              onChange={(v) => {
                abortInFlight();
                setRosterScope(v);
                clearOutputs();
              }}
              options={[
                { value: 'current', label: 'Students: Active now' },
                { value: 'asOf', label: 'Students: On selected date' },
              ]}
            />
          )}

          <Tabs
            value={reportType}
            onChange={(v) => {
              abortInFlight();
              setReportType(v);
              // Clear stale output when switching between summary/details.
              if (v === 'summary') setDetailsGrid(null);
              else setReport(null);
            }}
            options={[
              { value: 'summary', label: 'Report: Summary' },
              { value: 'details', label: 'Report: Details' },
            ]}
          />

          <Tabs
            value={rangeTab}
            onChange={(v) => {
              abortInFlight();
              setRangeTab(v);
              clearOutputs();
              if (v === 'today') {
                setFrom(todayUTC);
                setTo(todayUTC);
                return;
              }
              if (v === 'last7') {
                const fromDt = new Date(Date.UTC(
                  Number(todayUTC.slice(0, 4)),
                  Number(todayUTC.slice(5, 7)) - 1,
                  Number(todayUTC.slice(8, 10)) - 6
                ));
                const fromStr = fromDt.toISOString().slice(0, 10);
                setFrom(fromStr);
                setTo(todayUTC);
              }
            }}
            options={[
              { value: 'today', label: 'Range: Today' },
              { value: 'last7', label: 'Range: Last 7 days' },
              { value: 'custom', label: 'Range: Custom' },
            ]}
          />
        </div>
      </div>

      {(rangeTab === 'custom') && (
        <div className="w-full flex justify-center">
          <div className="flex flex-wrap justify-center gap-3 no-print">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">From</label>
              <input
                type="date"
                className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={from}
                onChange={e => {
                  const nextFrom = e.target.value;
                  const r = clampRangeToMonth(nextFrom, to);
                  setFrom(r.from);
                  if (r.to !== to) {
                    toast.error('Max range is 1 month. Clamped the end date.');
                    setTo(r.to);
                  }
                  clearOutputs();
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">To</label>
              <input
                type="date"
                className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={to}
                onChange={e => {
                  const nextTo = e.target.value;
                  const r = clampRangeToMonth(from, nextTo);
                  setTo(r.to);
                  if (r.to !== nextTo) {
                    toast.error('Max range is 1 month. Clamped the end date.');
                  }
                  clearOutputs();
                }}
              />
            </div>
          </div>
        </div>
      )}

      <DataToolbar
        className="no-print"
        filtersSlot={(
          <FilterRow>
            {isTeacher ? (
              <>
                {teacherAssignedGrades.length > 1 && (
                  <FilterItem minWidthClass="sm:min-w-44">
                    <DropdownSelect
                      value={gradeId}
                      onChange={(v) => { setGradeId(v); setSectionId(''); }}
                      disabled={teacherSectionsLoading}
                      options={teacherAssignedGrades}
                      placeholder={teacherSectionsLoading ? 'Loading…' : 'Level'}
                    />
                  </FilterItem>
                )}

                {teacherAssignedShifts.length > 1 && (
                  <FilterItem minWidthClass="sm:min-w-40">
                    <FilterDropdownSelect
                      value={shiftId}
                      onChange={(v) => { setShiftId(v); setSectionId(''); }}
                      disabled={teacherSectionsLoading}
                      options={teacherAssignedShifts}
                      placeholder={teacherSectionsLoading ? 'Loading…' : 'Shift'}
                      searchPlaceholder="Search shifts…"
                    />
                  </FilterItem>
                )}

                <FilterItem minWidthClass="sm:min-w-60">
                  <FilterDropdownSelect
                    value={sectionId}
                    onChange={(v) => setSectionId(v)}
                    disabled={teacherSectionsLoading}
                    options={(teacherFilteredSections || []).map((gs) => {
                      const sectionNum = gs?.section;
                      const shiftName = gs?.shift?.shiftName;
                      const base = sectionNum ? `Sec ${sectionNum}` : (gs?.sectionName || 'Section');
                      const label = shiftName ? `${base} - (${shiftName})` : base;
                      return { value: gs?._id, label };
                    })}
                    placeholder={teacherSectionsLoading ? 'Loading…' : 'Section'}
                    searchPlaceholder="Search sections…"
                  />
                </FilterItem>

                <FilterItem minWidthClass="sm:min-w-56">
                  <FilterDropdownSelect
                    value={subjectId}
                    onChange={(v) => setSubjectId(v)}
                    disabled={!sectionId || teacherSectionsLoading}
                    options={teacherSubjectsForSection}
                    placeholder={
                      !sectionId
                        ? 'Subject (select section first)'
                        : (subjectSlotsLoading ? 'Subject (loading periods…)' : 'Subject (required)')
                    }
                    searchPlaceholder="Search subjects…"
                  />
                </FilterItem>
              </>
            ) : (
              <>
                <FilterItem minWidthClass="sm:min-w-44">
                  <GradeSelect value={gradeId} onChange={setGradeId} placeholder="Level" />
                </FilterItem>
                <FilterItem minWidthClass="sm:min-w-40">
                  <ShiftSelect value={shiftId} onChange={setShiftId} placeholder="Shift" />
                </FilterItem>
                <FilterItem minWidthClass="sm:min-w-60">
                  <GradeSectionSelect value={sectionId} onChange={setSectionId} gradeId={gradeId} shiftId={shiftId} placeholder="Section" />
                </FilterItem>
              </>
            )}
          </FilterRow>
        )}
        showReset={false}
        actionsSlot={(
          <div className="w-full flex flex-wrap items-center gap-2">
            {canPrint ? (
              <ActionButton
                variant="brand"
                icon={<Printer size={16} />}
                onClick={() => triggerPrint('table')}
                disabled={isSummary ? !meta : !detailsGrid?.meta}
                title="Print"
              >
                Print
              </ActionButton>
            ) : null}

            {canDownload ? (
              <>
                <PdfDownloadButton
                  disabled={isSummary ? !meta : !detailsGrid?.meta}
                  getPayload={buildExportPayload}
                />

                <ExcelDownloadButton
                  disabled={isSummary ? !meta : !detailsGrid?.meta}
                  getPayload={buildExportPayload}
                />

                <CsvDownloadButton
                  disabled={isSummary ? !meta : !detailsGrid?.meta}
                  getPayload={buildExportPayload}
                />

                <CopyTableButton
                  disabled={isSummary ? !meta : !detailsGrid?.meta}
                  getPayload={buildExportPayload}
                />
              </>
            ) : null}

            <div className="ml-auto">
              <ActionButton
                variant="brand"
                icon={<RotateCcw size={16} />}
                onClick={resetAll}
                title="Reset"
              >
                Reset
              </ActionButton>
            </div>
          </div>
        )}
        onReset={resetAll}
      />

      {(loading || detailsLoading) && (
        <div className="text-sm text-gray-600 no-print">Loading…</div>
      )}

      {!loading && !detailsLoading && !sectionId && (
        <div className="text-sm text-gray-600 no-print">Select Level, Shift, and Section to view reports.</div>
      )}

      <div className="no-print">
        {!loading && isSummary && meta && (
          <div className="text-sm text-gray-700">
            Range: <span className="font-medium">{formatDateWithDay(meta.from)}</span> to <span className="font-medium">{formatDateWithDay(meta.to)}</span> · Roster count: <span className="font-medium">{meta.rosterCount}</span>
          </div>
        )}

        {!detailsLoading && isDetails && detailsGrid?.meta && (
          <div className="text-sm text-gray-700">
            Range: <span className="font-medium">{formatDateWithDay(detailsGrid.meta.from)}</span> to <span className="font-medium">{formatDateWithDay(detailsGrid.meta.to)}</span>
          </div>
        )}
      </div>

      {isSummary && (
        <div className="no-print">
          <AttendanceReportTable
            columns={summaryColumns}
            rows={summaryMatrix.rows}
            loading={loading}
            emptyMessage="No attendance found for this range."
          />
        </div>
      )}

      {isDetails && (
        <div className="no-print">
          <AttendanceReportTable
            columns={detailsColumns}
            headerRows={detailsHeaderRows}
            rows={Array.isArray(detailsGrid?.rows) ? detailsGrid.rows : []}
            loading={detailsLoading}
            emptyMessage="No attendance records found for this range."
          />

          <Modal
            isOpen={studentModalOpen}
            onClose={() => {
              setStudentModalOpen(false);
              setSelectedStudent(null);
            }}
            title={selectedStudent ? `Student • ${selectedStudent.fullName} (${selectedStudent.studentId})` : 'Student'}
            panelClassName="max-w-5xl"
          >
            {!selectedStudent ? (
              <div className="text-sm text-gray-600">No student selected.</div>
            ) : (
              <div className="space-y-3">
                {detailsGrid?.meta && (
                  <div className="text-sm text-gray-700">
                    Range: <span className="font-medium">{formatDateWithDay(detailsGrid.meta.from)}</span> to <span className="font-medium">{formatDateWithDay(detailsGrid.meta.to)}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  {canPrint ? (
                    <ActionButton
                      variant="brand"
                      icon={<Printer size={16} />}
                      onClick={() => {
                        setStudentModalOpen(false);
                        setSelectedStudent(null);
                        triggerPrint('student', selectedStudent);
                      }}
                    >
                      Print
                    </ActionButton>
                  ) : null}
                </div>

                {renderStudentCards(selectedStudent)}
              </div>
            )}
          </Modal>
        </div>
      )}
    </div>
  );
}
