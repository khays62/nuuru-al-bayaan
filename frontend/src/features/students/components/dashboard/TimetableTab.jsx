import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import PrintHeader from '../../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../../shared/components/print/PrintFooter.jsx';
import LoadingState from '../../../../shared/components/ui/LoadingState.jsx';
import Card from '../../../../shared/components/ui/Card.jsx';
import StandardTable from '../../../../shared/components/table/StandardTable.jsx';
import TimetableGrid from '../../../timetable/components/TimetableGrid.jsx';
import { getStudentHistory } from '../../../../api';
import { getSlotsWithOptions } from '../../../timetable/api/timetable';
import { useAuth } from '../../../../auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { studentKeys } from '../../queryKeys';
import { useI18n } from '../../../../i18n/useI18n';

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
  const { t } = useI18n();

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
  const error = (historyQuery.isError || slotsQuery.isError) ? t('students.timetableTab.loadFailed') : '';

  const periods = useMemo(() => uniqPeriodsFromSlots(slots), [slots]);
  const days = useMemo(() => uniqDaysFromSlots(slots), [slots]);

  const todayInfo = useMemo(() => {
    const now = new Date();
    const todayIdx = getTimetableDayIndexFromLocalDate(now);
    const dayNames = [
      t('common.days.long.saturday'),
      t('common.days.long.sunday'),
      t('common.days.long.monday'),
      t('common.days.long.tuesday'),
      t('common.days.long.wednesday'),
      t('common.days.long.thursday'),
      t('common.days.long.friday'),
    ];
    const dayName = dayNames[todayIdx] || '';
    const dateISO = localISODateOnly(now);
    const todaysSlots = (Array.isArray(slots) ? slots : [])
      .filter(s => Number(s?.dayOfWeek) === todayIdx)
      .slice()
      .sort((a, b) => String(a?.startTime || '').localeCompare(String(b?.startTime || '')));
    return { todayIdx, dayName, dateISO, slots: todaysSlots };
  }, [slots, t]);

  return (
    <Card className="p-4 with-print-header with-print-footer">
      <PrintHeader />

      <div className="mb-4">
        <div className="border-l-4 border-(--nb-color-brand) bg-(--nb-color-brand-50) rounded px-3 py-2">
          <h2 className="text-lg font-semibold text-(--nb-color-fg)">{t('nav.timetable')}</h2>
          <div className="text-xs text-(--nb-color-muted) mt-0.5">{t('students.timetableTab.subtitle')}</div>
        </div>
      </div>

      {(classLoading || loading) && (
        <LoadingState variant="table" rows={6} columns={6} message={t('students.timetableTab.loading')} />
      )}

      {!loading && error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {!gradeSectionId && !error && !loading && !classLoading && (
        <div className="text-lg font-semibold text-(--nb-color-text)">{t('students.timetableTab.noActiveClass')}</div>
      )}

      {!loading && !error && gradeSectionId && (
        <>
          <div className="mb-4 border border-(--nb-color-border) rounded-lg bg-(--nb-color-bg-card) overflow-hidden shadow-sm">
            <div className="px-4 py-2 bg-(--nb-color-brand) text-white">
              <div className="font-semibold">{t('students.timetableTab.todayLabel')} {todayInfo.dayName || '-'}{todayInfo.dateISO ? ` • ${todayInfo.dateISO}` : ''}</div>
              <div className="text-xs text-white/80 mt-0.5">{t('students.timetableTab.todaySubtitle')}</div>
            </div>
            <div className="p-4">
              {todayInfo.slots.filter(s => !s?.isBreak).length === 0 ? (
                <div className="text-sm text-(--nb-color-muted)">{t('students.timetableTab.noClassesToday')}</div>
              ) : (
                (() => {
                  const byTeacher = new Map();
                  for (const s of todayInfo.slots) {
                    if (s?.isBreak) continue;
                    const teacherName = String(s?.teacher?.fullName || '-').trim() || '-';
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
                      {teacherCards.map((card) => (
                        <div key={card.teacherName} className="border border-(--nb-color-border) rounded-lg bg-(--nb-color-bg-card) shadow-sm overflow-hidden">
                          <div className="px-4 py-2 bg-(--nb-color-brand-50) text-(--nb-color-fg) border-b border-(--nb-color-border)">
                            <div className="font-semibold truncate">{card.teacherName}</div>
                            {card.subjects.length > 0 ? (
                              <div className="text-xs text-(--nb-color-muted) mt-0.5 truncate">{card.subjects.join(' • ')}</div>
                            ) : null}
                          </div>
                          <div className="p-4 space-y-2">
                            {card.items.map((s) => {
                              const time = `${String(s?.startTime || '').trim()} - ${String(s?.endTime || '').trim()}`.trim();
                              const subject = String(s?.subject?.subjectName || '-').trim() || '-';
                              const room = s?.room ? `${t('common.room')} ${s.room}` : '';
                              const meta = [time, room].filter(Boolean).join(' • ');
                              return (
                                <div key={String(s?._id || `${s?.dayOfWeek}_${s?.startTime}_${s?.endTime}_${subject}`)} className="border border-(--nb-color-border) rounded-lg p-3 bg-(--nb-color-bg-card)">
                                  <div className="font-medium text-(--nb-color-text) truncate">{subject}</div>
                                  {meta ? <div className="text-xs text-(--nb-color-muted) mt-0.5 truncate">{meta}</div> : null}
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
            <div className="text-lg font-semibold text-(--nb-color-text)">{t('students.timetableTab.empty')}</div>
          ) : (
            <StandardTable
              isLoading={false}
              error={null}
              items={['__timetable__']}
              isEmpty={false}
              rows={[]}
              columns={[]}
              tableProps={{
                shellClassName: 'shadow-sm ring-(--nb-color-border)',
                theadClassName: '',
                useDefaultHeaderStyles: false,
                renderHeader: () => (
                  <tr className="bg-(--nb-color-brand) text-white border-b border-(--nb-color-border)">
                    <th className="text-left px-3 py-2 whitespace-nowrap sticky left-0 z-10 bg-(--nb-color-brand)">{t('students.timetableTab.table.day')}</th>
                    {periods.length === 0 ? (
                      <th className="text-left px-3 py-2">{t('students.timetableTab.table.noPeriods')}</th>
                    ) : (
                      periods.map((p, i) => (
                        <th key={i} className="text-left px-3 py-2 whitespace-nowrap min-w-40">{formatPeriodLabel(p)}</th>
                      ))
                    )}
                  </tr>
                ),
                renderBody: () => (
                  <TimetableGrid
                    slots={slots}
                    daysFilter={days.length ? days : [0, 1, 2, 3, 4, 5, 6]}
                    periods={periods}
                  />
                ),
              }}
            />
          )}

          {slots.length > 0 && (
            (() => {
              const byTeacher = new Map();
              for (const s of slots) {
                if (s?.isBreak) continue;
                const teacherName = String(s?.teacher?.fullName || '-').trim() || '-';
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
                  <div className="mb-2 text-sm font-semibold text-(--nb-color-text)">{t('students.timetableTab.teachersAndSubjects')}</div>
                  <StandardTable
                    isLoading={false}
                    items={rows}
                    rows={rows}
                    emptyTitle={t('students.timetableTab.noTeachers')}
                    columns={[
                      {
                        key: 'teacherName',
                        label: t('students.timetableTab.table.teacher'),
                        thClassName: 'text-left px-3 py-2 whitespace-nowrap',
                        tdClassName: 'px-3 py-2 font-medium text-(--nb-color-text) whitespace-nowrap',
                      },
                      {
                        key: 'subjects',
                        label: t('students.timetableTab.table.subjects'),
                        thClassName: 'text-left px-3 py-2',
                        tdClassName: 'px-3 py-2 text-sm text-(--nb-color-text)',
                      },
                    ]}
                    getRowKey={(r) => r.teacherName}
                    renderCell={(r, col) => {
                      if (col.key === 'teacherName') return r.teacherName;
                      if (col.key === 'subjects') return r.subjects || '-';
                      return '';
                    }}
                    tableProps={{
                      theadClassName: 'bg-(--nb-color-brand-50) text-(--nb-color-fg) border-b border-(--nb-color-border)',
                      useDefaultHeaderStyles: false,
                      baseRowClassName: 'border-t',
                    }}
                  />
                </div>
              );
            })()
          )}
        </>
      )}

      <PrintFooter />
    </Card>
  );
}
