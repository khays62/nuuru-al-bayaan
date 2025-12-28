import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getAttendanceWithOptions, markAttendanceBulk } from '../api/modules/attendance';
import { getSlotsWithOptions } from '../api/modules/timetable';
import DataToolbar from '../components/common/DataToolbar/DataToolbar';
import FilterSelect from '../components/common/DataToolbar/FilterSelect';
import GradeSelect from '../components/lookups/GradeSelect';
import ShiftSelect from '../components/lookups/ShiftSelect';
import GradeSectionSelect from '../components/lookups/GradeSectionSelect';
import { useDebounce } from '../hooks/useDebounce';
import Tabs from '../components/attendance/Tabs';
import { clampRemarksWhileTyping } from '../components/attendance/remarks';
import AttendanceTable from '../components/attendance/AttendanceTable';
import AttendanceFooter from '../components/attendance/AttendanceFooter';

export default function AttendancePage() {
  const todayUTC = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const yesterdayUTC = useMemo(() => new Date(Date.now() - 86400000).toISOString().slice(0, 10), []);

  const [gradeId, setGradeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const [dateTab, setDateTab] = useState('today'); // 'today' | 'yesterday' | 'custom'
  const [customDate, setCustomDate] = useState(todayUTC);

  const selectedDate = useMemo(() => {
    if (dateTab === 'today') return todayUTC;
    if (dateTab === 'yesterday') return yesterdayUTC;
    return customDate;
  }, [dateTab, todayUTC, yesterdayUTC, customDate]);

  const [rosterScope, setRosterScope] = useState('current');

  const [mode, setMode] = useState('lesson'); // 'lesson' | 'daily'
  const [periodCode, setPeriodCode] = useState('');

  const [periodOptions, setPeriodOptions] = useState([]);
  const [periodMetaByCode, setPeriodMetaByCode] = useState({});

  const [preferredLessonPeriodCode, setPreferredLessonPeriodCode] = useState('');

  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [detectingMode, setDetectingMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [rows, setRows] = useState([]);
  const [attMeta, setAttMeta] = useState(null);

  const [selectionHasRecords, setSelectionHasRecords] = useState(false);

  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const toastGateRef = useRef({ key: '', at: 0 });

  const slotsAbortRef = useRef(null);
  const detectAbortRef = useRef(null);
  const attendanceAbortRef = useRef(null);

  const attendanceCacheRef = useRef(new Map());

  const userChangedDateRef = useRef(false);

  const periodCodeRef = useRef('');
  useEffect(() => {
    periodCodeRef.current = periodCode;
  }, [periodCode]);

  const prevGradeIdRef = useRef('');
  const prevShiftIdRef = useRef('');
  const prevSectionIdRef = useRef('');

  const clearForwardFromSection = () => {
    setPeriodCode('');
    setRows([]);
    setLoaded(false);
    setDirty(false);
    setLastSavedAt(null);
    setAttMeta(null);
    setSelectionHasRecords(false);
    setPreferredLessonPeriodCode('');
  };

  const querySectionId = useDebounce(sectionId, 250);
  const queryDate = useDebounce(selectedDate, 250);
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

  const toastWarning = (message) => {
    toast.custom(
      (t) => (
        <div
          className={
            `pointer-events-auto max-w-md w-full rounded-lg border border-amber-200 bg-amber-50 text-amber-900 shadow-sm ` +
            (t.visible ? 'opacity-100' : 'opacity-0')
          }
        >
          <div className="px-4 py-3 text-sm font-medium">
            {message}
          </div>
        </div>
      ),
      { duration: 4500 }
    );
  };

  const allowToast = (key) => {
    const now = Date.now();
    const prev = toastGateRef.current || { key: '', at: 0 };
    // Only suppress exact duplicates that occur immediately (due to rapid rerenders).
    if (prev.key === key && (now - prev.at) < 1200) return false;
    toastGateRef.current = { key, at: now };
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

  useEffect(() => {
    const run = async () => {
      if (!querySectionId || dayOfWeek == null) {
        setPeriodOptions([]);
        setPeriodMetaByCode({});
        if (mode === 'lesson') setPeriodCode('');
        return;
      }
      try {
        if (slotsAbortRef.current) slotsAbortRef.current.abort();
        const ac = new AbortController();
        slotsAbortRef.current = ac;

        const res = await getSlotsWithOptions({ gs: querySectionId }, { signal: ac.signal });
        const all = res?.data || [];

        const anyLesson = all.some(s => !s.isBreak);

        const nonBreak = all.filter(s => !s.isBreak);
        // Prefer the project's convention (Sat=0..Fri=6), but fall back to JS convention (Sun=0..Sat=6)
        // if it yields more lessons. This keeps Attendance robust even if older data used a different mapping.
        const daySlotsProject = nonBreak.filter(s => Number(s.dayOfWeek) === Number(dayOfWeek));
        const daySlotsJs = jsDayUTC == null
          ? []
          : nonBreak.filter(s => Number(s.dayOfWeek) === Number(jsDayUTC));
        const useProjectConvention = daySlotsProject.length >= daySlotsJs.length;
        const daySlots = (useProjectConvention ? daySlotsProject : daySlotsJs)
          .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));

        const dayLabel = selectedDayLabel;

        const options = [];
        const meta = {};
        for (const s of daySlots) {
          const code = `${s.startTime}-${s.endTime}`;

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

          options.push({
            value: code,
            label: `${fmt12(s.startTime)}-${fmt12(s.endTime)} • ${s.subject?.subjectName || 'Subject'}${s.teacher?.fullName ? ` • ${s.teacher.fullName}` : ''}`,
          });
          meta[code] = {
            startTime: s.startTime,
            endTime: s.endTime,
            subjectName: s.subject?.subjectName || '',
            teacherName: s.teacher?.fullName || '',
          };
        }

        // Put Day first as requested
        const optionsWithDay = options.map(o => ({
          ...o,
          label: dayLabel ? `${dayLabel} • ${o.label}` : o.label,
        }));

        setPeriodOptions(optionsWithDay);
        setPeriodMetaByCode(meta);

        // Day-specific timetable feedback
        // - If the class has no lessons at all, say so.
        // - Otherwise, if selected day has no periods, inform user (per selected date/day).
        const availableProjectDays = Array.from(new Set(nonBreak.map(s => Number(s.dayOfWeek))))
          .filter(n => Number.isInteger(n) && n >= 0 && n <= 6)
          .sort((a, b) => a - b);

        const selectedKey = useProjectConvention ? Number(dayOfWeek) : Number(jsDayUTC);
        const hasSelectedDayInTimetable = availableProjectDays.includes(selectedKey);

        const toastKeyBase = `${querySectionId}|${String(selectedKey)}|${String(selectedDayLabel || '')}`;
        // Only warn when user explicitly changes the date/day selection (not immediately on GS selection).
        if (userChangedDateRef.current) {
          if (!anyLesson) {
            const k = `${toastKeyBase}|no-any`;
            if (allowToast(k)) toastWarning('This class has no lessons scheduled in the timetable.');
          } else if (!hasSelectedDayInTimetable || daySlots.length === 0) {
            const k = `${toastKeyBase}|no-day|${mode}`;
            if (allowToast(k)) toastWarning(`No periods scheduled for this class on ${selectedDayLabel || 'this day'}.`);
          }
        }

        if (mode === 'lesson') {
          const wanted = preferredLessonPeriodCode || '';
          const hasWanted = wanted && options.some(o => o.value === wanted);
          const currentPeriod = String(periodCodeRef.current || '');
          if (hasWanted && currentPeriod !== wanted) {
            setPeriodCode(wanted);
          } else if (options.length && !options.some(o => o.value === currentPeriod)) {
            setPeriodCode(options[0].value);
          }
          if (!options.length) {
            setPeriodCode('');
          }
        }

      } catch (e) {
        if (e?.name === 'AbortError') return;
        setPeriodOptions([]);
        setPeriodMetaByCode({});
        if (mode === 'lesson') setPeriodCode('');
      }
    };
    run();
  }, [querySectionId, dayOfWeek, mode, jsDayUTC, preferredLessonPeriodCode]);

  const canAct = useMemo(() => {
    if (!sectionId) return false;
    if (mode === 'daily') return true;
    return Boolean(periodCode);
  }, [sectionId, mode, periodCode]);

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

        const res = await getAttendanceWithOptions({
          gradeSectionId: querySectionId,
          date: queryDate,
          periodCode: 'DAY',
          rosterScope: queryRosterScope,
        }, { signal: ac.signal });
        const meta = res?.meta || null;
        setAttMeta(meta);

        const hasDaily = Boolean(meta?.hasDaily);
        const hasLesson = Boolean(meta?.hasLesson);
        const lessonCodes = Array.isArray(meta?.lessonPeriodCodes) ? meta.lessonPeriodCodes : [];

        // Prefer the only existing mode (backend prevents mixing).
        if (hasLesson && !hasDaily && mode !== 'lesson') {
          setPreferredLessonPeriodCode(String(lessonCodes[0] || ''));
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
  }, [querySectionId, queryDate, queryRosterScope]);

  useEffect(() => {
    const load = async () => {
      const canQueryAct = Boolean(querySectionId) && (queryMode === 'daily' ? true : Boolean(queryPeriodCode));
      if (!canQueryAct) return;

      const effectivePeriod = queryMode === 'daily' ? 'DAY' : queryPeriodCode;
      const cacheKey = `${querySectionId}|${queryDate}|${queryRosterScope}|${queryMode}|${effectivePeriod}`;

      // SWR: show cached data immediately if available, then revalidate in background.
      const cached = attendanceCacheRef.current.get(cacheKey);
      if (cached && Array.isArray(cached.rows)) {
        setRows(cached.rows);
        setAttMeta(cached.meta || null);
        setSelectionHasRecords(Boolean(cached.meta?.hasSelectionRecords));
        setLoaded(true);
        setDirty(false);
        setLoadingAttendance(false);
      } else {
        setLoadingAttendance(true);
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

        attendanceCacheRef.current.set(cacheKey, { rows: normalized, meta: res?.meta || null, at: Date.now() });

        setRows(normalized);
        setAttMeta(res?.meta || null);
        setSelectionHasRecords(Boolean(res?.meta?.hasSelectionRecords));
        setLoaded(true);
        setDirty(false);
      } catch (e) {
        if (e?.name === 'AbortError') return;
        toast.error('Failed to load attendance');
      } finally {
        setLoadingAttendance(false);
      }
    };
    load();
  }, [querySectionId, queryMode, queryPeriodCode, queryDate, queryRosterScope]);

  function markAll(status) {
    if (!canAct) return;
    const needsReason = status === 'excused' || status === 'other';
    setRows(prev => prev.map(r => ({ ...r, status, remarks: needsReason ? (r.remarks || '') : '' })));
    setDirty(true);
  }

  function setStudentStatus(studentId, status) {
    const needsReason = status === 'excused' || status === 'other';
    setRows(prev => prev.map(r => (r._id === studentId ? { ...r, status, remarks: needsReason ? (r.remarks || '') : '' } : r)));
    setDirty(true);
  }

  function setStudentRemarks(studentId, remarks) {
    setRows(prev => prev.map(r => (
      r._id === studentId
        ? { ...r, remarks: clampRemarksWhileTyping(r.remarks || '', remarks, 40) }
        : r
    )));
    setDirty(true);
  }

  async function saveBulk() {
    if (!canAct) {
      toast.error(`Please select Level, Shift, Section${mode === 'lesson' ? ', and Period' : ''}`);
      return;
    }
    if (rows.length === 0) {
      toast.error('No roster loaded to save');
      return;
    }
    // Prevent double-save when nothing changed and this selection already has records.
    if (!dirty && selectionHasRecords) {
      toast.error('Attendance is already saved. Make a change if you want to save again.');
      return;
    }
    setSaving(true);
    try {
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
      toast.success('Attendance saved');
      setDirty(false);
      setLastSavedAt(Date.now());
      setSelectionHasRecords(true);
      setAttMeta((prev) => {
        const base = prev || {};
        if (mode === 'daily') {
          return { ...base, hasDaily: true, hasLesson: false, hasSelectionRecords: true, date: selectedDate, periodCode: 'DAY' };
        }
        return { ...base, hasDaily: false, hasLesson: true, hasSelectionRecords: true, date: selectedDate, periodCode: periodCode };
      });
    } catch (e) {
      if (e?.status === 409) {
        if (mode === 'daily') {
          toast.error('Lesson attendance already exists for this date. Switch Mode to Per lesson to edit.');
        } else {
          toast.error('Daily attendance already exists for this date. Switch Mode to Whole day to edit.');
        }
      } else {
        toast.error(e?.data?.message || e?.message || 'Failed to save attendance');
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

  const selectedPeriodMeta = useMemo(() => periodMetaByCode?.[periodCode] || null, [periodMetaByCode, periodCode]);

  const isTableLoading = Boolean(loadingAttendance || detectingMode);

  // Tabs, table section, footer, and helpers are extracted under components/attendance.

  return (
    <div className="p-4 space-y-4">
      <div className="w-full flex justify-center">
        <div className="flex flex-wrap justify-center gap-3">
          <Tabs
            value={rosterScope}
            onChange={setRosterScope}
            options={[
              { value: 'current', label: 'Students: Active now' },
              { value: 'asOf', label: 'Students: On selected date' },
            ]}
          />

          <Tabs
            value={mode}
            onChange={(next) => {
              const hasDaily = Boolean(attMeta?.hasDaily);
              const hasLesson = Boolean(attMeta?.hasLesson);
              if (next === 'lesson' && hasDaily) {
                toast.error('Daily attendance already exists for this date. Switch Mode to Whole day to edit.');
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
                onDisabledClick: () => toast.error('Daily attendance already exists for this date. Switch Mode to Whole day to edit.'),
              },
              {
                value: 'daily',
                label: 'Mode: Whole day',
                disabled: Boolean(attMeta?.hasLesson),
                onDisabledClick: () => toast.error('Lesson attendance already exists for this date. Switch Mode to Per lesson to edit.'),
              },
            ]}
          />

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

          {dateTab === 'custom' && (
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

      {sectionId && selectedDayLabel && (
        <div className="text-center text-sm text-gray-700">
          Day: {selectedDayLabel}
        </div>
      )}

      <DataToolbar
        filtersSlot={(
          <div className="w-full flex flex-wrap items-center gap-2">
            <GradeSelect value={gradeId} onChange={setGradeId} placeholder="Level" />
            <ShiftSelect value={shiftId} onChange={setShiftId} placeholder="Shift" />
            <GradeSectionSelect value={sectionId} onChange={setSectionId} gradeId={gradeId} shiftId={shiftId} placeholder="Section" />

            {mode === 'lesson' && sectionId && (
              <FilterSelect
                value={periodCode}
                onChange={setPeriodCode}
                options={periodOptions}
                placeholder="Period"
                className="min-w-60"
                disabled={dayOfWeek == null || periodOptions.length === 0}
              />
            )}
          </div>
        )}
        onReset={() => {
          setGradeId('');
          setShiftId('');
          setSectionId('');
          setDateTab('today');
          setCustomDate(todayUTC);
          setRosterScope('current');
          setMode('lesson');
          setPeriodCode('');
          setRows([]);
          setLoaded(false);
          setSelectionHasRecords(false);
          setPreferredLessonPeriodCode('');
        }}
      />

      {!canAct && (
        <div className="text-sm text-gray-600">Select Level, Shift, Section{mode === 'lesson' ? ', and Period' : ''} to load students.</div>
      )}

      <AttendanceTable
        canAct={canAct}
        loading={isTableLoading}
        rows={rows}
        onChangeStatus={setStudentStatus}
        onChangeRemarks={setStudentRemarks}
        onPickExtraStatus={(studentId, label) => {
          setStudentStatus(studentId, label);
          // Only "Other" needs typed reason; others keep empty remarks.
          setStudentRemarks(studentId, label === 'other' ? '' : '');
        }}
      />

      <AttendanceFooter
        canAct={canAct}
        isBusy={Boolean(loadingAttendance || detectingMode)}
        saving={saving}
        onSave={saveBulk}
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
