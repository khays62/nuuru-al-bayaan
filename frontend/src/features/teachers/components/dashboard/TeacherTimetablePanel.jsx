import React, { useEffect, useMemo } from 'react';
import StandardTable from '../../../../shared/components/table/StandardTable.jsx';
import TimetableGrid from '../../../timetable/components/TimetableGrid.jsx';
import { useAuth } from '../../../../auth/AuthContext';
import Card from '../../../../shared/components/ui/Card.jsx';
import { useI18n } from '../../../../i18n/useI18n';

const DAY_KEYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

function getTimetableDayIndexFromLocalDate(d = new Date()) {
  // TimetableGrid uses: 0=Saturday,1=Sunday,2=Monday,3=Tuesday,4=Wednesday,5=Thursday,6=Friday
  const js = d.getDay(); // 0=Sunday..6=Saturday
  if (js === 6) return 0; // Saturday
  if (js === 0) return 1; // Sunday
  return js + 1; // Monday..Friday
}

export default function TeacherTimetablePanel({
  sections,
  sectionId,
  setSectionId,
  sectionLabel,
  loading,
  error,
  slots,
  todaySlots,
  todayLoading,
  todayError,
  periods,
  displayDays,
  formatRangeWithAmPm,
  busy,
}) {
  const { auth } = useAuth();
  const { t } = useI18n();
  const teacherRef = auth?.user?.teacherRef || null;

  const TEACHER_SECTION_SESSION_KEY = 'teacher:timetable:selectedSectionId:v1';

  const todayInfo = useMemo(() => {
    const now = new Date();
    const todayIdx = getTimetableDayIndexFromLocalDate(now);
    const dateISO = (() => {
      try {
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      } catch {
        return '';
      }
    })();

    const list = (Array.isArray(todaySlots) ? todaySlots : [])
      .filter(s => Number(s?.dayOfWeek) === todayIdx)
      .filter(s => !s?.isBreak)
      .slice();

    list.sort((a, b) => {
      const sa = String(a?.startTime || '');
      const sb = String(b?.startTime || '');
      if (sa !== sb) return sa.localeCompare(sb);
      const ea = String(a?.endTime || '');
      const eb = String(b?.endTime || '');
      if (ea !== eb) return ea.localeCompare(eb);
      return String(a?._id || '').localeCompare(String(b?._id || ''));
    });

    const dayKey = DAY_KEYS[todayIdx];
    const dayDefault = dayKey ? (dayKey.charAt(0).toUpperCase() + dayKey.slice(1)) : '-';

    return {
      todayIdx,
      dayName: dayKey ? t(`common.days.long.${dayKey}`, { defaultValue: dayDefault }) : '-',
      dateISO,
      slots: list,
    };
  }, [todaySlots, t]);

  const slotSectionLabel = (slot) => {
    const gs = slot?.gradeSection;
    if (!gs) return '';
    const gradeName = gs?.grade?.gradeName;
    const sectionNum = gs?.section;
    const shiftName = gs?.shift?.shiftName;
    const sectionPrefix = t('teachers.dashboard.timetable.sectionPrefix', { defaultValue: 'Sec' });
    return [
      gradeName ? `${gradeName}` : null,
      sectionNum ? `${sectionPrefix} ${sectionNum}` : null,
      shiftName ? `(${shiftName})` : null,
    ].filter(Boolean).join(' - ');
  };

  const todayBody = (() => {
    if (todayLoading) {
      return <div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.timetable.fetchingToday', { defaultValue: "Fetching todayâ€™s scheduleâ€¦" })}</div>;
    }
    if (todayError) {
      return <div className="text-sm text-red-600">{String(todayError)}</div>;
    }
    if (!teacherRef) {
      return <div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.timetable.missingTeacherRef', { defaultValue: 'Teacher account is missing teacherRef.' })}</div>;
    }
    if (todayInfo.slots.length === 0) {
      return <div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.timetable.noClassesToday', { defaultValue: 'No classes scheduled for today.' })}</div>;
    }

    return (
      <div className="space-y-2">
        {todayInfo.slots.map((s) => {
          const time = typeof formatRangeWithAmPm === 'function'
            ? formatRangeWithAmPm(s?.startTime, s?.endTime)
            : `${String(s?.startTime || '').trim()} - ${String(s?.endTime || '').trim()}`.trim();
          const subject = String(s?.subject?.subjectName || '-').trim() || '-';
          const klass = slotSectionLabel(s) || t('teachers.dashboard.timetable.classFallback', { defaultValue: 'Class' });
          const room = s?.room ? `${t('common.room', { defaultValue: 'Room' })} ${s.room}` : '';
          const meta = [time, room].filter(Boolean).join(' - ');
          const key = String(s?._id || `${s?.dayOfWeek}_${s?.startTime}_${s?.endTime}_${klass}_${subject}`);
          return (
            <div key={key} className="border border-(--nb-color-border) rounded-lg p-3 bg-(--nb-color-accent-50) shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-(--nb-color-text) truncate">{subject}</div>
                  <div className="text-xs text-(--nb-color-muted) mt-0.5 truncate">{klass}</div>
                </div>
                {meta ? <div className="text-xs text-(--nb-color-muted) whitespace-nowrap">{meta}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    );
  })();

  useEffect(() => {
    const list = Array.isArray(sections) ? sections : [];
    if (list.length === 0) {
      if (sectionId) setSectionId('');
      return;
    }

    const hasCurrent = sectionId && list.some((s) => String(s?._id) === String(sectionId));
    if (hasCurrent) return;

    let saved = '';
    try { saved = String(sessionStorage.getItem(TEACHER_SECTION_SESSION_KEY) || ''); } catch { saved = ''; }
    const hasSaved = saved && list.some((s) => String(s?._id) === saved);
    setSectionId(hasSaved ? saved : String(list[0]?._id || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  useEffect(() => {
    if (!sectionId) return;
    try { sessionStorage.setItem(TEACHER_SECTION_SESSION_KEY, String(sectionId)); } catch { /* ignore */ }
  }, [sectionId]);

  return (
    <div className="no-print">
      <Card className="rounded-xl overflow-hidden mt-3">
        <div className="px-4 py-2 bg-(--nb-color-brand) text-white">
          <div className="font-semibold">{t('teachers.dashboard.timetable.todayTitle', { defaultValue: "Today's Schedule" })}</div>
          <div className="text-xs text-white/80 mt-0.5">
            {todayInfo.dayName}{todayInfo.dateISO ? ` - ${todayInfo.dateISO}` : ''}
          </div>
        </div>
        <div className="p-5">
          {todayBody}
        </div>
      </Card>

      <div className="flex flex-col lg:flex-row gap-4 mt-6">
        <Card className="w-full lg:w-80 p-4 rounded-lg">
          <div className="text-sm font-semibold text-(--nb-color-text)">{t('teachers.dashboard.timetable.assignedClassesTitle', { defaultValue: 'My Assigned Classes' })}</div>
          <div className="mt-3 space-y-2 max-h-96 overflow-auto">
            {(sections || []).length === 0 ? (
              <div className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.classes.empty', { defaultValue: 'No assigned classes.' })}</div>
            ) : (
              (sections || []).map((gs) => {
                const active = String(gs?._id) === String(sectionId);
                return (
                  <button
                    key={gs?._id}
                    type="button"
                    onClick={() => setSectionId(String(gs?._id || ''))}
                    className={
                      `w-full text-left px-3 py-2 rounded-md border text-sm ` +
                      (active
                        ? 'bg-(--nb-color-brand) text-white border-(--nb-color-brand)'
                        : 'bg-(--nb-color-bg-card) text-(--nb-color-text) border-(--nb-color-border) hover:bg-(--nb-color-brand-50)')
                    }
                  >
                    {sectionLabel?.(gs) || gs?.sectionName || t('teachers.dashboard.timetable.sectionFallback', { defaultValue: 'Section' })}
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <div className="flex-1">
          <Card className="rounded-lg overflow-hidden">
            <StandardTable
              isLoading={false}
              error={null}
              items={['__timetable__']}
              isEmpty={false}
              rows={[]}
              columns={[]}
              tableProps={{
                theadClassName: '',
                useDefaultHeaderStyles: false,
                renderHeader: () => (
                  <tr className="bg-(--nb-color-brand) text-white">
                    <th className="text-left px-3 py-2">{t('teachers.dashboard.timetable.table.day', { defaultValue: 'Day' })}</th>
                    {periods.length === 0 ? (
                      <th className="text-left px-3 py-2">{t('timetable.grid.noPeriods', { defaultValue: 'No periods' })}</th>
                    ) : (
                      periods.map((p, i) => (
                        <th key={i} className="text-left px-3 py-2">
                          {formatRangeWithAmPm(p.startTime, p.endTime)}
                        </th>
                      ))
                    )}
                  </tr>
                ),
                renderBody: () => (
                  <>
                    {loading && (
                      <tr><td className="px-3 py-2 text-sm text-(--nb-color-muted)" colSpan={2}>{t('teachers.dashboard.timetable.loadingSlots', { defaultValue: 'Loading slotsâ€¦' })}</td></tr>
                    )}
                    {!loading && error && (
                      <tr><td className="px-3 py-2 text-sm text-red-600" colSpan={2}>{String(error)}</td></tr>
                    )}
                    {!loading && !error && !sectionId && (
                      <tr><td className="px-3 py-2 text-sm text-(--nb-color-muted)" colSpan={Math.max(2, 1 + periods.length)}>{t('teachers.dashboard.timetable.selectClass', { defaultValue: 'Select a class to view timetable.' })}</td></tr>
                    )}
                    {!loading && !error && sectionId && (slots || []).length === 0 && (
                      <tr><td className="px-3 py-2 text-sm text-(--nb-color-muted)" colSpan={Math.max(2, 1 + periods.length)}>{t('teachers.dashboard.timetable.noSlotsForClass', { defaultValue: 'No timetable slots found for this class.' })}</td></tr>
                    )}
                    {!loading && !error && (slots || []).length > 0 && (
                      <TimetableGrid
                        slots={slots}
                        daysFilter={displayDays}
                        periods={periods}
                        onDelete={undefined}
                        onMove={undefined}
                        busy={busy}
                      />
                    )}
                  </>
                ),
              }}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
