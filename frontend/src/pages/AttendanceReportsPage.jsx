import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

import DataToolbar from '../components/common/DataToolbar/DataToolbar';
import FilterSelect from '../components/common/DataToolbar/FilterSelect';
import GradeSelect from '../components/lookups/GradeSelect';
import ShiftSelect from '../components/lookups/ShiftSelect';
import GradeSectionSelect from '../components/lookups/GradeSectionSelect';
import TableShell from '../components/common/table/TableShell';

import { getAttendanceReportDetails, getAttendanceReportSummary } from '../api/modules/attendanceReports';
import { getSlots } from '../api/modules/timetable';

export default function AttendanceReportsPage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [gradeId, setGradeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  // Single-table UX: user chooses which dataset to show.
  // - summary-daily: totals per date for DAY
  // - summary-lesson: totals per date+period for per-period
  // - details-daily: student list for a date (DAY)
  // - details-lesson: student list for a date+period
  // Default: per-period summary (Lesson)
  const [view, setView] = useState('summary-lesson');

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState(null);
  const [detailsDate, setDetailsDate] = useState(today);
  const [detailsPeriodCode, setDetailsPeriodCode] = useState('');
  const [periodOptions, setPeriodOptions] = useState([]);
  // Roster source for reports
  // - current: active enrollments now
  // - asOf: enrollment membership on the selected date (or overlapping the selected range for summaries)
  const [rosterScope, setRosterScope] = useState('current');

  const isSummary = view.startsWith('summary');
  const isDetails = view.startsWith('details');
  const detailsMode = view === 'details-lesson' ? 'lesson' : 'daily';
  const summaryMode = view === 'summary-lesson' ? 'lesson' : 'daily';

  const canRun = isSummary
    ? Boolean(sectionId && from && to)
    : Boolean(sectionId && detailsDate && (detailsMode === 'daily' || detailsPeriodCode));

  const jsDay = useMemo(() => {
    const d = new Date(detailsDate);
    return Number.isNaN(d.getTime()) ? null : d.getDay();
  }, [detailsDate]);

  const dayOfWeek = useMemo(() => {
    if (jsDay == null) return null;
    // Convert JS day (Sun=0..Sat=6) to project day (Sat=0..Fri=6)
    return (jsDay + 1) % 7;
  }, [jsDay]);

  async function runSummary() {
    if (!sectionId || !from || !to) {
      toast.error('Please select Level, Shift, Section, and date range');
      return;
    }

    setLoading(true);
    try {
      const res = await getAttendanceReportSummary({
        gradeSectionId: sectionId,
        from,
        to,
        mode: summaryMode,
        rosterScope,
      });
      setReport(res);
    } catch (e) {
      toast.error(e?.data?.message || e?.message || 'Failed to load report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const run = async () => {
      if (!sectionId || detailsMode !== 'lesson' || dayOfWeek == null) {
        setPeriodOptions([]);
        setDetailsPeriodCode('');
        return;
      }
      try {
        const res = await getSlots({ gs: sectionId });
        const all = res?.data || [];
        const daySlots = all
          .filter(s => Number(s.dayOfWeek) === Number(dayOfWeek))
          .filter(s => !s.isBreak)
          .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));

        const opts = daySlots.map(s => {
          const code = `${s.startTime}-${s.endTime}`;
          const label = `${s.startTime}-${s.endTime} • ${s.subject?.subjectName || 'Subject'}${s.teacher?.fullName ? ` • ${s.teacher.fullName}` : ''}`;
          return { value: code, label };
        });

        setPeriodOptions(opts);
        if (opts.length && !opts.some(o => o.value === detailsPeriodCode)) {
          setDetailsPeriodCode(opts[0].value);
        }
        if (!opts.length) setDetailsPeriodCode('');
      } catch {
        setPeriodOptions([]);
        setDetailsPeriodCode('');
      }
    };
    run();
  }, [sectionId, detailsMode, dayOfWeek]);

  async function loadDetails() {
    if (!sectionId || !detailsDate || (detailsMode === 'lesson' && !detailsPeriodCode)) {
      toast.error(`Please select Level, Shift, Section, Date${detailsMode === 'lesson' ? ', and Period' : ''}`);
      return;
    }
    setDetailsLoading(true);
    try {
      const res = await getAttendanceReportDetails({
        gradeSectionId: sectionId,
        date: detailsDate,
        mode: detailsMode,
        ...(detailsMode === 'lesson' ? { periodCode: detailsPeriodCode } : {}),
        rosterScope,
      });
      setDetails(res);
    } catch (e) {
      toast.error(e?.data?.message || e?.message || 'Failed to load details');
      setDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  // Auto-run on filter changes (debounced) — no Run button.
  useEffect(() => {
    if (!canRun) return;

    const t = setTimeout(() => {
      if (isSummary) {
        runSummary();
      } else {
        loadDetails();
      }
    }, 250);

    return () => clearTimeout(t);
  }, [
    view,
    canRun,
    sectionId,
    from,
    to,
    detailsDate,
    detailsPeriodCode,
    rosterScope,
  ]);

  function AttendanceBadge({ status }) {
    const norm = String(status || '').toLowerCase();
    const cls =
      norm === 'present' ? 'bg-green-100 text-green-700' :
      norm === 'absent' ? 'bg-red-100 text-red-700' :
      norm === 'late' ? 'bg-amber-100 text-amber-800' :
      norm === 'excused' ? 'bg-slate-100 text-slate-700' :
      'bg-slate-100 text-slate-700';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
        {status}
      </span>
    );
  }

  const meta = report?.meta || null;
  const dailySummary = report?.daily || [];
  const lessonSummary = report?.lesson || [];
  const detailsRows = Array.isArray(details?.data) ? details.data : [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Attendance Reports</h1>
          <div className="mt-1 text-xs text-gray-600">Summary and advanced details in a single view</div>
        </div>
      </div>

      <DataToolbar
        filtersSlot={(
          <div className="flex flex-wrap items-center gap-2">
            <GradeSelect value={gradeId} onChange={setGradeId} placeholder="Level" />
            <ShiftSelect value={shiftId} onChange={setShiftId} placeholder="Shift" />
            <GradeSectionSelect value={sectionId} onChange={setSectionId} gradeId={gradeId} shiftId={shiftId} placeholder="Section" />

            <FilterSelect
              value={view}
              onChange={(v) => {
                // Prevent empty selection; keep a valid view always
                if (!v) return;
                setView(v);
                // Clear stale output when switching between summary/details.
                if (String(v).startsWith('summary')) {
                  setDetails(null);
                } else {
                  setReport(null);
                }
              }}
              options={[
                { value: 'summary-daily', label: 'Summary: Daily (DAY)' },
                { value: 'summary-lesson', label: 'Summary: Lesson (Per Period)' },
                { value: 'details-daily', label: 'Details: Daily (Student List)' },
                { value: 'details-lesson', label: 'Details: Lesson (Student List)' },
              ]}
              placeholder=""
              className="min-w-[240px]"
            />

            <FilterSelect
              value={rosterScope}
              onChange={(v) => {
                setRosterScope(v);
                setReport(null);
                setDetails(null);
              }}
              options={[
                { value: 'current', label: 'Roster: Current (Active Now)' },
                { value: 'asOf', label: 'Roster: As Of Date (Enrollment History)' },
              ]}
              placeholder=""
              className="min-w-[260px]"
              disabled={!sectionId}
            />

            {isSummary && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">From</label>
                  <input
                    type="date"
                    className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={from}
                    onChange={e => setFrom(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">To</label>
                  <input
                    type="date"
                    className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                  />
                </div>
              </>
            )}

            {isDetails && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Date</label>
                  <input
                    type="date"
                    className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={detailsDate}
                    onChange={e => setDetailsDate(e.target.value)}
                  />
                </div>

                {detailsMode === 'lesson' && (
                  <FilterSelect
                    value={detailsPeriodCode}
                    onChange={(v) => {
                      setDetailsPeriodCode(v);
                      setDetails(null);
                    }}
                    options={[{ value: '', label: 'Period' }, ...periodOptions]}
                    placeholder="Period"
                    className="min-w-[260px]"
                    disabled={!sectionId || dayOfWeek == null || periodOptions.length === 0}
                  />
                )}
              </>
            )}
          </div>
        )}
        onReset={() => {
          setGradeId('');
          setShiftId('');
          setSectionId('');
          setFrom(today);
          setTo(today);
          setView('summary-lesson');
          setReport(null);

          setDetails(null);
          setDetailsDate(today);
          setDetailsPeriodCode('');
          setPeriodOptions([]);
          setRosterScope('current');
        }}
      />

      {(loading || detailsLoading) && (
        <div className="text-sm text-gray-600">Loading…</div>
      )}

      {!loading && !detailsLoading && !sectionId && (
        <div className="text-sm text-gray-600">Select Level, Shift, and Section to view reports.</div>
      )}

      {!loading && isSummary && meta && (
        <div className="text-sm text-gray-700">
          Range: <span className="font-medium">{meta.from}</span> to <span className="font-medium">{meta.to}</span> · Roster count: <span className="font-medium">{meta.rosterCount}</span>
        </div>
      )}

      {!detailsLoading && isDetails && details?.meta && (
        <div className="text-sm text-gray-700">
          Date: <span className="font-medium">{details.meta.date}</span>
          {details.meta.mode === 'lesson' ? (<span> · Period: <span className="font-medium">{details.meta.periodCode}</span></span>) : null}
        </div>
      )}

      {!detailsLoading && isDetails && details?.counts && (
        <div className="text-sm text-gray-700">
          Summary: Present {details.counts.present} · Absent {details.counts.absent} · Late {details.counts.late} · Excused {details.counts.excused} · Total {details.counts.total}
        </div>
      )}

      <TableShell>
        {view === 'summary-daily' && (
          <>
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Present</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Absent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Late</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Excused</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Total Marked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(dailySummary || []).length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600" colSpan={6}>No daily attendance found.</td>
                </tr>
              ) : (dailySummary || []).map(r => (
                <tr key={r.date} className="odd:bg-white even:bg-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">{r.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-x border-gray-200">{r.present}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-x border-gray-200">{r.absent}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-x border-gray-200">{r.late}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-x border-gray-200">{r.excused}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-x border-gray-200">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </>
        )}

        {view === 'summary-lesson' && (
          <>
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Present</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Absent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Late</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Excused</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Total Marked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(lessonSummary || []).length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600" colSpan={7}>No lesson attendance found.</td>
                </tr>
              ) : (lessonSummary || []).map((r, idx) => (
                <tr key={`${r.date}-${r.periodCode}-${idx}`} className="odd:bg-white even:bg-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">{r.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">{r.periodCode}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-x border-gray-200">{r.present}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-x border-gray-200">{r.absent}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-x border-gray-200">{r.late}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-x border-gray-200">{r.excused}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-x border-gray-200">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </>
        )}

        {isDetails && (
          <>
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Student ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Full Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(detailsRows || []).length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-600" colSpan={4}>No attendance records found for this selection.</td>
                </tr>
              ) : (detailsRows || []).map(stu => (
                <tr key={stu._id} className="odd:bg-white even:bg-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">{stu.studentId}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200">{stu.fullName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200"><AttendanceBadge status={stu.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-x border-gray-200">{stu.remarks || ''}</td>
                </tr>
              ))}
            </tbody>
          </>
        )}
      </TableShell>
    </div>
  );
}
