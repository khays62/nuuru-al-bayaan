import React, { useMemo, useState } from 'react';

const DND_SLOT_MIME = 'text/x-timetable-slot-id';

export default function TimetableGrid({
  slots = [],
  daysFilter = [],
  periods = [],
  onDelete,
  onMove,
  busy = false,
}) {
  const days = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'];

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
    if (busy) return;
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
    if (busy) return;
    // Allow drop
    e.preventDefault();
    try { e.dataTransfer.dropEffect = 'move'; } catch { /* ignore */ }
  };

  const onDragEnterCell = (dayIdx, period) => {
    if (busy) return;
    setActiveTarget(cellKey(dayIdx, period));
  };

  const onDragLeaveCell = (dayIdx, period) => {
    if (busy) return;
    const key = cellKey(dayIdx, period);
    setActiveTarget((prev) => (prev === key ? null : prev));
  };

  const onDrop = (e, targetDayIdx, period, targetSlotId) => {
    if (busy) return;
    e.preventDefault();
    setActiveTarget(null);
    const slotId = e.dataTransfer.getData(DND_SLOT_MIME) || e.dataTransfer.getData('text/plain');
    if (!slotId) return;
    if (typeof onMove !== 'function') return;
    onMove(String(slotId), {
      dayOfWeek: targetDayIdx,
      startTime: period.startTime,
      endTime: period.endTime,
    }, targetSlotId ? String(targetSlotId) : null);
  };

  if (!daysFilter.length) {
    return <tr><td className="px-3 py-2 text-sm text-gray-500" colSpan={Math.max(2, 1 + periods.length)}>No days selected.</td></tr>;
  }

  return (
    <>
      {daysFilter.map((idx) => (
        <tr key={idx} className="border-t align-top">
          <td className="px-3 py-2 font-medium whitespace-nowrap border-r">{days[idx]}</td>
          {periods.length === 0 ? (
            <td className="px-3 py-2 text-sm text-gray-500">No periods</td>
          ) : (
            periods.map((p, i) => {
              const cellSlot = findSlotForCell(idx, p);
              const k = cellKey(idx, p);
              const isActive = activeTarget === k;
              if (!cellSlot) {
                return (
                  <td
                    key={`${idx}-${i}`}
                    className={`px-3 py-6 border-l bg-gray-100 transition-colors ${isActive ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset' : ''}`}
                    onDragOver={onDragOver}
                    onDragEnter={() => onDragEnterCell(idx, p)}
                    onDragLeave={() => onDragLeaveCell(idx, p)}
                    onDrop={(e) => onDrop(e, idx, p, null)}
                  />
                );
              }
              return (
                <td
                  key={cellSlot._id}
                  className={`px-3 py-2 border-l transition-colors ${isActive ? 'bg-indigo-50 ring-2 ring-indigo-300 ring-inset' : ''}`}
                  onDragOver={onDragOver}
                  onDragEnter={() => onDragEnterCell(idx, p)}
                  onDragLeave={() => onDragLeaveCell(idx, p)}
                  onDrop={(e) => onDrop(e, idx, p, cellSlot?._id)}
                >
                  <div
                    draggable={!busy && !cellSlot.isBreak}
                    onDragStart={(e) => {
                      if (cellSlot.isBreak) return;
                      onDragStart(e, cellSlot._id);
                    }}
                    className={cellSlot.isBreak ? 'cursor-default' : 'cursor-move'}
                    title={cellSlot.isBreak ? 'Break (locked)' : 'Drag to move'}
                  >
                    {cellSlot.isBreak ? (
                      <div className="text-xs text-gray-500">Break</div>
                    ) : (
                      <>
                        <div className="text-sm font-medium">{cellSlot.subject?.subjectName || '-'}</div>
                        <div className="text-xs text-gray-600">{cellSlot.teacher?.fullName || '—'}{cellSlot.room ? ` • Room ${cellSlot.room}` : ''}</div>
                      </>
                    )}
                  </div>
                  <div className="mt-2 no-print">
                    <button className="px-2 py-1 text-xs border rounded text-red-600" onClick={() => onDelete && onDelete(cellSlot)}>Delete</button>
                  </div>
                </td>
              );
            })
          )}
        </tr>
      ))}
    </>
  );
}
