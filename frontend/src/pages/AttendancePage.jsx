import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getAttendance, markAttendanceBulk } from '../api/modules/attendance';
import { getSlots } from '../api/modules/timetable';
import DataToolbar from '../components/common/DataToolbar/DataToolbar';
import FilterSelect from '../components/common/DataToolbar/FilterSelect';
import GradeSelect from '../components/lookups/GradeSelect';
import ShiftSelect from '../components/lookups/ShiftSelect';
import GradeSectionSelect from '../components/lookups/GradeSectionSelect';
import TableShell from '../components/common/table/TableShell';
import ActionButton from '../components/common/ActionButton';

export default function AttendancePage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [gradeId, setGradeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const [selectedDate, setSelectedDate] = useState(today);
  const [rosterScope, setRosterScope] = useState('current');

  const [mode, setMode] = useState('lesson'); // 'lesson' | 'daily'
  const [periodCode, setPeriodCode] = useState('');

  const [periodOptions, setPeriodOptions] = useState([]);
  const [periodMetaByCode, setPeriodMetaByCode] = useState({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [rows, setRows] = useState([]);

  const jsDay = useMemo(() => {
    const d = new Date(selectedDate);
    return Number.isNaN(d.getTime()) ? null : d.getDay();
  }, [selectedDate]);

  const dayOfWeek = useMemo(() => {
    if (jsDay == null) return null;
    // Convert JS day (Sun=0..Sat=6) to project day (Sat=0..Fri=6)
    return (jsDay + 1) % 7;
  }, [jsDay]);

  useEffect(() => {
    if (mode === 'daily') {
      setPeriodCode('DAY');
    } else {
      if (periodCode === 'DAY') setPeriodCode('');
    }
  }, [mode]);

  useEffect(() => {
    const run = async () => {
      if (!sectionId || dayOfWeek == null) {
        setPeriodOptions([]);
        setPeriodMetaByCode({});
        if (mode === 'lesson') setPeriodCode('');
        return;
      }
      try {
        const res = await getSlots({ gs: sectionId });
        const all = res?.data || [];
        const daySlots = all
          .filter(s => Number(s.dayOfWeek) === Number(dayOfWeek))
          .filter(s => !s.isBreak)
          .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));

        const options = [];
        const meta = {};
        for (const s of daySlots) {
          const code = `${s.startTime}-${s.endTime}`;
          options.push({
            value: code,
            label: `${s.startTime}-${s.endTime} • ${s.subject?.subjectName || 'Subject'}${s.teacher?.fullName ? ` • ${s.teacher.fullName}` : ''}`,
          });
          meta[code] = {
            startTime: s.startTime,
            endTime: s.endTime,
            subjectName: s.subject?.subjectName || '',
            teacherName: s.teacher?.fullName || '',
          };
        }

        setPeriodOptions(options);
        setPeriodMetaByCode(meta);

        if (mode === 'lesson') {
          if (options.length && !options.some(o => o.value === periodCode)) {
            setPeriodCode(options[0].value);
          }
          if (!options.length) {
            setPeriodCode('');
          }
        }
      } catch {
        setPeriodOptions([]);
        setPeriodMetaByCode({});
        if (mode === 'lesson') setPeriodCode('');
      }
    };
    run();
  }, [sectionId, dayOfWeek, mode, periodCode]);

  const canAct = useMemo(() => {
    if (!sectionId) return false;
    if (mode === 'daily') return true;
    return Boolean(periodCode);
  }, [sectionId, mode, periodCode]);

  useEffect(() => {
    const load = async () => {
      if (!canAct) return;
      setLoading(true);
      try {
        const res = await getAttendance({
          gradeSectionId: sectionId,
          date: selectedDate,
          periodCode: mode === 'daily' ? 'DAY' : periodCode,
          rosterScope,
        });
        const list = res?.data || [];
        setRows(list.map(stu => ({ ...stu, status: stu.status || 'absent' })));
        setLoaded(true);
      } catch {
        toast.error('Failed to load attendance');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [canAct, sectionId, mode, periodCode, selectedDate, rosterScope]);

  function markAll(status) {
    if (!canAct) return;
    setRows(prev => prev.map(r => ({ ...r, status })));
  }

  function setStudentStatus(studentId, status) {
    setRows(prev => prev.map(r => (r._id === studentId ? { ...r, status } : r)));
  }

  function StatusPills({ value, onChange }) {
    const opts = [
      { value: 'present', label: 'Present' },
      { value: 'absent', label: 'Absent' },
      { value: 'late', label: 'Late' },
      { value: 'excused', label: 'Excused' },
    ];
    return (
      <div className="inline-flex rounded-md border border-gray-300 overflow-hidden bg-white">
        {opts.map(o => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={
                `px-2.5 py-1 text-xs font-medium border-r last:border-r-0 ` +
                (active
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50')
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
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
    setSaving(true);
    try {
      const payload = rows.map(r => ({ studentId: r._id, status: r.status }));
      await markAttendanceBulk({
        gradeSectionId: sectionId,
        date: selectedDate,
        periodCode: mode === 'daily' ? 'DAY' : periodCode,
        items: payload,
      });
      toast.success('Attendance saved');
    } catch (e) {
      toast.error(e?.data?.message || e?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  }

  const presentCount = useMemo(() => rows.filter(r => r.status === 'present').length, [rows]);
  const absentCount = useMemo(() => rows.filter(r => r.status === 'absent').length, [rows]);
  const lateCount = useMemo(() => rows.filter(r => r.status === 'late').length, [rows]);
  const excusedCount = useMemo(() => rows.filter(r => r.status === 'excused').length, [rows]);

  const selectedPeriodMeta = useMemo(() => periodMetaByCode?.[periodCode] || null, [periodMetaByCode, periodCode]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Attendance</h1>
          <div className="mt-1 text-xs text-gray-600">Date: {selectedDate}</div>
          {mode === 'lesson' && selectedPeriodMeta && (
            <div className="mt-1 text-xs text-gray-600">
              {selectedPeriodMeta.subjectName || 'Subject'}{selectedPeriodMeta.teacherName ? ` • ${selectedPeriodMeta.teacherName}` : ''}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <ActionButton variant="secondary" disabled={!canAct || loading} onClick={() => markAll('present')}>Mark All Present</ActionButton>
          <ActionButton variant="secondary" disabled={!canAct || loading} onClick={() => markAll('absent')}>Mark All Absent</ActionButton>
          <ActionButton variant="primary" disabled={!canAct || loading} loading={saving} onClick={saveBulk}>Save</ActionButton>
        </div>
      </div>

      <DataToolbar
        filtersSlot={(
          <div className="flex flex-wrap items-center gap-2">
            <GradeSelect value={gradeId} onChange={setGradeId} placeholder="Level" />
            <ShiftSelect value={shiftId} onChange={setShiftId} placeholder="Shift" />
            <GradeSectionSelect value={sectionId} onChange={setSectionId} gradeId={gradeId} shiftId={shiftId} placeholder="Section" />

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Date</label>
              <input
                type="date"
                className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>

            <FilterSelect
              value={rosterScope}
              onChange={setRosterScope}
              options={[
                { value: 'current', label: 'Roster: Current (Active Now)' },
                { value: 'asOf', label: 'Roster: As Of Date (Enrollment History)' },
              ]}
              placeholder=""
              className="min-w-[260px]"
              disabled={!sectionId}
            />

            <FilterSelect
              value={mode}
              onChange={setMode}
              options={[
                { value: 'lesson', label: 'Lesson (Per Period)' },
                { value: 'daily', label: 'Daily (Per Day)' },
              ]}
              placeholder="Mode"
              className="min-w-[180px]"
            />
            {mode === 'lesson' && (
              <FilterSelect
                value={periodCode}
                onChange={setPeriodCode}
                options={[{ value: '', label: 'Period' }, ...periodOptions]}
                placeholder="Period"
                className="min-w-[240px]"
                disabled={!sectionId || dayOfWeek == null || periodOptions.length === 0}
              />
            )}
          </div>
        )}
        onReset={() => {
          setGradeId('');
          setShiftId('');
          setSectionId('');
          setSelectedDate(today);
          setRosterScope('current');
          setMode('lesson');
          setPeriodCode('');
          setRows([]);
          setLoaded(false);
        }}
      />

      {!canAct && (
        <div className="text-sm text-gray-600">Select Level, Shift, Section{mode === 'lesson' ? ', and Period' : ''} to load students.</div>
      )}

      {canAct && (
        <TableShell>
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Student ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Full Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && (
              <tr>
                <td className="px-6 py-4 text-sm text-gray-600" colSpan={3}>Loading students…</td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-6 py-4 text-sm text-gray-600" colSpan={3}>No students found for this selection.</td>
              </tr>
            )}

            {!loading && rows.length > 0 && rows.map(stu => (
              <tr key={stu._id} className="odd:bg-white even:bg-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">{stu.studentId}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200">{stu.fullName}</td>
                <td className="px-6 py-4 whitespace-nowrap border-x border-gray-200">
                  <StatusPills value={stu.status} onChange={(next) => setStudentStatus(stu._id, next)} />
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <div className="text-sm text-gray-700">Summary: Present {presentCount} · Absent {absentCount} · Late {lateCount} · Excused {excusedCount}</div>
    </div>
  );
}
