import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import PrintHeader from '../../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../../shared/components/print/PrintFooter.jsx';
import LoadingState from '../../../../shared/components/feedback/LoadingState.jsx';
import TableShell from '../../../../shared/components/table/TableShell.jsx';
import TimetableGrid from '../../../timetable/components/TimetableGrid.jsx';
import { getStudentHistory } from '../../../../api';
import { getSlotsWithOptions } from '../../../timetable/api/timetable';
import { useAuth } from '../../../../auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { studentKeys } from '../../queryKeys';

function uniqPeriodsFromSlots(slots = []) {
  const seen = new Set();
  const list = [];
  for (const s of slots) {
    const startTime = String(s?.startTime || '').trim();
    const endTime = String(s?.endTime || '').trim();
    if (!startTime || !endTime) continue;
    const key = `${startTime}-${endTime}`;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({ startTime, endTime });
  }
  return list.sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
}

function uniqDaysFromSlots(slots = []) {
  const set = new Set();
  for (const s of slots) {
    const d = Number(s?.dayOfWeek);
    if (!Number.isNaN(d)) set.add(d);
  }
  return Array.from(set).sort((a, b) => a - b);
}

function formatPeriodLabel(p) {
  const s = String(p?.startTime || '');
  const e = String(p?.endTime || '');
  return `${s} - ${e}`;
}

function getTimetableDayIndexFromLocalDate(d = new Date()) {
  // TimetableGrid uses: 0=Saturday,1=Sunday,2=Monday,3=Tuesday,4=Wednesday,5=Thursday,6=Friday
  // JS Date.getDay(): 0=Sunday..6=Saturday
  const jsDay = d.getDay();
  return (jsDay + 1) % 7;
}

