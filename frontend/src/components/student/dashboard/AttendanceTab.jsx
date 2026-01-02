import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import PrintHeader from '../../print/PrintHeader';
import PrintFooter from '../../print/PrintFooter';
import LoadingState from '../../common/Feedback/LoadingState';
import { useAuth } from '../../../contexts/AuthContext';
import { getStudentAttendanceSelfWithOptions, getStudentSelfAttendanceWithOptions } from '../../../api/modules/attendance';
import { useQuery } from '@tanstack/react-query';

function isoDateOnly(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function subDays(date, days) {
  const dt = new Date(date);
  dt.setUTCDate(dt.getUTCDate() - Number(days || 0));
  return dt;
}

function statusLabel(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'not_marked') return 'Not marked';
  if (!v) return '-';
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function formatFullDayAndDate(dateKey) {
  const m = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(dateKey || '');
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(dt);
  } catch {
    return `${m[1]}-${m[2]}-${m[3]}`;
  }
}

function shouldHideRemarks(status) {
  const v = String(status || '').toLowerCase();
  return v === 'excused' || v === 'sick' || v === 'medical' || v === 'family' || v === 'other';
}

function statusClass(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'present') return 'text-green-700';
  if (v === 'late') return 'text-amber-700';
  if (v === 'absent') return 'text-red-700';
  if (v === 'excused' || v === 'sick' || v === 'medical' || v === 'family' || v === 'other') return 'text-blue-700';
  if (v === 'not_marked') return 'text-gray-500';
  return 'text-gray-700';
}

export default function AttendanceTab() {
  const { auth } = useAuth();
  const { studentId: paramStudentId } = useParams();
  const isStudentSelf = auth?.user?.role === 'student' && !paramStudentId;
  const studentId = paramStudentId || (auth?.user?.role === 'student' ? auth?.user?._id : null);

  const { from, to } = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 29);
    return { from: isoDateOnly(start), to: isoDateOnly(end) };
  }, []);

  const attendanceQuery = useQuery({
    queryKey: ['studentSelfAttendance', studentId || null, from, to],
    enabled: !!studentId,
    queryFn: async () => {
      const res = isStudentSelf
        ? await getStudentSelfAttendanceWithOptions({ from, to })
        : await getStudentAttendanceSelfWithOptions(studentId, { from, to });
      return Array.isArray(res?.data) ? res.data : [];
    },
  });

  const loading = attendanceQuery.isLoading;
  const error = attendanceQuery.isError ? 'Failed to load attendance' : '';
  const hasFetched = attendanceQuery.isFetched;
  const items = attendanceQuery.data || [];

  const groupedByDate = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const date = String(it?.date || '').trim();
      if (!date) continue;
      const list = map.get(date) || [];
      list.push(it);
      map.set(date, list);
    }
    // Sort items inside each day: daily first, then by periodCode
    for (const [date, list] of map) {
      list.sort((a, b) => {
        const am = String(a?.mode || '');
        const bm = String(b?.mode || '');
        if (am !== bm) return am === 'daily' ? -1 : 1;
        return String(a?.periodCode || '').localeCompare(String(b?.periodCode || ''));
      });
      map.set(date, list);
    }
    const dates = Array.from(map.keys()).sort((a, b) => String(b).localeCompare(String(a)));
    return dates.map(d => ({ date: d, items: map.get(d) || [] }));
  }, [items]);

  return (
    <div className="bg-white p-4 rounded shadow with-print-header with-print-footer">
      <PrintHeader />

      <div className="mb-4">
        <div className="border-l-4 border-blue-600 bg-blue-50 rounded px-3 py-2">
          <h2 className="text-lg font-semibold text-blue-900">Attendance</h2>
          <div className="text-xs text-blue-800/80 mt-0.5">
            Showing recorded attendance only
          </div>
        </div>
      </div>

      {loading && (
        <LoadingState variant="table" rows={8} columns={3} message="Loading attendance…" />
      )}

      {!loading && error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && hasFetched && groupedByDate.length === 0 && (
        <div className="text-lg font-semibold text-gray-800">
          No attendance has been recorded yet.
        </div>
      )}

      {!loading && !error && groupedByDate.length > 0 && (
        <div className="space-y-4">
          {groupedByDate.map((g) => (
            <div key={g.date} className="border border-blue-100 rounded-lg bg-white overflow-hidden shadow-sm">
              <div className="px-4 py-2 bg-gray-800 text-white">
                <div className="text-sm font-semibold">{formatFullDayAndDate(g.date)}</div>
                <div className="text-xs text-white/80 mt-0.5">{g.date}</div>
              </div>

              <div className="p-3">
                {g.items.some(it => String(it?.mode || '') === 'daily' || String(it?.periodCode || '') === 'DAY') ? (
                  (() => {
                    const daily = g.items.find(it => String(it?.mode || '') === 'daily' || String(it?.periodCode || '') === 'DAY');
                    const st = String(daily?.status || '');
                    const remarks = String(daily?.remarks || '').trim();
                    const showRemarks = remarks && !shouldHideRemarks(st);
                    return (
                      <div className="border border-blue-100 rounded-lg p-3 bg-white shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900">All day</div>
                            <div className="text-xs text-gray-500 mt-0.5">Attendance for the full day</div>
                          </div>
                          <div className={`text-sm font-semibold ${statusClass(st)} whitespace-nowrap`}>{statusLabel(st)}</div>
                        </div>
                        {showRemarks && (
                          <div className="text-xs text-gray-600 mt-2">{remarks}</div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-2">
                    {g.items.map((it, idx) => {
                      const subjectName = String(it?.subjectName || '').trim();
                      const teacherName = String(it?.teacherName || '').trim();
                      const timeLabel = (it?.startTime && it?.endTime)
                        ? `${it.startTime}-${it.endTime}`
                        : String(it?.periodCode || '');
                      const title = subjectName || 'Lesson';
                      const subtitle = [timeLabel, teacherName].filter(Boolean).join(' • ');
                      const st = String(it?.status || '');
                      const remarks = String(it?.remarks || '').trim();
                      const showRemarks = remarks && !shouldHideRemarks(st);

                      return (
                        <div key={`${g.date}-${idx}`} className="border border-blue-100 rounded-lg p-3 bg-white shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 truncate">{title}</div>
                              {subtitle && <div className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</div>}
                            </div>
                            <div className={`text-sm font-semibold ${statusClass(st)} whitespace-nowrap`}>{statusLabel(st)}</div>
                          </div>
                          {showRemarks && (
                            <div className="text-xs text-gray-600 mt-2">{remarks}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <PrintFooter />
    </div>
  );
}
