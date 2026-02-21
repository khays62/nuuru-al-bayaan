import React, { useMemo, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';

const DND_SLOT_MIME = 'text/x-timetable-slot-id';

export default function TimetableGrid({
  slots = [],
  daysFilter = [],
  periods = [],
  onDelete,
  onMove,
  busy = false,
}) {
  const { t } = useI18n();

  const days = [
    t('common.days.long.saturday'),
    t('common.days.long.sunday'),
    t('common.days.long.monday'),
    t('common.days.long.tuesday'),
    t('common.days.long.wednesday'),
    t('common.days.long.thursday'),
    t('common.days.long.friday'),
  ];

  const canDnd = typeof onMove === 'function' && !busy;
  const canDelete = typeof onDelete === 'function' && !busy;

  const [activeTarget, setActiveTarget] = useState(null); // `${dayIdx}__${start}__${end}`

  const cellKey = useMemo(() => {
    return (dayIdx, period) => `${dayIdx}__${period.startTime}__${period.endTime}`;
  }, []);

  const byDay = new Map();
  daysFilter.forEach(d => byDay.set(d, []));
  for (const s of slots) {
    const d = s.dayOfWeek;
    if (typeof d !== 'number') continue;
    if (!byDay.has(d)) continue; // show only selected days
    byDay.get(d).push(s);
  }

  const findSlotForCell = (dayIdx, period) => {
    const list = byDay.get(dayIdx) || [];
    return list.find(s => s.startTime === period.startTime && s.endTime === period.endTime) || null;
  };

  const onDragStart = (e, slotId) => {
    if (!canDnd) return;
    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(DND_SLOT_MIME, String(slotId));
      // Fallback for some browsers
      e.dataTransfer.setData('text/plain', String(slotId));
    } catch {
      // ignore
    }
  };

  const onDragOver = (e) => {
    if (!canDnd) return;
    // Allow drop
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'move'; } catch { /* ignore */ }
  };

  const onDragEnterCell = (dayIdx, period) => {
    if (!canDnd) return;
    setActiveTarget(cellKey(dayIdx, period));
  };

  const onDragLeaveCell = (dayIdx, period) => {
    if (!canDnd) return;
    const key = cellKey(dayIdx, period);
    setActiveTarget((prev) => (prev === key ? null : prev));
  };

  const onDrop = (e, targetDayIdx, period, targetSlotId) => {
    if (!canDnd) return;
    e.preventDefault();
    setActiveTarget(null);
    const slotId = e.dataTransfer.getData(DND_SLOT_MIME) || e.dataTransfer.getData('text/plain');
    if (!slotId) return;
    onMove(String(slotId), {
      dayOfWeek: targetDayIdx,
      startTime: period.startTime,
      endTime: period.endTime,
    }, targetSlotId ? String(targetSlotId) : null);
  };

  if (!daysFilter.length) {
    return (
      <tr>
        <td className="px-3 py-2 text-sm text-(--nb-color-muted)" colSpan={Math.max(2, 1 + periods.length)}>
          {t('timetable.grid.noDaysSelected')}
        </td>
      </tr>
    );
  }

  return (
    <>
      {daysFilter.map((idx, rowIndex) => (
        <tr
          key={idx}
          className={`border-t border-(--nb-color-border) align-top ${rowIndex % 2 === 0 ? 'bg-(--nb-color-bg)' : 'bg-(--nb-color-bg-card)'} hover:bg-(--nb-color-brand-50)`}
        >
          <td
            className={`px-3 py-2 font-medium whitespace-nowrap border-r border-(--nb-color-border) sticky left-0 z-10 ${rowIndex % 2 === 0 ? 'bg-(--nb-color-bg)' : 'bg-(--nb-color-bg-card)'}`}
          >
            {days[idx]}
          </td>
          {periods.length === 0 ? (
            <td className="px-3 py-2 text-sm text-(--nb-color-muted)">{t('timetable.grid.noPeriods')}</td>
          ) : (
            periods.map((p, i) => {
              const cellSlot = findSlotForCell(idx, p);
              const k = cellKey(idx, p);
              const isActive = activeTarget === k;
              if (!cellSlot) {
                return (
                  <td
                    key={`${idx}-${i}`}
                    className={`px-3 py-6 border-l border-(--nb-color-border) transition-colors min-w-40 ${isActive ? 'bg-(--nb-color-brand-50) ring-2 ring-(--nb-color-accent) ring-inset' : ''}`}
                    onDragOver={canDnd ? onDragOver : undefined}
                    onDragEnter={canDnd ? (() => onDragEnterCell(idx, p)) : undefined}
                    onDragLeave={canDnd ? (() => onDragLeaveCell(idx, p)) : undefined}
                    onDrop={canDnd ? ((e) => onDrop(e, idx, p, null)) : undefined}
                  />
                );
              }
              return (
                <td
                  key={cellSlot._id}
                  className={`px-3 py-2 border-l border-(--nb-color-border) transition-colors min-w-40 ${cellSlot.isBreak ? 'bg-(--nb-color-bg)' : ''} ${isActive ? 'bg-(--nb-color-brand-50) ring-2 ring-(--nb-color-accent) ring-inset' : ''}`}
                  onDragOver={canDnd ? onDragOver : undefined}
                  onDragEnter={canDnd ? (() => onDragEnterCell(idx, p)) : undefined}
                  onDragLeave={canDnd ? (() => onDragLeaveCell(idx, p)) : undefined}
                  onDrop={canDnd ? ((e) => onDrop(e, idx, p, cellSlot?._id)) : undefined}
                >
                  <div
                    draggable={canDnd && !cellSlot.isBreak}
                    onDragStart={(e) => {
                      if (cellSlot.isBreak) return;
                      onDragStart(e, cellSlot._id);
                    }}
                    className={cellSlot.isBreak ? 'cursor-default' : (canDnd ? 'cursor-move' : 'cursor-default')}
                    title={cellSlot.isBreak ? t('timetable.grid.breakLocked') : (canDnd ? t('timetable.grid.dragToMove') : '')}
                  >
                    {cellSlot.isBreak ? (
                      <div className="text-xs text-(--nb-color-muted)">{t('timetable.grid.break')}</div>
                    ) : (
                      <>
                        <div className="text-sm font-medium">{cellSlot.subject?.subjectName || '-'}</div>
                        <div className="text-xs text-(--nb-color-muted)">{cellSlot.teacher?.fullName || '—'}{cellSlot.room ? ` • ${t('common.room')} ${cellSlot.room}` : ''}</div>
                      </>
                    )}
                  </div>
                  {canDelete && (
                    <div className="mt-2 no-print">
                      <button className="px-2 py-1 text-xs border rounded text-red-600" onClick={() => onDelete(cellSlot)}>{t('common.actions.delete')}</button>
                    </div>
                  )}
                </td>
              );
            })
          )}
        </tr>
      ))}
    </>
  );
}
