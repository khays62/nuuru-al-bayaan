import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { getAttendanceWithOptions, markAttendanceBulk } from '../api/attendance';
import { getSlotsWithOptions } from '../../timetable/api/timetable';
import { getAssignments as getTeacherAssignments } from '../../teachers/api/teachersApi';
import DataToolbar from '../../../shared/components/DataToolbar/DataToolbar.jsx';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import FilterDropdownSelect from '../../../shared/components/DataToolbar/FilterDropdownSelect.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import GradeSelect from '../../lookups/components/GradeSelect';
import ShiftSelect from '../../lookups/components/ShiftSelect';
import GradeSectionSelect from '../../lookups/components/GradeSectionSelect';
import { useDebounce } from '../../../hooks/useDebounce';
import Tabs from '../components/Tabs';
import { clampRemarksWhileTyping } from '../components/remarks';
import AttendanceTable from '../components/AttendanceTable';
import AttendanceFooter from '../components/AttendanceFooter';
import { useAuth } from '../../../auth/AuthContext';
import { teacherKeys } from '../../teachers/queryKeys.js';
import { useAttendanceRealtimeInvalidation } from '../useAttendanceRealtimeInvalidation';

export default function AttendancePage() {
  const { auth, hasPermission } = useAuth();
  const role = String(auth?.user?.role || '').toLowerCase();
  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';
  const teacherRef = String(auth?.user?.teacherRef || '');

  const todayUTC = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const yesterdayUTC = useMemo(() => new Date(Date.now() - 86400000).toISOString().slice(0, 10), []);

  const [gradeId, setGradeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const [subjectId, setSubjectId] = useState('');
  const [teacherSections, setTeacherSections] = useState([]);
  const [teacherSectionsLoading, setTeacherSectionsLoading] = useState(false);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [teacherAssignmentsLoading, setTeacherAssignmentsLoading] = useState(false);

  const [dateTab, setDateTab] = useState('today'); // 'today' | 'yesterday' | 'custom'
  const [customDate, setCustomDate] = useState(todayUTC);

  const selectedDate = useMemo(() => {
    if (dateTab === 'today') return todayUTC;
    if (dateTab === 'yesterday') return yesterdayUTC;
    return customDate;
  }, [dateTab, todayUTC, yesterdayUTC, customDate]);

  const [rosterScope, setRosterScope] = useState('current');

  useEffect(() => {
    if (!isTeacher) return;
    // Teachers must only work with active roster.
    if (rosterScope !== 'current') setRosterScope('current');
    if (dateTab !== 'today') setDateTab('today');
  }, [isTeacher, rosterScope, dateTab]);

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
      setTeacherAssignmentsLoading(false);
      return;
    }
    setTeacherAssignmentsLoading(teacherAssignmentsQuery.isLoading);
    setTeacherAssignments(Array.isArray(teacherAssignmentsQuery.data) ? teacherAssignmentsQuery.data : []);
  }, [isTeacher, teacherAssignmentsQuery.data, teacherAssignmentsQuery.isLoading]);

  useEffect(() => {
    if (!isTeacher) {
      setTeacherSections([]);
      setTeacherSectionsLoading(false);
      return;
    }
    setTeacherSectionsLoading(true);
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
    setTeacherSectionsLoading(false);
  }, [isTeacher, teacherAssignments]);

  useEffect(() => {
    if (!isTeacher) return;
    if (!sectionId) return;
    const ok = (teacherSections || []).some((s) => String(s?._id) === String(sectionId));
    if (!ok) setSectionId('');
  }, [isTeacher, sectionId, teacherSections]);

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

  const teacherShiftOptions = useMemo(() => {
    const map = new Map();
    for (const gs of teacherAssignedSections) {
      if (gradeId && String(gs?.grade?._id) !== String(gradeId)) continue;
      const id = String(gs?.shift?._id || '');
      if (!id) continue;
      if (!map.has(id)) map.set(id, gs.shift?.shiftName || '');
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [teacherAssignedSections, gradeId]);

  const teacherMustPickGrade = useMemo(() => (teacherAssignedGrades.length > 1), [teacherAssignedGrades]);

  const teacherFilteredSections = useMemo(() => {
    // Enforce cascading order for teachers:
    // - If multiple grades exist, Grade must be selected before Section.
    // - If multiple shifts exist for the selected grade, Shift must be selected before Section.
    if (teacherMustPickGrade && !gradeId) return [];
    if (teacherShiftOptions.length > 1 && !shiftId) return [];

    return teacherAssignedSections.filter(gs => {
      const matchGrade = !gradeId || String(gs?.grade?._id) === String(gradeId);
      const matchShift = !shiftId || String(gs?.shift?._id) === String(shiftId);
      return matchGrade && matchShift;
    });
  }, [teacherAssignedSections, gradeId, shiftId, teacherMustPickGrade, teacherShiftOptions]);

  const teacherSubjectsForSection = useMemo(() => {
    if (!isTeacher || !sectionId) return [];
    const map = new Map();
    for (const a of (teacherAssignments || [])) {
      if (String(a?.gradeSection?._id) !== String(sectionId)) continue;
      const sid = String(a?.subject?._id || '');
      const name = a?.subject?.subjectName || '';
      if (!sid) continue;
      if (!map.has(sid)) map.set(sid, name);
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [isTeacher, sectionId, teacherAssignments]);

  // Teacher selects Grade -> Section -> Subject -> Period manually (no auto-selects)

  const [mode, setMode] = useState('lesson'); // 'lesson' | 'daily'
  const [periodCode, setPeriodCode] = useState('');

  const [periodOptions, setPeriodOptions] = useState([]);

  // Admin/staff use Section -> Period directly (subject/teacher shown in period label)

  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [detectingMode, setDetectingMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [rows, setRows] = useState([]);
  const [attMeta, setAttMeta] = useState(null);
  const [attMetaKey, setAttMetaKey] = useState('');
  const [realtimeTick, setRealtimeTick] = useState(0);

  const [selectionHasRecords, setSelectionHasRecords] = useState(false);

  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const dirtyRef = useRef(false);
  const dirtyKeyRef = useRef('');

  useEffect(() => {
    dirtyRef.current = Boolean(dirty);
  }, [dirty]);

  // Live refresh: keep attendance synced across browsers/tabs.
  const onAttendanceChanged = useCallback((e) => {
    const detail = e?.detail || {};
    if (dirtyRef.current) return;
    if (saving) return;

    const eventGs = String(detail?.gradeSectionId || '');
    const eventDate = String(detail?.date || '');
    const eventPeriod = String(detail?.periodCode || '');

    if (!eventGs) return;
    if (String(sectionId || '') !== eventGs) return;

    // If date is provided, only refresh when it matches current selection.
    if (eventDate && String(selectedDate || '') !== eventDate) return;

    // If period is provided, only refresh when it matches the current mode/period.
    if (eventPeriod) {
      const currentPeriod = mode === 'daily' ? 'DAY' : String(periodCodeRef.current || '');
      if (currentPeriod && String(currentPeriod) !== String(eventPeriod)) return;
    }

    setRealtimeTick((t) => t + 1);
  }, [mode, saving, sectionId, selectedDate]);

  useAttendanceRealtimeInvalidation({ onChanged: onAttendanceChanged });

  // Gate toasts by key to avoid duplicates during rapid rerenders.
  const toastGateRef = useRef(new Map());

  const slotsAbortRef = useRef(null);
  const detectAbortRef = useRef(null);
  const attendanceAbortRef = useRef(null);
  const detectKeyRef = useRef('');

  const [allSlots, setAllSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsForSectionId, setSlotsForSectionId] = useState('');
  const [scheduleStatus, setScheduleStatus] = useState({ key: '', hasAnyLesson: false, daySlotsCount: 0, ready: false });

  const attendanceCacheRef = useRef(new Map());

  const rowsRef = useRef([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);

  const userChangedDateRef = useRef(false);

  const periodCodeRef = useRef('');
  useEffect(() => {
    periodCodeRef.current = periodCode;
  }, [periodCode]);

  const prevGradeIdRef = useRef('');
  const prevShiftIdRef = useRef('');
  const prevSectionIdRef = useRef('');

  const clearForwardFromSection = () => {
    // Cancel any in-flight requests that could write stale state after selection changes.
    if (slotsAbortRef.current) slotsAbortRef.current.abort();
    if (detectAbortRef.current) detectAbortRef.current.abort();
    if (attendanceAbortRef.current) attendanceAbortRef.current.abort();

    setPeriodCode('');
    setRows([]);
    setLoaded(false);
    setDirty(false);
    dirtyKeyRef.current = '';
    setLastSavedAt(null);
    setAttMeta(null);
    setAttMetaKey('');
    setSelectionHasRecords(false);
  };

  const currentSelectionKey = useMemo(() => {
    if (!sectionId) return '';
    const effectivePeriod = mode === 'daily' ? 'DAY' : periodCode;
    return `${sectionId}|${selectedDate}|${rosterScope}|${mode}|${effectivePeriod}`;
  }, [sectionId, selectedDate, rosterScope, mode, periodCode]);

  const querySectionId = useDebounce(sectionId, 250);
  // Date changes can be rapid via keyboard arrows; debounce a bit longer to reduce request churn.
  const queryDate = useDebounce(selectedDate, 500);
  const queryRosterScope = useDebounce(rosterScope, 250);
  const queryMode = useDebounce(mode, 150);
  const queryPeriodCode = useDebounce(periodCode, 150);

  const jsDayUTC = useMemo(() => {
    // selectedDate is an ISO date-only string (YYYY-MM-DD) derived from UTC.
    // Compute day-of-week in UTC to avoid timezone-based off-by-one issues.
    const m = String(queryDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(d)) return null;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return Number.isNaN(dt.getTime()) ? null : dt.getUTCDay();
  }, [queryDate]);

  const dayOfWeek = useMemo(() => {
    if (jsDayUTC == null) return null;
    // Convert JS day (Sun=0..Sat=6) to project day (Sat=0..Fri=6)
    return (jsDayUTC + 1) % 7;
  }, [jsDayUTC]);

  const selectedDayLabel = useMemo(() => {
    const base = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return jsDayUTC == null ? '' : (base[jsDayUTC] || '');
  }, [jsDayUTC]);

  // 12-hour time formatter for UI labels
  const fmt12 = (t) => {
    const m = String(t || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return String(t || '');
    let hh = Number(m[1]);
    const mm = m[2];
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12;
    if (hh === 0) hh = 12;
    return `${hh}:${mm} ${ampm}`;
  };

  const allowToast = (key, windowMs = 8000) => {
    const now = Date.now();
    const gate = toastGateRef.current;
    const prevAt = gate.get(key);
    if (prevAt && (now - prevAt) < windowMs) return false;
    gate.set(key, now);
    // prune to keep memory bounded
    if (gate.size > 120) {
      for (const [k, at] of gate) {
        if ((now - at) > 60_000) gate.delete(k);
      }
      // still too big? drop oldest-ish
      if (gate.size > 120) {
        const keys = Array.from(gate.keys()).slice(0, 40);
        keys.forEach(k => gate.delete(k));
      }
    }
    return true;
  };

  useEffect(() => {
    if (mode === 'daily') {
      setPeriodCode('DAY');
    } else {
      if (periodCode === 'DAY') setPeriodCode('');
    }
  }, [mode]);

  // Clear downstream selects when upstream filters change (keep tabs).
  useEffect(() => {
    const prev = prevGradeIdRef.current;
    if (prev !== '' && prev !== gradeId) {
      setShiftId('');
      setSectionId('');
      clearForwardFromSection();
    }
    prevGradeIdRef.current = gradeId;
  }, [gradeId]);

  useEffect(() => {
    const prev = prevShiftIdRef.current;
    if (prev !== '' && prev !== shiftId) {
      setSectionId('');
      clearForwardFromSection();
    }
    prevShiftIdRef.current = shiftId;
  }, [shiftId]);

  useEffect(() => {
    const prev = prevSectionIdRef.current;
    if (prev !== '' && prev !== sectionId) {
      clearForwardFromSection();
    }
    prevSectionIdRef.current = sectionId;
    // Selecting a GS should not immediately warn; warnings should show when user picks a date/day.
    userChangedDateRef.current = false;
  }, [sectionId]);

  const sectionSlotsQuery = useQuery({
    queryKey: teacherKeys.timetableSlots({ gradeSectionId: querySectionId }),
    enabled: Boolean(querySectionId),
    queryFn: async ({ signal }) => {
      const res = await getSlotsWithOptions({ gs: querySectionId }, { signal });
      return Array.isArray(res?.data) ? res.data : [];
    },
  });

  // Load all timetable slots for the selected section, then compute day-specific periods client-side.
  useEffect(() => {
    if (!querySectionId) {
      setAllSlots([]);
      setSlotsLoading(false);
      setSlotsForSectionId('');
      return;
    }

    setSlotsForSectionId(String(querySectionId));
    setSlotsLoading(Boolean(sectionSlotsQuery.isLoading && sectionSlotsQuery.data == null));

    if (sectionSlotsQuery.isError) {
      setAllSlots([]);
      setScheduleStatus({ key: '', hasAnyLesson: false, daySlotsCount: 0, ready: false });
      return;
    }

    const all = Array.isArray(sectionSlotsQuery.data) ? sectionSlotsQuery.data : [];
    setAllSlots(all);
  }, [querySectionId, sectionSlotsQuery.data, sectionSlotsQuery.isLoading, sectionSlotsQuery.isError]);

  useEffect(() => {
    if (!querySectionId || dayOfWeek == null) {
      setPeriodOptions([]);
      setScheduleStatus({ key: '', hasAnyLesson: false, daySlotsCount: 0, ready: false });
      if (mode === 'lesson') setPeriodCode('');
      return;
    }

    const slotsReadyForThisSection = String(slotsForSectionId || '') === String(querySectionId || '') && !slotsLoading;
    if (!slotsReadyForThisSection) {
      // Wait until slots are loaded for the current section to avoid false schedule toasts.
      setPeriodOptions([]);
      setScheduleStatus({ key: `${String(querySectionId)}|${String(queryDate || '')}`, hasAnyLesson: false, daySlotsCount: 0, ready: false });
      if (mode === 'lesson') setPeriodCode('');
      return;
    }

    // Some older DB rows may have `isBreak` stored as string values.
    // Treat only explicit true-ish values as breaks.
    const isBreakSlot = (v) => v === true || v === 'true' || v === 1 || v === '1';
    const nonBreak = (Array.isArray(allSlots) ? allSlots : []).filter(s => !isBreakSlot(s?.isBreak));
    const hasAnyLesson = nonBreak.length > 0;

    // Prefer the project's convention (Sat=0..Fri=6), but fall back to JS convention (Sun=0..Sat=6)
    // if it yields more lessons. This keeps Attendance robust even if older data used a different mapping.
    const daySlotsProject = nonBreak.filter(s => Number(s.dayOfWeek) === Number(dayOfWeek));
    const daySlotsJs = jsDayUTC == null
      ? []
      : nonBreak.filter(s => Number(s.dayOfWeek) === Number(jsDayUTC));
    const useProjectConvention = daySlotsProject.length >= daySlotsJs.length;
    const daySlots = (useProjectConvention ? daySlotsProject : daySlotsJs)
      .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));

    const scheduleKey = `${String(querySectionId)}|${String(queryDate || '')}`;
    setScheduleStatus({ key: scheduleKey, hasAnyLesson, daySlotsCount: daySlots.length, ready: true });

    const dayLabel = selectedDayLabel;

    const options = [];
    const meta = {};
    for (const s of daySlots) {
      const code = `${s.startTime}-${s.endTime}`;
      const subjName = s.subject?.subjectName || 'No subject';
      const teacherName = s.teacher?.fullName || '';
      const baseLabel = `${fmt12(s.startTime)}-${fmt12(s.endTime)} • ${subjName}`;
      const label = isTeacher ? baseLabel : (teacherName ? `${baseLabel} • ${teacherName}` : baseLabel);
      options.push({ value: code, label });
      meta[code] = {
        startTime: s.startTime,
        endTime: s.endTime,
        subjectName: s.subject?.subjectName || '',
        subjectId: s.subject?._id || '',
        teacherId: s.teacher?._id || '',
        teacherName: s.teacher?.fullName || '',
      };
    }
    const optionsWithDay = options.map(o => ({
      ...o,
      label: dayLabel ? `${dayLabel} • ${o.label}` : o.label,
    }));

    const teacherId = String(auth?.user?.teacherRef || '');
    let filtered = optionsWithDay;
    if (isTeacher) {
      filtered = filtered.filter(o => String(meta[o.value]?.teacherId || '') === teacherId);
      if (subjectId) filtered = filtered.filter(o => String(meta[o.value]?.subjectId || '') === String(subjectId));
      if (subjectId && filtered.length === 0) {
        const k = `no-periods|${querySectionId}|${subjectId}|${selectedDayLabel}`;
        const isStableSection = String(sectionId || '') === String(querySectionId || '');
        if (isStableSection && allowToast(k)) toast.error('You have no periods for this subject today.');
      }
    }

    // Historical edit support (admin/staff): if attendance exists for lesson mode on this date,
    // but the timetable has no matching periods (e.g., timetable changed later), inject saved
    // period codes so the user can still load/edit the records.
    if (!isTeacher && String(mode) === 'lesson' && String(attMeta?.date || '') === String(queryDate || '') && Array.isArray(attMeta?.lessonPeriodCodes) && attMeta.lessonPeriodCodes.length > 0) {
      const savedCodes = Array.from(new Set(attMeta.lessonPeriodCodes.map(String))).filter(Boolean);
      for (const code of savedCodes) {
        if (meta[code]) continue;
        meta[code] = {
          startTime: String(code).split('-')[0] || '',
          endTime: String(code).split('-')[1] || '',
          subjectName: '',
          subjectId: '',
          teacherId: '',
          teacherName: '',
          savedOnly: true,
        };
      }
      const existingValues = new Set(filtered.map(o => o.value));
      const injected = savedCodes
        .filter(code => !existingValues.has(code))
        .map(code => ({
          value: code,
          label: `${selectedDayLabel ? `${selectedDayLabel} • ` : ''}Saved period • ${code}`,
        }));
      if (injected.length) {
        filtered = [...filtered, ...injected];
      }
    }

    setPeriodOptions(filtered);

    // Day-specific timetable feedback
    // - If the class has no lessons at all, say so.
    // - Otherwise, if selected day has no periods, inform user (per selected date/day).
    const availableProjectDays = Array.from(new Set(nonBreak.map(s => Number(s.dayOfWeek))))
      .filter(n => Number.isInteger(n) && n >= 0 && n <= 6)
      .sort((a, b) => a - b);

    const selectedKey = useProjectConvention ? Number(dayOfWeek) : Number(jsDayUTC);
    const hasSelectedDayInTimetable = availableProjectDays.includes(selectedKey);

    const toastKeyBase = `${querySectionId}|${String(selectedKey)}|${String(queryDate || '')}`;
    const isStableSection = String(sectionId || '') === String(querySectionId || '');

    const metaMatches = String(attMeta?.date || '') === String(queryDate || '');

    // Only show schedule toasts when we have a stable selection and the mode detection has finished.
    if (!detectingMode && metaMatches) {
      if (!hasAnyLesson) {
        const k = `${toastKeyBase}|no-any`;
        if (isStableSection && allowToast(k)) toast.error('No lessons exist in the timetable for this class.');
      } else if (!hasSelectedDayInTimetable || daySlots.length === 0) {
        const k = `${toastKeyBase}|no-day`;
        if (isStableSection && !selectionHasRecords && allowToast(k)) {
          toast.error(`No periods scheduled for this class on ${selectedDayLabel || 'this day'}.`);
        }
      }
    }

    if (mode === 'lesson') {
      const currentPeriod = String(periodCodeRef.current || '');
      if (!filtered.some(o => o.value === currentPeriod)) {
        setPeriodCode('');
      }
    }
  }, [querySectionId, allSlots, dayOfWeek, mode, jsDayUTC, queryDate, subjectId, attMeta, isTeacher, detectingMode, selectionHasRecords]);

  const canAct = useMemo(() => {
    if (!sectionId) return false;
    if (mode === 'daily') return true;
    if (isTeacher) return Boolean(subjectId && periodCode);
    return Boolean(periodCode);
  }, [sectionId, mode, subjectId, periodCode, isTeacher]);

  const canEdit = useMemo(() => {
    if (!canAct) return false;

    // Staff/admin are permission-gated. Teachers are assignment-scoped (role-based).
    if (!isAdmin && !isTeacher && !hasPermission('attendance', 'edit')) return false;

    // Teachers must be able to VIEW daily attendance, but not edit it.
    if (isTeacher && mode === 'daily') return false;

    // Also prevent teachers from editing anything when a daily record exists.
    if (isTeacher && Boolean(attMeta?.hasDaily)) return false;
    return true;
  }, [canAct, isTeacher, attMeta, isAdmin, hasPermission, mode]);

  // Auto-switch Mode to match existing attendance for selected GS+date.
  // This avoids the confusing "one mode is locked" feeling when viewing historical dates.
  useEffect(() => {
    const detect = async () => {
      if (!querySectionId) return;
      setDetectingMode(true);
      try {
        if (detectAbortRef.current) detectAbortRef.current.abort();
        const ac = new AbortController();
        detectAbortRef.current = ac;

        const requestKey = `${String(querySectionId)}|${String(queryDate || '')}|${String(queryRosterScope || '')}`;
        detectKeyRef.current = requestKey;

        const res = await getAttendanceWithOptions({
          gradeSectionId: querySectionId,
          date: queryDate,
          periodCode: 'DAY',
          rosterScope: queryRosterScope,
        }, { signal: ac.signal });

        // Ignore stale responses that raced with a user selection change.
        const stillSameRequest = String(detectKeyRef.current || '') === requestKey;
        const isStableSection = String(sectionId || '') === String(querySectionId || '');
        if (!stillSameRequest || !isStableSection) return;

        const meta = res?.meta || null;
        setAttMeta(meta);
        setAttMetaKey(requestKey);
        setSelectionHasRecords(Boolean(meta?.hasSelectionRecords));

        const hasDaily = Boolean(meta?.hasDaily);
        const hasLesson = Boolean(meta?.hasLesson);

        // Teacher behavior:
        // - If daily attendance exists, switch to All day (read-only view).
        // - Otherwise, keep Per lesson mode.
        if (isTeacher) {
          if (hasDaily && mode !== 'daily') {
            setMode('daily');
            return;
          }
          if (!hasDaily && mode !== 'lesson') {
            setMode('lesson');
          }
          return;
        }

        // Prefer the only existing mode (backend prevents mixing).
        if (hasLesson && !hasDaily && mode !== 'lesson') {
          setMode('lesson');
          return;
        }
        if (hasDaily && !hasLesson && mode !== 'daily') {
          setMode('daily');
          return;
        }
      } catch {
        // ignore
      } finally {
        setDetectingMode(false);
      }
    };
    detect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [querySectionId, queryDate, queryRosterScope, isTeacher]);

  useEffect(() => {
    const load = async () => {
      const canQueryAct = Boolean(querySectionId) && (queryMode === 'daily' ? true : Boolean(queryPeriodCode));
      if (!canQueryAct) return;

      // If timetable indicates no periods on the selected day, do not show a roster.
      // Exception: if attendance is already saved for this selection, we still show it.
      const scheduleKey = `${String(querySectionId)}|${String(queryDate || '')}`;
      const scheduleMatches = scheduleStatus?.ready && String(scheduleStatus?.key || '') === scheduleKey;
      const blocksRoster = scheduleMatches && (scheduleStatus?.hasAnyLesson === false || Number(scheduleStatus?.daySlotsCount || 0) === 0);

      // When the schedule blocks roster, clear the table immediately to avoid showing stale students.
      // We'll still fetch attendance to check if there are saved records (historical editing support).
      if (blocksRoster) {
        setRows([]);
        setLoaded(true);
        setDirty(false);
      }

      const effectivePeriod = queryMode === 'daily' ? 'DAY' : queryPeriodCode;
      const cacheKey = `${querySectionId}|${queryDate}|${queryRosterScope}|${queryMode}|${effectivePeriod}`;

      // If the user is actively editing this exact selection, do not overwrite their changes
      // with background cache hydration or late network responses.
      const editingThisSelection = dirtyRef.current && String(dirtyKeyRef.current || '') === String(cacheKey);

      // SWR: show cached data immediately if available, then revalidate in background.
      const cached = attendanceCacheRef.current.get(cacheKey);
      if (!editingThisSelection && cached && Array.isArray(cached.rows)) {
        setRows(cached.rows);
        setAttMeta(cached.meta || null);
        setSelectionHasRecords(Boolean(cached.meta?.hasSelectionRecords));
        setLoaded(true);
        setDirty(false);
        setLoadingAttendance(false);
      } else {
        // Avoid a "big" loading skeleton when we already have something on screen.
        // This keeps the table stable during background refreshes (especially after Save/Update).
        const hasSomethingOnScreen = loadedRef.current || (Array.isArray(rowsRef.current) && rowsRef.current.length > 0);
        setLoadingAttendance(!hasSomethingOnScreen);
      }
      try {
        if (attendanceAbortRef.current) attendanceAbortRef.current.abort();
        const ac = new AbortController();
        attendanceAbortRef.current = ac;
        const res = await getAttendanceWithOptions({
          gradeSectionId: querySectionId,
          date: queryDate,
          periodCode: effectivePeriod,
          rosterScope: queryRosterScope,
        }, { signal: ac.signal });
        const list = res?.data || [];
        const normalized = list.map(stu => ({ ...stu, status: stu.status || 'present' }));

        const hasSelectionRecords = Boolean(res?.meta?.hasSelectionRecords);

        // If this day has no timetable periods and there are no saved records, show an empty table.
        // This prevents showing students on days where the class has no schedule.
        if (blocksRoster && !hasSelectionRecords) {
          attendanceCacheRef.current.set(cacheKey, { rows: [], meta: res?.meta || null, at: Date.now() });
          setRows([]);
          setAttMeta(res?.meta || null);
          setAttMetaKey(`${String(querySectionId)}|${String(queryDate || '')}|${String(queryRosterScope || '')}`);
          setSelectionHasRecords(false);
          setLoaded(true);
          setDirty(false);
          return;
        }

        attendanceCacheRef.current.set(cacheKey, { rows: normalized, meta: res?.meta || null, at: Date.now() });

        // If the user started editing while this request was in flight, keep their edits.
        const stillEditingThisSelection = dirtyRef.current && String(dirtyKeyRef.current || '') === String(cacheKey);
        if (!stillEditingThisSelection) {
          setRows(normalized);
          setDirty(false);
        }
        setAttMeta(res?.meta || null);
        setAttMetaKey(`${String(querySectionId)}|${String(queryDate || '')}|${String(queryRosterScope || '')}`);
        setSelectionHasRecords(hasSelectionRecords);
        setLoaded(true);
        if (isTeacher && (Array.isArray(normalized) && normalized.length === 0)) {
          const k = `no-students|${querySectionId}|${queryDate}|${queryMode}|${queryPeriodCode}`;
          if (allowToast(k)) toast.error('No active students in this class.');
        }
      } catch (e) {
        if (e?.name === 'AbortError') return;
        toast.error(isTeacher ? 'Failed to load attendance.' : 'Failed to load attendance.');
      } finally {
        setLoadingAttendance(false);
      }
    };
    load();
  }, [querySectionId, queryMode, queryPeriodCode, queryDate, queryRosterScope, scheduleStatus, realtimeTick]);

  const handleAdminGradeChange = (v) => {
    // Clear downstream selections in the same tick to avoid transient grade+old-shift requests/toasts.
    setGradeId(v);
    setShiftId('');
    setSectionId('');
    clearForwardFromSection();
  };

  const handleAdminShiftChange = (v) => {
    setShiftId(v);
    setSectionId('');
    clearForwardFromSection();
  };

  const handleAdminSectionChange = (v) => {
    setSectionId(v);
    clearForwardFromSection();
  };

  function setStudentStatus(studentId, status) {
    if (!canEdit) return;
    const needsReason = status === 'excused' || status === 'other';
    setRows(prev => prev.map(r => (r._id === studentId ? { ...r, status, remarks: needsReason ? (r.remarks || '') : '' } : r)));
    dirtyKeyRef.current = currentSelectionKey;
    setDirty(true);
  }

  function setStudentRemarks(studentId, remarks) {
    if (!canEdit) return;
    setRows(prev => prev.map(r => (
      r._id === studentId
        ? { ...r, remarks: clampRemarksWhileTyping(r.remarks || '', remarks, 40) }
        : r
    )));
    dirtyKeyRef.current = currentSelectionKey;
    setDirty(true);
  }

  async function saveBulk() {
    if (!canAct) {
      const msg = mode === 'lesson'
        ? 'Please select Level, Shift, Section, and Period.'
        : 'Please select Level, Shift and Section.';
      toast.error(msg);
      return;
    }

    if (!canEdit) {
      toast.error('You do not have permission to edit attendance');
      return;
    }
    if (blockNewAttendanceForInactive) {
      toast.error('Some students are inactive. You cannot create new attendance for inactive students. You can still update historical attendance records.');
      return;
    }
    if (isTeacher && teacherBlockedByExistingDaily) {
      toast.error('Daily attendance already exists for this class and date. You cannot also take Per-lesson attendance.');
      return;
    }
    if (rows.length === 0) {
      toast.error('No active students in this class.');
      return;
    }
    // Prevent double-save when nothing changed and this selection already has records.
    if (!dirty && selectionHasRecords) {
      toast.error('Attendance is already saved. Make a change if you want to save again.');
      return;
    }
    setSaving(true);
    try {
      const alreadyHadRecords = Boolean(selectionHasRecords);
      const byId = new Map(rows.map(r => [String(r._id), r]));
      const payload = rows.map(r => ({ studentId: r._id, status: r.status }));
      await markAttendanceBulk({
        gradeSectionId: sectionId,
        date: selectedDate,
        periodCode: mode === 'daily' ? 'DAY' : periodCode,
        items: payload.map(p => {
          const found = byId.get(String(p.studentId));
          const needsReason = found?.status === 'excused' || found?.status === 'other';
          return { ...p, remarks: needsReason ? (found?.remarks || '') : '' };
        }),
      });
      toast.success('Attendance saved.');

      // Optimistically update audit columns so admin/staff sees Marked/Updated immediately.
      const actorName = String(
        auth?.user?.fullName
        || auth?.user?.name
        || auth?.user?.username
        || auth?.user?.email
        || 'User'
      );
      const actorRole = String(auth?.user?.role || '');
      const nowIso = new Date().toISOString();
      const nextRows = (rowsRef.current || []).map((r) => {
        const prevAudit = r?.audit || {};
        const markedBy = prevAudit?.markedBy || { name: actorName, role: actorRole };
        const markedAt = prevAudit?.markedAt || nowIso;
        const updatedBy = { name: actorName, role: actorRole };
        const updatedAt = nowIso;
        // On first save, set both marked + updated. On subsequent saves, preserve marked.* if present.
        return {
          ...r,
          audit: {
            ...prevAudit,
            markedBy: alreadyHadRecords ? markedBy : { name: actorName, role: actorRole },
            markedAt: alreadyHadRecords ? markedAt : nowIso,
            updatedBy,
            updatedAt,
          },
        };
      });
      setRows(nextRows);

      setDirty(false);
      dirtyKeyRef.current = '';
      setLastSavedAt(Date.now());
      setSelectionHasRecords(true);
      const nextMeta = (() => {
        const base = attMeta || {};
        if (mode === 'daily') {
          return { ...base, hasDaily: true, hasLesson: false, hasSelectionRecords: true, date: selectedDate, periodCode: 'DAY' };
        }
        return { ...base, hasDaily: false, hasLesson: true, hasSelectionRecords: true, date: selectedDate, periodCode: periodCode };
      })();
      setAttMeta(nextMeta);

      // Keep SWR cache warm so the UI doesn't flash a skeleton after Save/Update.
      const effectivePeriod = mode === 'daily' ? 'DAY' : periodCode;
      const cacheKey = `${sectionId}|${selectedDate}|${rosterScope}|${mode}|${effectivePeriod}`;
      attendanceCacheRef.current.set(cacheKey, { rows: nextRows, meta: nextMeta, at: Date.now() });
      setLoadingAttendance(false);
    } catch (e) {
      if (e?.status === 409) {
        if (isTeacher) {
          toast.error('Attendance already exists for this class and date in a different mode. Please contact admin/staff to edit it.');
        } else if (mode === 'daily') {
          toast.error('Lesson attendance already exists for this date. Switch Mode to Per lesson to edit.');
        } else {
          toast.error('Daily attendance already exists for this date. Switch Mode to All day to edit.');
        }
      } else {
        toast.error(e?.data?.message || e?.message || 'Failed to save attendance.');
      }
    } finally {
      setSaving(false);
    }
  }

  const presentCount = useMemo(() => rows.filter(r => r.status === 'present').length, [rows]);
  const absentCount = useMemo(() => rows.filter(r => r.status === 'absent').length, [rows]);
  const lateCount = useMemo(() => rows.filter(r => r.status === 'late').length, [rows]);
  const excusedCount = useMemo(
    () => rows.filter(r => ['excused', 'sick', 'medical', 'family', 'other'].includes(r.status)).length,
    [rows]
  );

  const hasInactiveStudents = useMemo(() => rows.some(r => r?.active === false), [rows]);

  const blockNewAttendanceForInactive = useMemo(() => {
    // Block only when creating NEW attendance (no existing records) on today/future dates.
    if (selectionHasRecords) return false;
    if (!hasInactiveStudents) return false;
    if (!selectedDate) return false;
    return String(selectedDate) >= String(todayUTC);
  }, [selectionHasRecords, hasInactiveStudents, selectedDate, todayUTC]);

  const teacherBlockedByExistingDaily = useMemo(() => {
    if (!isTeacher) return false;
    return Boolean(attMeta?.hasDaily);
  }, [isTeacher, attMeta]);

  const blockedSaveReason = useMemo(() => {
    if (blockNewAttendanceForInactive) {
      return 'Some students are inactive. You cannot create new attendance for inactive students. You can still update historical attendance records.';
    }
    if (isTeacher && teacherBlockedByExistingDaily) {
      return 'Daily attendance is already saved for this class and date. You can view it, but you cannot edit it.';
    }
    return '';
  }, [blockNewAttendanceForInactive, isTeacher, teacherBlockedByExistingDaily]);

  // Inform teacher once when switching into read-only daily view.
  useEffect(() => {
    if (!isTeacher) return;
    if (!teacherBlockedByExistingDaily) return;
    if (!querySectionId || !queryDate) return;

    // Only show when the debounced selection matches what the user currently has selected.
    // This avoids leaking the toast to other sections when requests resolve out of order.
    const isStableSection = String(sectionId || '') === String(querySectionId || '');
    if (!isStableSection) return;

    const metaMatches = String(attMeta?.date || '') === String(queryDate || '');
    if (!metaMatches) return;

    const k = `teacher|daily-readonly|${querySectionId}|${queryDate}`;
    const keyMatches = String(attMetaKey || '') === `${String(querySectionId)}|${String(queryDate || '')}|${String(queryRosterScope || '')}`;
    if (!keyMatches) return;

    if (allowToast(k)) toast.error('Daily attendance is already saved for this class and date. You can view it, but you cannot edit it.');
  }, [isTeacher, teacherBlockedByExistingDaily, querySectionId, queryDate, queryRosterScope, sectionId, attMeta, attMetaKey]);

  const isTableLoading = Boolean(loadingAttendance || detectingMode);
  const effectiveCanEditForTable = Boolean(canEdit && !isTableLoading && !saving);

  // If inactive students show up while on "Active now" (e.g., historical records fallback),
  // switch to "On selected date" automatically.
  useEffect(() => {
    if (isTeacher) return;
    if (!loaded) return;
    if (rosterScope !== 'current') return;
    if (!hasInactiveStudents) return;
    const k = `rosterScope|current|has-inactive|${sectionId}|${selectedDate}|${mode}|${periodCode}`;
    if (allowToast(k)) toast.error('Inactive students detected. Switched to "Students: On selected date".');
    setRosterScope('asOf');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeacher, loaded, rosterScope, hasInactiveStudents, sectionId, selectedDate, mode, periodCode]);

  // If the user switches to "On selected date" but the roster has no inactive students,
  // auto-return to "Active now" to keep the intent of the tabs clear.
  useEffect(() => {
    if (isTeacher) return;
    if (!loaded) return;
    if (rosterScope !== 'asOf') return;
    if (rows.length === 0) return;
    if (hasInactiveStudents) return;

    const k = `rosterScope|asOf|all-active|${sectionId}|${selectedDate}|${mode}|${periodCode}`;
    if (allowToast(k)) {
      toast.error('All students are active. Use "Students: Active now" instead.');
    }
    setRosterScope('current');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTeacher, loaded, rosterScope, rows, hasInactiveStudents, sectionId, selectedDate, mode, periodCode]);

  // Tabs, table section, footer, and helpers are extracted under components/attendance.

  return (
    <div className="p-4 space-y-4">
      <div className="w-full flex justify-center">
        <div className="flex flex-wrap justify-center gap-3">
          {!isTeacher && (
            <Tabs
              value={rosterScope}
              onChange={setRosterScope}
              options={[
                { value: 'current', label: 'Students: Active now' },
                { value: 'asOf', label: 'Students: On selected date' },
              ]}
            />
          )}

          {!isTeacher && (
            <Tabs
              value={mode}
              onChange={(next) => {
              const hasDaily = Boolean(attMeta?.hasDaily);
              const hasLesson = Boolean(attMeta?.hasLesson);
              if (next === 'lesson' && hasDaily) {
                toast.error('Daily attendance already exists for this date. Switch Mode to All day to edit.');
                return;
              }
              if (next === 'daily' && hasLesson) {
                toast.error('Lesson attendance already exists for this date. Switch Mode to Per lesson to edit.');
                return;
              }
              setMode(next);
              }}
              options={[
                {
                  value: 'lesson',
                  label: 'Mode: Per lesson',
                  disabled: Boolean(attMeta?.hasDaily),
                  onDisabledClick: () => toast.error('Daily attendance already exists for this date. Switch Mode to All day to edit.'),
                },
                {
                  value: 'daily',
                  label: 'Mode: All day',
                  disabled: Boolean(attMeta?.hasLesson),
                  onDisabledClick: () => toast.error('Lesson attendance already exists for this date. Switch Mode to Per lesson to edit.'),
                },
              ]}
            />
          )}

          {!isTeacher && (
            <Tabs
              value={dateTab}
              onChange={(next) => {
                userChangedDateRef.current = true;
                setDateTab(next);
                if (next === 'custom') {
                  setCustomDate((v) => v || todayUTC);
                }
              }}
              options={[
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
          )}

          {!isTeacher && dateTab === 'custom' && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Date</label>
              <input
                type="date"
                className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={customDate}
                onChange={e => {
                  userChangedDateRef.current = true;
                  setCustomDate(e.target.value);
                }}
              />
            </div>
          )}

        </div>
      </div>

      {!isTeacher && sectionId && selectedDayLabel && (
        <div className="text-center text-sm text-gray-700">
          Day: {selectedDayLabel}
        </div>
      )}

      {/* Teacher header card removed; titles will follow page standard */}

      <DataToolbar
        filtersSlot={(
          <FilterRow>
            {isTeacher ? (
              <>
                {teacherAssignedGrades.length > 1 && (
                  <FilterItem minWidthClass="sm:min-w-44">
                    <DropdownSelect
                      value={gradeId}
                      onChange={(v) => { setGradeId(v); setShiftId(''); setSectionId(''); setSubjectId(''); clearForwardFromSection(); }}
                      options={teacherAssignedGrades}
                      placeholder={teacherAssignmentsLoading ? 'Loading…' : 'Level'}
                      disabled={teacherAssignmentsLoading}
                    />
                  </FilterItem>
                )}
                {teacherShiftOptions.length > 1 && (
                  <FilterItem minWidthClass="sm:min-w-40">
                    <FilterDropdownSelect
                      value={shiftId}
                      onChange={(v) => { setShiftId(v); setSectionId(''); setSubjectId(''); clearForwardFromSection(); }}
                      options={teacherShiftOptions}
                      placeholder={teacherAssignmentsLoading ? 'Loading…' : 'Shift'}
                      disabled={teacherAssignmentsLoading || (teacherMustPickGrade && !gradeId)}
                      searchPlaceholder="Search shifts…"
                    />
                  </FilterItem>
                )}
                <FilterItem minWidthClass="sm:min-w-60">
                  <FilterDropdownSelect
                    value={sectionId}
                    onChange={(v) => { setSectionId(v); setSubjectId(''); setPeriodCode(''); }}
                    options={(teacherFilteredSections || []).map((gs) => {
                      const sectionNum = gs?.section;
                      const shiftName = gs?.shift?.shiftName;
                      const base = sectionNum ? `Sec ${sectionNum}` : (gs?.sectionName || 'Section');
                      const label = shiftName ? `${base} - (${shiftName})` : base;
                      return { value: gs?._id, label };
                    })}
                    placeholder={teacherSectionsLoading ? 'Loading…' : 'Section'}
                    disabled={
                      teacherSectionsLoading
                      || (teacherMustPickGrade && !gradeId)
                      || (teacherShiftOptions.length > 1 && !shiftId)
                    }
                    searchPlaceholder="Search sections…"
                  />
                </FilterItem>
                {mode === 'lesson' && (
                  <FilterItem minWidthClass="sm:min-w-52">
                    <FilterDropdownSelect
                      value={subjectId}
                      onChange={(v) => { setSubjectId(v); setPeriodCode(''); }}
                      options={teacherSubjectsForSection}
                      placeholder={teacherAssignmentsLoading ? 'Loading…' : 'Subject'}
                      disabled={teacherAssignmentsLoading || teacherSubjectsForSection.length === 0}
                      searchPlaceholder="Search subjects…"
                    />
                  </FilterItem>
                )}
              </>
            ) : (
              <>
                <FilterItem minWidthClass="sm:min-w-44">
                  <GradeSelect value={gradeId} onChange={handleAdminGradeChange} placeholder="Level" />
                </FilterItem>
                <FilterItem minWidthClass="sm:min-w-40">
                  <ShiftSelect value={shiftId} onChange={handleAdminShiftChange} placeholder="Shift" />
                </FilterItem>
                <FilterItem minWidthClass="sm:min-w-60">
                  <GradeSectionSelect
                    value={sectionId}
                    onChange={handleAdminSectionChange}
                    gradeId={gradeId}
                    shiftId={shiftId}
                    placeholder="Section"
                    toastOnEmpty
                    toastOnEmptyMessage="No classes (sections) exist for the selected level and shift."
                    toastKeyPrefix="AttendancePage"
                  />
                </FilterItem>
              </>
            )}

            {mode === 'lesson' && sectionId && (
              <FilterItem minWidthClass="sm:min-w-60">
                <FilterDropdownSelect
                  value={periodCode}
                  onChange={setPeriodCode}
                  options={periodOptions}
                  placeholder="Period"
                  disabled={
                    dayOfWeek == null
                    || (isTeacher && !subjectId)
                    || periodOptions.length === 0
                  }
                  searchPlaceholder="Search periods…"
                />
              </FilterItem>
            )}
          </FilterRow>
        )}
        onReset={() => {
          setGradeId('');
          setShiftId('');
          setSectionId('');
          setSubjectId('');
          setDateTab('today');
          setCustomDate(todayUTC);
          setRosterScope('current');
          setMode('lesson');
          setPeriodCode('');
          setRows([]);
          setLoaded(false);
          setSelectionHasRecords(false);
        }}
      />

      {!canAct && (
        <div className="text-sm text-gray-600">
          {mode === 'lesson'
            ? (isTeacher
              ? 'Select Level, Section, Subject, and Period to load students.'
              : 'Select Level, Shift, Section, and Period to load students.')
            : 'Select Level, Shift, and Section to load students.'}
        </div>
      )}

      <AttendanceTable
        canAct={canAct}
        canEdit={effectiveCanEditForTable}
        loading={isTableLoading}
        rows={rows}
        showAuditColumns={!isTeacher}
        onChangeStatus={setStudentStatus}
        onChangeRemarks={setStudentRemarks}
        onPickExtraStatus={(studentId, label) => {
          setStudentStatus(studentId, label);
          // Only "Other" needs typed reason; others keep empty remarks.
          setStudentRemarks(studentId, label === 'other' ? '' : '');
        }}
      />

      <AttendanceFooter
        canAct={canEdit}
        isBusy={Boolean(loadingAttendance || detectingMode)}
        saving={saving}
        onSave={saveBulk}
        saveDisabled={Boolean(blockedSaveReason)}
        onBlockedSave={() => toast.error(blockedSaveReason || 'You cannot save right now.')}
        loaded={loaded}
        dirty={dirty}
        selectionHasRecords={selectionHasRecords}
        lastSavedAt={lastSavedAt}
        selectedDate={selectedDate}
        mode={mode}
        presentCount={presentCount}
        absentCount={absentCount}
        lateCount={lateCount}
        excusedCount={excusedCount}
      />
    </div>
  );
}