function localISODateOnly(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export default function TimetableTab() {
  const { studentId: paramStudentId } = useParams();
  const { auth } = useAuth();

  const studentIdFromAuth = useMemo(() => {
    const ref = auth?.user?.studentRef;
    if (!ref) return null;
    if (typeof ref === 'object' && ref._id) return ref._id;
    return ref;
  }, [auth?.user?.studentRef]);

  const studentId = paramStudentId || (auth?.user?.role === 'student' ? (studentIdFromAuth || null) : null);

  const historyQuery = useQuery({
    queryKey: studentKeys.history(studentId, { page: 1, limit: 1000 }),
    enabled: !!studentId,
    queryFn: async () => {
      const res = await getStudentHistory(studentId, { page: 1, limit: 1000 });
      return Array.isArray(res?.data) ? res.data : [];
    },
  });

  const gradeSectionId = useMemo(() => {
    const rows = historyQuery.data || [];
    const active = rows.find(r => String(r?.status || '').toLowerCase() === 'active' && !r?.leftAt);
    const chosen = active || rows[0] || null;
    const gsId = chosen?.gradeSection?._id || chosen?.gradeSection || null;
    return gsId ? String(gsId) : null;
  }, [historyQuery.data]);

  const slotsQuery = useQuery({
    queryKey: studentKeys.timetableSlotsByGradeSection(gradeSectionId),
    enabled: !!gradeSectionId,
    queryFn: async () => {
      const res = await getSlotsWithOptions({ gs: gradeSectionId });
      return Array.isArray(res?.data) ? res.data : [];
    },
  });

  const slots = slotsQuery.data || [];
  const classLoading = historyQuery.isLoading;
  const loading = slotsQuery.isLoading;
  const error = (historyQuery.isError || slotsQuery.isError) ? 'Failed to load timetable' : '';

  const periods = useMemo(() => uniqPeriodsFromSlots(slots), [slots]);
  const days = useMemo(() => uniqDaysFromSlots(slots), [slots]);

  const todayInfo = useMemo(() => {
    const now = new Date();
    const todayIdx = getTimetableDayIndexFromLocalDate(now);
    const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const dayName = dayNames[todayIdx] || '';
    const dateISO = localISODateOnly(now);
    const todaysSlots = (Array.isArray(slots) ? slots : [])
      .filter(s => Number(s?.dayOfWeek) === todayIdx)
      .slice()
      .sort((a, b) => String(a?.startTime || '').localeCompare(String(b?.startTime || '')));
    return { todayIdx, dayName, dateISO, slots: todaysSlots };
  }, [slots]);

  return (
    <div className="bg-white p-4 rounded shadow with-print-header with-print-footer">
      <PrintHeader />

      <div className="mb-4">
        <div className="border-l-4 border-blue-600 bg-blue-50 rounded px-3 py-2">
          <h2 className="text-lg font-semibold text-blue-900">Timetable</h2>
          <div className="text-xs text-blue-800/80 mt-0.5">Your class timetable</div>
        </div>
      </div>

      {(classLoading || loading) && (
        <LoadingState variant="table" rows={6} columns={6} message="Loading timetable…" />
      )}

      {!loading && error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {!gradeSectionId && !error && !loading && !classLoading && (
        <div className="text-lg font-semibold text-gray-800">No active class found for this student.</div>
      )}

      {!loading && !error && gradeSectionId && (
        <>
          <div className="mb-4 border border-blue-100 rounded-lg bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-2 bg-gray-800 text-white">
              <div className="font-semibold">Today: {todayInfo.dayName || '—'}{todayInfo.dateISO ? ` • ${todayInfo.dateISO}` : ''}</div>
              <div className="text-xs text-white/80 mt-0.5">Your classes for today</div>
            </div>
            <div className="p-4">
              {todayInfo.slots.filter(s => !s?.isBreak).length === 0 ? (
                <div className="text-sm text-gray-600">No classes scheduled for today.</div>
              ) : (
                (() => {
                  const byTeacher = new Map();
                  for (const s of todayInfo.slots) {
                    if (s?.isBreak) continue;
                    const teacherName = String(s?.teacher?.fullName || '—').trim() || '—';
                    const list = byTeacher.get(teacherName) || [];
                    list.push(s);
                    byTeacher.set(teacherName, list);
                  }

                  const teacherCards = Array.from(byTeacher.entries())
                    .map(([teacherName, list]) => {
                      const items = (Array.isArray(list) ? list : []).slice().sort((a, b) => String(a?.startTime || '').localeCompare(String(b?.startTime || '')));
                      const subjects = Array.from(new Set(items.map(it => String(it?.subject?.subjectName || '-').trim()).filter(Boolean)));
                      const firstStart = String(items?.[0]?.startTime || '').trim();
                      return { teacherName, items, subjects, firstStart };
                    })
                    .sort((a, b) => {
                      const at = String(a.firstStart || '');
                      const bt = String(b.firstStart || '');
                      if (at !== bt) return at.localeCompare(bt);
                      return a.teacherName.localeCompare(b.teacherName);
                    });

                  return (
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                      {teacherCards.map((t) => (
                        <div key={t.teacherName} className="border border-blue-100 rounded-lg bg-white shadow-sm overflow-hidden">
                          <div className="px-4 py-2 bg-blue-50 text-blue-900 border-b border-blue-100">
                            <div className="font-semibold truncate">{t.teacherName}</div>
                            {t.subjects.length > 0 ? (
                              <div className="text-xs text-blue-900/70 mt-0.5 truncate">{t.subjects.join(' • ')}</div>
                            ) : null}
                          </div>
                          <div className="p-4 space-y-2">
                            {t.items.map((s) => {
                              const time = `${String(s?.startTime || '').trim()} - ${String(s?.endTime || '').trim()}`.trim();
                              const subject = String(s?.subject?.subjectName || '-').trim() || '-';
                              const room = s?.room ? `Room ${s.room}` : '';
                              const meta = [time, room].filter(Boolean).join(' • ');
                              return (
                                <div key={String(s?._id || `${s?.dayOfWeek}_${s?.startTime}_${s?.endTime}_${subject}`)} className="border border-blue-100 rounded-lg p-3 bg-white">
                                  <div className="font-medium text-gray-900 truncate">{subject}</div>
                                  {meta ? <div className="text-xs text-gray-500 mt-0.5 truncate">{meta}</div> : null}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          {slots.length === 0 ? (
            <div className="text-lg font-semibold text-gray-800">No timetable has been created for your class yet.</div>
          ) : (
            <TableShell className="shadow-sm ring-blue-100">
              <thead>
                <tr className="bg-gray-800 text-white border-b border-gray-700">
                  <th className="text-left px-3 py-2 whitespace-nowrap sticky left-0 z-10 bg-gray-800">Day</th>
                  {periods.length === 0 ? (
                    <th className="text-left px-3 py-2">No periods</th>
                  ) : (
                    periods.map((p, i) => (
                      <th key={i} className="text-left px-3 py-2 whitespace-nowrap min-w-40">{formatPeriodLabel(p)}</th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                <TimetableGrid slots={slots} daysFilter={days.length ? days : [0, 1, 2, 3, 4, 5, 6]} periods={periods} />
              </tbody>
            </TableShell>
          )}

          {slots.length > 0 && (
            (() => {
              const byTeacher = new Map();
              for (const s of slots) {
                if (s?.isBreak) continue;
                const teacherName = String(s?.teacher?.fullName || '—').trim() || '—';
                const subject = String(s?.subject?.subjectName || '-').trim() || '-';
                const entry = byTeacher.get(teacherName) || { teacherName, subjects: new Set(), firstStart: '' };
                entry.subjects.add(subject);
                const st = String(s?.startTime || '').trim();
                if (!entry.firstStart || (st && st.localeCompare(entry.firstStart) < 0)) entry.firstStart = st;
                byTeacher.set(teacherName, entry);
              }

              const rows = Array.from(byTeacher.values())
                .map((r) => ({
                  teacherName: r.teacherName,
                  subjects: Array.from(r.subjects).filter(Boolean).sort((a, b) => a.localeCompare(b)).join(' • '),
                  firstStart: r.firstStart,
                }))
                .sort((a, b) => {
                  const at = String(a.firstStart || '');
                  const bt = String(b.firstStart || '');
                  if (at !== bt) return at.localeCompare(bt);
                  return a.teacherName.localeCompare(b.teacherName);
                });

              if (rows.length === 0) return null;

              return (
                <div className="mt-4">
                  <div className="mb-2 text-sm font-semibold text-gray-900">Teachers & Subjects</div>
                  <TableShell className="shadow-sm ring-blue-100">
                    <thead>
                      <tr className="bg-blue-50 text-blue-900 border-b border-blue-100">
                        <th className="text-left px-3 py-2 whitespace-nowrap">Teacher</th>
                        <th className="text-left px-3 py-2">Subjects</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.teacherName} className="border-t">
                          <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{r.teacherName}</td>
                          <td className="px-3 py-2 text-sm text-gray-700">{r.subjects || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </TableShell>
                </div>
              );
            })()
          )}
        </>
      )}

      <PrintFooter />
    </div>
  );
}
