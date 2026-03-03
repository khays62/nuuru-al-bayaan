import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import PrintHeader from '../../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../../shared/components/print/PrintFooter.jsx';
import LoadingState from '../../../../shared/components/ui/LoadingState.jsx';
import Card from '../../../../shared/components/ui/Card.jsx';
import { useAuth } from '../../../../auth/AuthContext';
import { getStudentAttendanceSelfWithOptions, getStudentSelfAttendanceWithOptions } from '../../../attendance/api/attendance';
import { useQuery } from '@tanstack/react-query';
import { studentKeys } from '../../queryKeys';
import { useI18n } from '../../../../i18n/useI18n';

function isoDateOnly(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function subDays(date, days) {
  const dt = new Date(date);
  dt.setUTCDate(dt.getUTCDate() - Number(days || 0));
  return dt;
}

function statusLabel(s, t) {
  const v = String(s || '').toLowerCase();
  if (v === 'not_marked') return t('students.attendance.status.notMarked');
  if (v === 'present') return t('students.attendance.status.present');
  if (v === 'absent') return t('students.attendance.status.absent');
  if (v === 'late') return t('students.attendance.status.late');
  if (v === 'excused' || v === 'sick' || v === 'medical' || v === 'family' || v === 'other') return t('students.attendance.status.excused');
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
  if (v === 'excused' || v === 'sick' || v === 'medical' || v === 'family' || v === 'other') return 'text-(--nb-color-brand)';
  if (v === 'not_marked') return 'text-(--nb-color-muted)';
  return 'text-(--nb-color-text)';
}

export default function AttendanceTab() {
  const { auth } = useAuth();
  const { t } = useI18n();
  const { studentId: paramStudentId } = useParams();
  const isStudentSelf = auth?.user?.role === 'student' && !paramStudentId;

  const studentIdFromAuth = useMemo(() => {
    const ref = auth?.user?.studentRef;
    if (!ref) return null;
    if (typeof ref === 'object' && ref._id) return ref._id;
    return ref;
  }, [auth?.user?.studentRef]);

  const studentId = paramStudentId || (auth?.user?.role === 'student' ? (studentIdFromAuth || null) : null);

  const { from, to } = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 29);
    return { from: isoDateOnly(start), to: isoDateOnly(end) };
  }, []);

  const attendanceQuery = useQuery({
    queryKey: isStudentSelf
      ? studentKeys.attendanceSelf({ from, to })
      : studentKeys.attendanceByStudent(studentId, { from, to }),
    enabled: isStudentSelf ? true : !!studentId,
    queryFn: async () => {
      const res = isStudentSelf
        ? await getStudentSelfAttendanceWithOptions({ from, to })
        : await getStudentAttendanceSelfWithOptions(studentId, { from, to });
      return Array.isArray(res?.data) ? res.data : [];
    },
  });

  const loading = attendanceQuery.isLoading;
  const error = attendanceQuery.isError ? t('students.attendanceTab.loadFailed') : '';
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
    <Card className="p-4 with-print-header with-print-footer">
      <PrintHeader />

      <div className="mb-4">
        <div className="border-l-4 border-(--nb-color-brand) bg-(--nb-color-brand-50) rounded px-3 py-2">
          <h2 className="text-lg font-semibold text-(--nb-color-fg)">{t('nav.attendance')}</h2>
          <div className="text-xs text-(--nb-color-muted) mt-0.5">
            {t('students.attendanceTab.subtitle')}
          </div>
        </div>
      </div>

      {loading && (
        <LoadingState variant="table" rows={8} columns={3} message={t('students.attendanceTab.loading')} />
      )}

      {!loading && error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && hasFetched && groupedByDate.length === 0 && (
        <div className="text-lg font-semibold text-(--nb-color-text)">
          {t('students.attendanceTab.empty')}
        </div>
      )}

      {!loading && !error && groupedByDate.length > 0 && (
        <div className="space-y-4">
          {groupedByDate.map((g) => (
            <div key={g.date} className="border border-(--nb-color-border) rounded-lg bg-(--nb-color-bg-card) overflow-hidden shadow-sm">
              <div className="px-4 py-2 bg-(--nb-color-brand) text-white">
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
                      <div className="border border-(--nb-color-border) rounded-lg p-3 bg-(--nb-color-bg-card) shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-(--nb-color-text)">{t('students.attendanceTab.allDay')}</div>
                            <div className="text-xs text-(--nb-color-muted) mt-0.5">{t('students.attendanceTab.allDaySubtitle')}</div>
                          </div>
                          <div className={`text-sm font-semibold ${statusClass(st)} whitespace-nowrap`}>{statusLabel(st, t)}</div>
                        </div>
                        {showRemarks && (
                          <div className="text-xs text-(--nb-color-muted) mt-2">{remarks}</div>
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
                      const title = subjectName || t('students.attendanceTab.lessonFallback');
                      const subtitle = [timeLabel, teacherName].filter(Boolean).join(' â€¢ ');
                      const st = String(it?.status || '');
                      const remarks = String(it?.remarks || '').trim();
                      const showRemarks = remarks && !shouldHideRemarks(st);

                      return (
                        <div key={`${g.date}-${idx}`} className="border border-(--nb-color-border) rounded-lg p-3 bg-(--nb-color-bg-card) shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-(--nb-color-text) truncate">{title}</div>
                              {subtitle && <div className="text-xs text-(--nb-color-muted) mt-0.5 truncate">{subtitle}</div>}
                            </div>
                            <div className={`text-sm font-semibold ${statusClass(st)} whitespace-nowrap`}>{statusLabel(st, t)}</div>
                          </div>
                          {showRemarks && (
                            <div className="text-xs text-(--nb-color-muted) mt-2">{remarks}</div>
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
    </Card>
  );
}
