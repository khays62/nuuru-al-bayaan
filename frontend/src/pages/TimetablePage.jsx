import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import DataToolbar from '../components/common/DataToolbar/DataToolbar';
import TableShell from '../components/common/table/TableShell';
import FilterSelect from '../components/common/DataToolbar/FilterSelect';
import MultiSelectDropdown from '../components/common/DataToolbar/MultiSelectDropdown.jsx';
import TimetableGrid from '../components/timetable/TimetableGrid.jsx';
import Modal from '../components/common/Modal';
import Spinner from '../components/common/Feedback/Spinner';
import ActionButton from '../components/common/ActionButton';
import PrintHeader from '../components/print/PrintHeader';
import PrintFooter from '../components/print/PrintFooter';
import { Download, Printer } from 'lucide-react';
import { getGrades, getShifts } from '../api/modules/lookups';
import { listGradeSections } from '../api/modules/gradeSections';
import { getSubjects } from '../api/modules/subjects';
import { getSlots, createSlot, createSlotsBulk, updateSlot, swapSlots, deleteSlot } from '../api/modules/timetable';
import { useAuth } from '../contexts/AuthContext';

export default function TimetablePage() {
  const { hasPermission } = useAuth();
  const canViewTimetable = hasPermission('timetable', 'view');
  const canAddTimetable = hasPermission('timetable', 'add');
  const canEditTimetable = hasPermission('timetable', 'edit');
  const canDeleteTimetable = hasPermission('timetable', 'delete');
  const canDownloadTimetable = hasPermission('timetable', 'download');
  const canPrintTimetable = hasPermission('timetable', 'print');

  const [gradeId, setGradeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [days, setDays] = useState([]); // numbers
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [room, setRoom] = useState('');
  const [isBreak, setIsBreak] = useState(false);
  const [addingSingle, setAddingSingle] = useState(false);
  const [addingBulk, setAddingBulk] = useState(false);

  const [grades, setGrades] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dndBusy, setDndBusy] = useState(false);
  const [swapUi, setSwapUi] = useState({ isOpen: false, aId: null, bId: null });

  const dayNames = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'];

  const formatTime12h = (t) => {
    const m = String(t || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return String(t || '');
    let hh = Number(m[1]);
    const mm = m[2];
    if (!Number.isFinite(hh)) return String(t || '');
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12;
    if (hh === 0) hh = 12;
    return `${hh}:${mm} ${ampm}`;
  };

  const isValidTime24h = (raw) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(raw || ''));

  const formatRangeWithAmPm = (start, end) => {
    const sOk = isValidTime24h(start);
    const eOk = isValidTime24h(end);
    if (!sOk || !eOk) return `${start || ''} - ${end || ''}`.trim();
    const s12 = formatTime12h(start);
    const e12 = formatTime12h(end);
    const sAmPm = String(s12).endsWith('PM') ? 'PM' : 'AM';
    const eAmPm = String(e12).endsWith('PM') ? 'PM' : 'AM';
    if (sAmPm === eAmPm) {
      // keep original 24h range but suffix with AM/PM once
      return `${start} - ${end} ${sAmPm}`;
    }
    return `${start} ${sAmPm} - ${end} ${eAmPm}`;
  };

  const formatConflictReason = (reason) => {
    const r = String(reason || '').toLowerCase();
    if (r.includes('gs')) return 'Class conflict';
    if (r.includes('teacher')) return 'Teacher conflict';
    if (r.includes('room')) return 'Room conflict';
    if (r.includes('invalid')) return 'Invalid day';
    return reason || 'Conflict';
  };

  useEffect(() => {
    (async () => {
      if (!canViewTimetable) return;
      try {
        const [g, s] = await Promise.all([getGrades(), getShifts()]);
        setGrades(g?.data || g || []);
        setShifts(s?.data || s || []);
      } catch (err) {
        console.warn('Failed to load lookups', err);
      }
    })();
  }, [canViewTimetable]);

  useEffect(() => {
    if (!canViewTimetable) return;
    if (!gradeId) { setSections([]); setSectionId(''); setSubjects([]); setSubjectId(''); return; }
    (async () => {
      try {
        const params = { grade: gradeId, limit: 200 };
        if (shiftId) params.shift = shiftId;
        const [secRes, subjRes] = await Promise.all([
          listGradeSections(params),
          getSubjects({ grade: gradeId, limit: 200 })
        ]);
        setSections(secRes?.data || []);
        setSubjects(subjRes?.data || []);
      } catch (err) {
        console.warn('Failed to load sections/subjects', err);
      }
    })();
  }, [gradeId, shiftId, canViewTimetable]);

  useEffect(() => {
    if (!canViewTimetable) return;
    if (!sectionId) { setSlots([]); return; }
    (async () => {
      try {
        setLoading(true); setError('');
        const res = await getSlots({ gs: sectionId });
        setSlots(res?.data || []);
      } catch (err) {
        console.warn('Failed to load timetable', err);
        setError('Failed to load timetable');
      }
      finally { setLoading(false); }
    })();
  }, [sectionId, canViewTimetable]);

  const onMove = async (slotId, target, targetSlotId) => {
    if (!sectionId) return;
    if (dndBusy) return;
    if (!canEditTimetable) {
      toast.error('You do not have permission to edit timetable');
      return;
    }
    const src = slots.find((s) => String(s._id) === String(slotId));
    if (!src) return;

    // Break slots are static (no drag/drop moves or swaps)
    if (src?.isBreak) {
      toast.error('Break cannot be moved');
      return;
    }

    if (targetSlotId) {
      const dst = slots.find((s) => String(s._id) === String(targetSlotId));
      if (dst?.isBreak) {
        toast.error('Cannot drop onto a Break');
        return;
      }
    }

    const same =
      Number(src.dayOfWeek) === Number(target?.dayOfWeek) &&
      String(src.startTime) === String(target?.startTime) &&
      String(src.endTime) === String(target?.endTime);
    if (same) return;

    // If dropping onto an occupied cell, show Swap/Move/Cancel modal.
    if (targetSlotId) {
      setSwapUi({ isOpen: true, aId: String(slotId), bId: String(targetSlotId) });
      return;
    }

    try {
      setDndBusy(true);
      await updateSlot(slotId, {
        dayOfWeek: target.dayOfWeek,
        startTime: target.startTime,
        endTime: target.endTime,
      });
      const list = await getSlots({ gs: sectionId });
      setSlots(list?.data || []);
      toast.success('Slot moved');
    } catch (err) {
      toast.error(err?.message || 'Move failed');
    } finally {
      setDndBusy(false);
    }
  };

  const closeSwap = () => setSwapUi({ isOpen: false, aId: null, bId: null });
  const handleSwap = async () => {
    if (!swapUi?.aId || !swapUi?.bId) return;
    if (!canEditTimetable) {
      toast.error('You do not have permission to edit timetable');
      closeSwap();
      return;
    }
    try {
      const a = slots.find((s) => String(s._id) === String(swapUi.aId));
      const b = slots.find((s) => String(s._id) === String(swapUi.bId));
      if (a?.isBreak || b?.isBreak) {
        toast.error('Break cannot be swapped');
        closeSwap();
        return;
      }
      setDndBusy(true);
      await swapSlots({ aId: swapUi.aId, bId: swapUi.bId });
      const list = await getSlots({ gs: sectionId });
      setSlots(list?.data || []);
      toast.success('Slots swapped');
      closeSwap();
    } catch (err) {
      toast.error(err?.message || 'Swap failed');
    } finally {
      setDndBusy(false);
    }
  };

  const onAddSingle = async () => {
    if (!canAddTimetable) { toast.error('You do not have permission to add timetable slots'); return; }
    if (!sectionId || (!isBreak && !subjectId) || !startTime || !endTime) { toast.error('Fill required fields'); return; }
    if (!Array.isArray(days) || days.length !== 1) { toast.error('Select exactly one day for Add Slot'); return; }
    try {
      setAddingSingle(true);
      const payload = { gsId: sectionId, dayOfWeek: days[0], startTime, endTime, room };
      if (isBreak) payload.isBreak = true; else payload.subjectId = subjectId;
      const res = await createSlot(payload);
      if (res?.data) {
        const list = await getSlots({ gs: sectionId });
        setSlots(list?.data || []);
        toast.success('Slot created');
        setRoom('');
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to create');
    } finally { setAddingSingle(false); }
  };

  const onAddBulk = async () => {
    if (!canAddTimetable) { toast.error('You do not have permission to add timetable slots'); return; }
    if (!sectionId || (!isBreak && !subjectId) || !startTime || !endTime || !days?.length) { toast.error('Fill required fields'); return; }
    try {
      setAddingBulk(true);
      const payload = { gsId: sectionId, days, startTime, endTime, room };
      if (isBreak) payload.isBreak = true; else payload.subjectId = subjectId;
      const res = await createSlotsBulk(payload);
      const list = await getSlots({ gs: sectionId });
      setSlots(list?.data || []);
      const conflicts = res?.data?.conflicts || [];
      if (conflicts.length) {
        const parts = conflicts
          .map((c) => {
            const d = Number(c.day);
            const dayLabel = Number.isInteger(d) && d >= 0 && d <= 6 ? dayNames[d] : String(c.day);
            return `${dayLabel} (${formatConflictReason(c.reason)})`;
          });
        const shown = parts.slice(0, 4);
        const more = parts.length - shown.length;
        toast.error(`Some days failed: ${shown.join(', ')}${more > 0 ? ` (+${more} more)` : ''}`);
      } else {
        toast.success('Slots created');
      }
      setRoom('');
    } catch (e) {
      toast.error(e?.message || 'Failed to create bulk');
    } finally { setAddingBulk(false); }
  };

  const onDelete = async (slot) => {
    if (!canDeleteTimetable) { toast.error('You do not have permission to delete timetable slots'); return; }
    if (!confirm('Delete this slot?')) return;
    try {
      await deleteSlot(slot._id);
      setSlots((prev) => prev.filter(s => s._id !== slot._id));
      toast.success('Deleted');
    } catch (e) { toast.error(e?.message || 'Delete failed'); }
  };

  const dayOpts = [0,1,2,3,4,5,6].map(d => ({ value: d, label: dayNames[d] }));

  // Compute display days (if days selected, use them; else derive from slots)
  const displayDays = useMemo(() => {
    if (Array.isArray(days) && days.length) return [...days].sort((a,b)=>a-b);
    const set = new Set();
    for (const s of slots) { if (typeof s.dayOfWeek === 'number') set.add(s.dayOfWeek); }
    return Array.from(set).sort((a,b)=>a-b);
  }, [days, slots]);

  // Compute unique periods (start-end pairs) from current slots
  const periods = useMemo(() => {
    const map = new Map();
    for (const s of slots) {
      if (!s.startTime || !s.endTime) continue;
      const key = `${s.startTime}__${s.endTime}`;
      if (!map.has(key)) map.set(key, { startTime: s.startTime, endTime: s.endTime });
    }

    // "Time bucket (minimal)": if user selected a valid range, show it as a period even when there are no slots.
    if (startTime && endTime && String(startTime) < String(endTime)) {
      const key = `${startTime}__${endTime}`;
      if (!map.has(key)) map.set(key, { startTime, endTime });
    }

    const arr = Array.from(map.values());
    arr.sort((a,b)=>String(a.startTime).localeCompare(String(b.startTime)));
    return arr;
  }, [slots, startTime, endTime]);

  const resetAll = () => {
    setGradeId(''); setShiftId(''); setSectionId(''); setSubjectId('');
    setDays([]); setStartTime(''); setEndTime(''); setRoom(''); setIsBreak(false);
    setSlots([]); setError('');
  };

  const selectedSection = useMemo(() => {
    return (sections || []).find((s) => String(s._id) === String(sectionId)) || null;
  }, [sections, sectionId]);

  const handlePrint = () => {
    if (!canPrintTimetable) {
      toast.error('You do not have permission to print timetable');
      return;
    }
    window.print();
  };

  const getExportRows = () => {
    const rows = (slots || []).slice();
    rows.sort((a, b) => {
      const da = Number(a.dayOfWeek ?? 0);
      const db = Number(b.dayOfWeek ?? 0);
      if (da !== db) return da - db;
      const sa = String(a.startTime || '');
      const sb = String(b.startTime || '');
      if (sa !== sb) return sa.localeCompare(sb);
      const ea = String(a.endTime || '');
      const eb = String(b.endTime || '');
      if (ea !== eb) return ea.localeCompare(eb);
      return String(a._id || '').localeCompare(String(b._id || ''));
    });
    return rows.map((s) => {
      const d = Number(s.dayOfWeek);
      const dayLabel = Number.isInteger(d) && d >= 0 && d <= 6 ? dayNames[d] : String(s.dayOfWeek ?? '');
      return {
        Day: dayLabel,
        Start: s.startTime || '',
        End: s.endTime || '',
        Type: s.isBreak ? 'Break' : 'Class',
        Subject: s.isBreak ? '' : (s.subject?.subjectName || ''),
        Teacher: s.isBreak ? '' : (s.teacher?.fullName || ''),
        Room: s.room || '',
      };
    });
  };

  const handleDownloadCsv = () => {
    if (!canDownloadTimetable) {
      toast.error('You do not have permission to download timetable');
      return;
    }
    if (!sectionId) { toast.error('Select a section'); return; }
    const rows = getExportRows();
    if (!rows.length) { toast.error('No slots to export'); return; }

    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')];
    for (const r of rows) {
      const vals = headers.map((h) => {
        const raw = String(r[h] ?? '');
        const escaped = raw.replaceAll('"', '""');
        return `"${escaped}"`;
      });
      lines.push(vals.join(','));
    }
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timetable.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 with-print-header with-print-footer">
      <PrintHeader />
      <PrintFooter left="Generated by Nuuru Al-Bayaan" />
      {dndBusy && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/95 rounded-2xl shadow-xl border border-white/60 px-10 py-10">
            <div className="flex flex-col items-center gap-4">
              <div className="text-blue-600">
                <Spinner size={72} color="currentColor" />
              </div>
              <div className="text-xs text-gray-600 tracking-wide">WORKING…</div>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={swapUi.isOpen}
        onClose={() => !dndBusy && closeSwap()}
        title="Choose Action"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ActionButton
            variant="primary"
            onClick={handleSwap}
            disabled={dndBusy || !canEditTimetable}
            className="justify-center py-3"
          >
            {dndBusy ? 'Working…' : 'Swap'}
          </ActionButton>

          <ActionButton
            variant="neutral"
            onClick={() => {
              toast.error('Move is not allowed on an occupied cell.');
              closeSwap();
            }}
            disabled={dndBusy}
            className="justify-center py-3"
          >
            Move
          </ActionButton>

          <ActionButton
            variant="danger"
            onClick={closeSwap}
            disabled={dndBusy}
            className="justify-center py-3"
          >
            Cancel
          </ActionButton>
        </div>
      </Modal>

      <div className="flex items-center no-print">
        <h1 className="text-2xl font-semibold">Timetable</h1>
        {!canViewTimetable && (
          <div className="ml-4 text-sm text-gray-600">You don’t have permission to view timetable.</div>
        )}
        <div className="ml-auto flex gap-2 items-center">
          {canViewTimetable && canPrintTimetable ? (
            <ActionButton variant="neutral" onClick={handlePrint} title="Print" icon={<Printer size={16} />}>Print</ActionButton>
          ) : null}

          {canViewTimetable && canDownloadTimetable ? (
            <ActionButton variant="neutral" onClick={handleDownloadCsv} title="Download CSV" icon={<Download size={16} />}>CSV</ActionButton>
          ) : null}

          {canViewTimetable && canAddTimetable ? (
            <button
              className={`px-3 py-1 rounded-md border bg-blue-600 text-white text-sm ${(addingSingle) ? 'opacity-70 cursor-not-allowed' : ''}`}
              onClick={onAddSingle}
              disabled={addingSingle}
            >
              {addingSingle ? 'Adding…' : 'Add Slot'}
            </button>
          ) : null}

          {canViewTimetable && canAddTimetable ? (
            <button
              className={`px-3 py-1 rounded-md border bg-blue-600 text-white text-sm ${(addingBulk) ? 'opacity-70 cursor-not-allowed' : ''}`}
              onClick={onAddBulk}
              disabled={addingBulk}
            >
              {addingBulk ? 'Adding…' : 'Add Slots (Days)'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="print-only">
        <div className="text-xl font-semibold">Timetable</div>
        <div className="mt-1 text-sm text-gray-700">
          {selectedSection
            ? `${selectedSection.grade?.gradeName || ''} • ${selectedSection.shift?.shiftName || ''} • Sec ${selectedSection.section}`
            : 'Select Section'}
        </div>
      </div>

      <div className="no-print">
        <DataToolbar
          filtersSlot={(
            <div className="flex flex-wrap gap-2 items-center">
              <FilterSelect value={gradeId} onChange={setGradeId} options={(grades||[]).slice().sort((a,b)=>{
                const da = new Date(a.createdAt || 0).getTime();
                const db = new Date(b.createdAt || 0).getTime();
                return da - db;
              }).map(g => ({ value: g._id, label: g.gradeName }))} placeholder="Level" className="min-w-[140px]" />
              <FilterSelect value={shiftId} onChange={setShiftId} options={(shifts||[]).map(s => ({ value: s._id, label: s.shiftName }))} placeholder="Shift" className="min-w-[120px]" />
              <FilterSelect value={sectionId} onChange={setSectionId} options={(sections||[]).map(s => ({ value: s._id, label: `${s.grade?.gradeName || ''} • ${s.shift?.shiftName || ''} • Sec ${s.section}` }))} placeholder="Section" className="min-w-[200px]" />
              <FilterSelect value={subjectId} onChange={setSubjectId} options={(subjects||[]).map(s => ({ value: s._id, label: s.subjectName }))} placeholder="Subject" className="min-w-[160px]" disabled={isBreak} />
              <MultiSelectDropdown value={days} onChange={setDays} options={dayOpts} placeholder="Days" className="min-w-[200px]" />
              <input
                type="time"
                step={60}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="px-2 py-1 border rounded"
              />
              <span>to</span>
              <input
                type="time"
                step={60}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="px-2 py-1 border rounded"
              />
              <input type="text" value={room} onChange={e=>setRoom(e.target.value)} placeholder="Room" className="px-2 py-1 border rounded" />
            </div>
          )}
          actionsSlot={(
            <button
              type="button"
              title="Break"
              aria-label="Break"
              onClick={() => {
                setIsBreak(v => {
                  const next = !v;
                  if (next) setSubjectId('');
                  return next;
                });
              }}
              className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${isBreak ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
              <span
                className={`inline-block h-5 w-5 bg-white rounded-full shadow transform transition-transform ${isBreak ? 'translate-x-5' : 'translate-x-1'}`}
              />
            </button>
          )}
          onReset={resetAll}
        />
      </div>

      <TableShell>
        <thead>
          <tr className="bg-black text-white">
            <th className="text-left px-3 py-2">Day</th>
            {periods.length === 0 ? (
              <th className="text-left px-3 py-2">No periods</th>
            ) : (
              periods.map((p, i) => (
                <th key={i} className="text-left px-3 py-2">
                  {formatRangeWithAmPm(p.startTime, p.endTime)}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td className="px-3 py-2 text-sm text-gray-500" colSpan={2}>Loading slots…</td></tr>
          )}
          {!loading && error && (
            <tr><td className="px-3 py-2 text-sm text-red-600" colSpan={2}>{String(error)}</td></tr>
          )}
          {!loading && !error && slots.length === 0 && (
            (displayDays.length === 0 ? (
              <tr><td className="px-3 py-2 text-sm text-gray-500" colSpan={Math.max(2, 1 + periods.length)}>Select Days to show the grid.</td></tr>
            ) : periods.length === 0 ? (
              <tr><td className="px-3 py-2 text-sm text-gray-500" colSpan={2}>Set a valid time range to show periods.</td></tr>
            ) : (
              <TimetableGrid slots={slots} daysFilter={displayDays} periods={periods} onDelete={onDelete} onMove={onMove} busy={dndBusy} canMove={canEditTimetable} canDelete={canDeleteTimetable} />
            ))
          )}
          {!loading && !error && slots.length > 0 && (
            <TimetableGrid slots={slots} daysFilter={displayDays} periods={periods} onDelete={onDelete} onMove={onMove} busy={dndBusy} canMove={canEditTimetable} canDelete={canDeleteTimetable} />
          )}
        </tbody>
      </TableShell>
    </div>
  );
}
