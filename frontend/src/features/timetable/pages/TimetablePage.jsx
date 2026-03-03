import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DataToolbar from '../../../shared/components/DataToolbar/DataToolbar.jsx';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import FilterDropdownSelect from '../../../shared/components/DataToolbar/FilterDropdownSelect.jsx';
import MultiSelectDropdown from '../../../shared/components/DataToolbar/MultiSelectDropdown.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import TimetableGrid from '../components/TimetableGrid.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import Spinner from '../../../shared/components/feedback/Spinner.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import PrintHeader from '../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../shared/components/print/PrintFooter.jsx';
import { Download, Printer } from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { getGrades, getShifts } from '../../lookups/api/lookups';
import { listGradeSections } from '../../grades/api/gradeSections';
import { getSubjects } from '../../subjects/api/subjects';
import { getSlots, getSlotsWithOptions, createSlot, createSlotsBulk, updateSlot, swapSlots, deleteSlot } from '../api/timetable';
import TeacherTimetablePanel from '../../teachers/components/dashboard/TeacherTimetablePanel.jsx';
import { teacherKeys } from '../../teachers/queryKeys.js';
import { timetableKeys } from '../queryKeys.js';
import { useTimetableRealtimeInvalidation } from '../useTimetableRealtimeInvalidation.js';
import { useI18n } from '../../../i18n/useI18n';

export default function TimetablePage() {
  const { auth, hasPermission } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const role = String(auth?.user?.role || '').toLowerCase();
  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';

  const canTimetablePrint = !isTeacher && (isAdmin || hasPermission('timetable', 'print'));
  const canTimetableDownload = !isTeacher && (isAdmin || hasPermission('timetable', 'download'));
  const canTimetableAdd = !isTeacher && (isAdmin || hasPermission('timetable', 'add'));
  const canTimetableEdit = !isTeacher && (isAdmin || hasPermission('timetable', 'edit'));
  const canTimetableDelete = !isTeacher && (isAdmin || hasPermission('timetable', 'delete'));

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

  const [dndBusy, setDndBusy] = useState(false);
  const [swapUi, setSwapUi] = useState({ isOpen: false, aId: null, bId: null });

  const dayNames = useMemo(
    () => [
      t('common.days.long.saturday'),
      t('common.days.long.sunday'),
      t('common.days.long.monday'),
      t('common.days.long.tuesday'),
      t('common.days.long.wednesday'),
      t('common.days.long.thursday'),
      t('common.days.long.friday'),
    ],
    [t]
  );

  const getTimetableDayIndexFromLocalDate = (d = new Date()) => {
    // 0=Saturday,1=Sunday,2=Monday,3=Tuesday,4=Wednesday,5=Thursday,6=Friday
    const js = d.getDay(); // 0=Sunday..6=Saturday
    if (js === 6) return 0;
    if (js === 0) return 1;
    return js + 1;
  };

  const isValidTime24h = (raw) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(raw || ''));

  const formatRangeWithAmPm = (start, end) => {
    const sOk = isValidTime24h(start);
    const eOk = isValidTime24h(end);
    if (!sOk || !eOk) return `${start || ''} - ${end || ''}`.trim();
    const sH = Number(String(start).split(':')[0]);
    const eH = Number(String(end).split(':')[0]);
    const sAmPm = sH >= 12 ? t('common.time.pm') : t('common.time.am');
    const eAmPm = eH >= 12 ? t('common.time.pm') : t('common.time.am');
    if (sAmPm === eAmPm) {
      // keep original 24h range but suffix with AM/PM once
      return `${start} - ${end} ${sAmPm}`;
    }
    return `${start} ${sAmPm} - ${end} ${eAmPm}`;
  };

  const formatConflictReason = (reason) => {
    const r = String(reason || '').toLowerCase();
    if (r.includes('gs')) return t('timetable.page.conflicts.classConflict');
    if (r.includes('teacher')) return t('timetable.page.conflicts.teacherConflict');
    if (r.includes('room')) return t('timetable.page.conflicts.roomConflict');
    if (r.includes('invalid')) return t('timetable.page.conflicts.invalidDay');
    return reason || t('timetable.page.conflicts.conflict');
  };

  useEffect(() => {
    (async () => {
      try {
        const [g, s] = await Promise.all([getGrades(), getShifts()]);
        setGrades(g?.data || g || []);
        setShifts(s?.data || s || []);
      } catch (err) {
        console.warn('Failed to load lookups', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!gradeId && !isTeacher) { setSections([]); setSectionId(''); setSubjects([]); setSubjectId(''); return; }
    (async () => {
      try {
        if (isTeacher) {
          return;
        }

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
  }, [gradeId, shiftId, isTeacher]);

  const teacherSectionsQuery = useQuery({
    queryKey: teacherKeys.gradeSections({ limit: 200 }),
    enabled: Boolean(isTeacher),
    queryFn: async () => {
      const res = await listGradeSections({ limit: 200 });
      return Array.isArray(res?.data) ? res.data : [];
    },
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!isTeacher) return;
    setSections(Array.isArray(teacherSectionsQuery.data) ? teacherSectionsQuery.data : []);
    setSubjects([]);
    setSubjectId('');
  }, [isTeacher, teacherSectionsQuery.data]);


  const todayIdx = useMemo(() => getTimetableDayIndexFromLocalDate(new Date()), []);

  useTimetableRealtimeInvalidation({
    isTeacher,
    gradeSectionId: sectionId,
    todayIdx,
  });

  const adminSlotsQuery = useQuery({
    queryKey: timetableKeys.slots({ gradeSectionId: sectionId }),
    enabled: Boolean(!isTeacher && sectionId),
    queryFn: async ({ signal }) => {
      const res = await getSlotsWithOptions({ gs: sectionId }, { signal });
      return Array.isArray(res?.data) ? res.data : [];
    },
    placeholderData: (prev) => prev,
  });

  const slots = useMemo(() => {
    if (isTeacher) return [];
    return Array.isArray(adminSlotsQuery.data) ? adminSlotsQuery.data : [];
  }, [adminSlotsQuery.data, isTeacher]);

  const loading = Boolean(!isTeacher && sectionId && adminSlotsQuery.isLoading && !Array.isArray(adminSlotsQuery.data));
  const error =
    !isTeacher && sectionId && adminSlotsQuery.isError ? t('timetable.page.errors.loadFailed') : '';

  const teacherSlotsQuery = useQuery({
    queryKey: teacherKeys.timetableSlots({ gradeSectionId: sectionId }),
    enabled: Boolean(isTeacher && sectionId),
    queryFn: async ({ signal }) => {
      const res = await getSlotsWithOptions({ gs: sectionId }, { signal });
      return Array.isArray(res?.data) ? res.data : [];
    },
    placeholderData: (prev) => prev,
  });
  const teacherTodayQuery = useQuery({
    queryKey: teacherKeys.timetableTodayMine({ dayIndex: todayIdx }),
    enabled: Boolean(isTeacher),
    queryFn: async ({ signal }) => {
      const res = await getSlotsWithOptions({ mine: 1, day: todayIdx }, { signal });
      return Array.isArray(res?.data) ? res.data : [];
    },
    placeholderData: (prev) => prev,
  });

  const effectiveSlots = useMemo(() => {
    if (isTeacher) return Array.isArray(teacherSlotsQuery.data) ? teacherSlotsQuery.data : [];
    return Array.isArray(slots) ? slots : [];
  }, [isTeacher, teacherSlotsQuery.data, slots]);

  const onMove = async (slotId, target, targetSlotId) => {
    if (isTeacher) {
      toast.error(t('timetable.page.errors.teacherViewOnly'));
      return;
    }
    if (!canTimetableEdit) {
      toast.error(t('timetable.page.errors.noEditPermission'));
      return;
    }
    if (!sectionId) return;
    if (dndBusy) return;
    const src = slots.find((s) => String(s._id) === String(slotId));
    if (!src) return;

    // Break slots are static (no drag/drop moves or swaps)
    if (src?.isBreak) {
      toast.error(t('timetable.page.errors.breakCannotBeMoved'));
      return;
    }

    if (targetSlotId) {
      const dst = slots.find((s) => String(s._id) === String(targetSlotId));
      if (dst?.isBreak) {
        toast.error(t('timetable.page.errors.cannotDropOnBreak'));
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
      queryClient.setQueryData(
        timetableKeys.slots({ gradeSectionId: sectionId }),
        Array.isArray(list?.data) ? list.data : []
      );
      toast.success(t('timetable.page.toasts.slotMoved'));
    } catch (err) {
      toast.error(err?.message || t('timetable.page.errors.moveFailed'));
    } finally {
      setDndBusy(false);
    }
  };

  const closeSwap = () => setSwapUi({ isOpen: false, aId: null, bId: null });
  const handleSwap = async () => {
    if (isTeacher) {
      toast.error(t('timetable.page.errors.teacherViewOnly'));
      closeSwap();
      return;
    }
    if (!canTimetableEdit) {
      toast.error(t('timetable.page.errors.noEditPermission'));
      closeSwap();
      return;
    }
    if (!swapUi?.aId || !swapUi?.bId) return;
    try {
      const a = slots.find((s) => String(s._id) === String(swapUi.aId));
      const b = slots.find((s) => String(s._id) === String(swapUi.bId));
      if (a?.isBreak || b?.isBreak) {
        toast.error(t('timetable.page.errors.breakCannotBeSwapped'));
        closeSwap();
        return;
      }
      setDndBusy(true);
      await swapSlots({ aId: swapUi.aId, bId: swapUi.bId });
      const list = await getSlots({ gs: sectionId });
      queryClient.setQueryData(
        timetableKeys.slots({ gradeSectionId: sectionId }),
        Array.isArray(list?.data) ? list.data : []
      );
      toast.success(t('timetable.page.toasts.slotsSwapped'));
      closeSwap();
    } catch (err) {
      toast.error(err?.message || t('timetable.page.errors.swapFailed'));
    } finally {
      setDndBusy(false);
    }
  };

  const onAddSingle = async () => {
    if (isTeacher) {
      toast.error(t('timetable.page.errors.teacherViewOnly'));
      return;
    }
    if (!canTimetableAdd) {
      toast.error(t('timetable.page.errors.noAddPermission'));
      return;
    }
    if (!sectionId || (!isBreak && !subjectId) || !startTime || !endTime) {
      toast.error(t('timetable.page.errors.fillRequiredFields'));
      return;
    }
    if (!Array.isArray(days) || days.length !== 1) {
      toast.error(t('timetable.page.errors.selectExactlyOneDayForAddSlot'));
      return;
    }
    try {
      setAddingSingle(true);
      const payload = { gsId: sectionId, dayOfWeek: days[0], startTime, endTime, room };
      if (isBreak) payload.isBreak = true; else payload.subjectId = subjectId;
      const res = await createSlot(payload);
      if (res?.data) {
        const list = await getSlots({ gs: sectionId });
        queryClient.setQueryData(
          timetableKeys.slots({ gradeSectionId: sectionId }),
          Array.isArray(list?.data) ? list.data : []
        );
        toast.success(t('timetable.page.toasts.slotCreated'));
        setRoom('');
      }
    } catch (e) {
      toast.error(e?.message || t('timetable.page.errors.createFailed'));
    } finally { setAddingSingle(false); }
  };

  const onAddBulk = async () => {
    if (isTeacher) {
      toast.error(t('timetable.page.errors.teacherViewOnly'));
      return;
    }
    if (!canTimetableAdd) {
      toast.error(t('timetable.page.errors.noAddPermission'));
      return;
    }
    if (!sectionId || (!isBreak && !subjectId) || !startTime || !endTime || !days?.length) {
      toast.error(t('timetable.page.errors.fillRequiredFields'));
      return;
    }
    try {
      setAddingBulk(true);
      const payload = { gsId: sectionId, days, startTime, endTime, room };
      if (isBreak) payload.isBreak = true; else payload.subjectId = subjectId;
      const res = await createSlotsBulk(payload);
      const list = await getSlots({ gs: sectionId });
      queryClient.setQueryData(
        timetableKeys.slots({ gradeSectionId: sectionId }),
        Array.isArray(list?.data) ? list.data : []
      );
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
        const moreSuffix = more > 0 ? t('timetable.page.errors.moreSuffix', { count: more }) : '';
        toast.error(
          t('timetable.page.errors.someDaysFailed', {
            details: shown.join(', '),
            moreSuffix,
          })
        );
      } else {
        toast.success(t('timetable.page.toasts.slotsCreated'));
      }
      setRoom('');
    } catch (e) {
      toast.error(e?.message || t('timetable.page.errors.createBulkFailed'));
    } finally { setAddingBulk(false); }
  };

  const onDelete = async (slot) => {
    if (isTeacher) {
      toast.error(t('timetable.page.errors.teacherViewOnly'));
      return;
    }
    if (!canTimetableDelete) {
      toast.error(t('timetable.page.errors.noDeletePermission'));
      return;
    }
    if (!window.confirm(t('timetable.page.confirms.deleteSlot'))) return;
    try {
      await deleteSlot(slot._id);
      queryClient.setQueryData(timetableKeys.slots({ gradeSectionId: sectionId }), (prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        return arr.filter((s) => s?._id !== slot?._id);
      });
      toast.success(t('timetable.page.toasts.deleted'));
    } catch (e) {
      toast.error(e?.message || t('timetable.page.errors.deleteFailed'));
    }
  };

  const dayOpts = useMemo(
    () => [0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: d, label: dayNames[d] })),
    [dayNames]
  );

  // Compute display days (if days selected, use them; else derive from slots)
  const displayDays = useMemo(() => {
    if (Array.isArray(days) && days.length) return [...days].sort((a,b)=>a-b);
    const set = new Set();
    for (const s of effectiveSlots) { if (typeof s.dayOfWeek === 'number') set.add(s.dayOfWeek); }
    return Array.from(set).sort((a,b)=>a-b);
  }, [days, effectiveSlots]);

  // Compute unique periods (start-end pairs) from current slots
  const periods = useMemo(() => {
    const map = new Map();
    for (const s of effectiveSlots) {
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
  }, [effectiveSlots, startTime, endTime]);

  const resetAll = () => {
    setGradeId(''); setShiftId(''); setSectionId(''); setSubjectId('');
    setDays([]); setStartTime(''); setEndTime(''); setRoom(''); setIsBreak(false);
  };

  const selectedSection = useMemo(() => {
    return (sections || []).find((s) => String(s._id) === String(sectionId)) || null;
  }, [sections, sectionId]);

  const handlePrint = () => {
    if (!canTimetablePrint) {
      toast.error(t('timetable.page.errors.noPrintPermission'));
      return;
    }
    window.print();
  };

  const exportColumns = useMemo(
    () => [
      { key: 'day', header: t('timetable.page.export.headers.day') },
      { key: 'start', header: t('timetable.page.export.headers.start') },
      { key: 'end', header: t('timetable.page.export.headers.end') },
      { key: 'type', header: t('timetable.page.export.headers.type') },
      { key: 'subject', header: t('timetable.page.export.headers.subject') },
      { key: 'teacher', header: t('timetable.page.export.headers.teacher') },
      { key: 'room', header: t('timetable.page.export.headers.room') },
    ],
    [t]
  );

  const getExportRows = () => {
    const rows = (effectiveSlots || []).slice();
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
        day: dayLabel,
        start: s.startTime || '',
        end: s.endTime || '',
        type: s.isBreak ? t('timetable.page.export.type.break') : t('timetable.page.export.type.class'),
        subject: s.isBreak ? '' : (s.subject?.subjectName || ''),
        teacher: s.isBreak ? '' : (s.teacher?.fullName || ''),
        room: s.room || '',
      };
    });
  };

  const handleDownloadCsv = () => {
    if (!canTimetableDownload) {
      toast.error(t('timetable.page.errors.noDownloadPermission'));
      return;
    }
    if (!sectionId) {
      toast.error(t('timetable.page.errors.selectSection'));
      return;
    }
    const rows = getExportRows();
    if (!rows.length) {
      toast.error(t('timetable.page.errors.noSlotsToExport'));
      return;
    }

    const keys = exportColumns.map((c) => c.key);
    const headers = exportColumns.map((c) => c.header);
    const lines = [headers.join(',')];
    for (const r of rows) {
      const vals = keys.map((k) => {
        const raw = String(r[k] ?? '');
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
    a.download = t('timetable.page.export.filename');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sectionLabel = (gs) => {
    if (!gs) return '';
    const gradeName = gs?.grade?.gradeName;
    const sectionNum = gs?.section;
    const shiftName = gs?.shift?.shiftName;
    return [
      gradeName ? `${gradeName}` : null,
      sectionNum ? `${t('common.sectionPrefix')} ${sectionNum}` : null,
      shiftName ? `(${shiftName})` : null,
    ].filter(Boolean).join(' - ');
  };

  return (
    <div className="space-y-4 with-print-header with-print-footer">
      <PrintHeader />
      <PrintFooter left={t('common.generatedBy')} />
      {dndBusy && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-(--nb-color-bg-card) rounded-2xl shadow-(--nb-shadow-md) border border-(--nb-color-border) px-10 py-10">
            <div className="flex flex-col items-center gap-4">
              <div className="text-(--nb-color-accent)">
                <Spinner size={72} color="currentColor" />
              </div>
              <div className="text-xs text-(--nb-color-muted) tracking-wide">{t('common.working')}</div>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={swapUi.isOpen}
        onClose={() => !dndBusy && closeSwap()}
        title={t('timetable.page.swapModal.title')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ActionButton
            variant="primary"
            onClick={handleSwap}
            disabled={dndBusy}
            className="justify-center py-3"
          >
            {dndBusy ? t('common.working') : t('timetable.page.actions.swap')}
          </ActionButton>

          <ActionButton
            variant="neutral"
            onClick={() => {
              toast.error(t('timetable.page.errors.moveNotAllowedOnOccupiedCell'));
              closeSwap();
            }}
            disabled={dndBusy}
            className="justify-center py-3"
          >
            {t('timetable.page.actions.move')}
          </ActionButton>

          <ActionButton
            variant="danger"
            onClick={closeSwap}
            disabled={dndBusy}
            className="justify-center py-3"
          >
            {t('common.actions.cancel')}
          </ActionButton>
        </div>
      </Modal>

      <div className="w-full flex items-center justify-between gap-2 flex-wrap no-print">
        <h1 className="text-2xl font-semibold">{t('nav.timetable')}</h1>
        <div className="flex items-center justify-end gap-2 flex-nowrap overflow-x-auto w-full sm:w-auto">
          {!isTeacher ? (
            <>
              {canTimetablePrint ? (
                <ActionButton variant="neutral" onClick={handlePrint} title={t('common.actions.print')} icon={<Printer size={16} />}>
                  {t('common.actions.print')}
                </ActionButton>
              ) : null}
              {canTimetableDownload ? (
                <ActionButton
                  variant="neutral"
                  onClick={handleDownloadCsv}
                  title={t('timetable.page.actions.downloadCsv')}
                  icon={<Download size={16} />}
                >
                  CSV
                </ActionButton>
              ) : null}
            </>
          ) : null}
          {!isTeacher && canTimetableAdd ? (
            <>
              <ActionButton variant="brand" onClick={onAddSingle} disabled={addingSingle} className={addingSingle ? 'opacity-70 cursor-wait' : ''}>
                {addingSingle ? t('timetable.page.states.adding') : t('timetable.page.actions.addSlot')}
              </ActionButton>
              <ActionButton variant="brand" onClick={onAddBulk} disabled={addingBulk} className={addingBulk ? 'opacity-70 cursor-wait' : ''}>
                {addingBulk ? t('timetable.page.states.adding') : t('timetable.page.actions.addSlotsDays')}
              </ActionButton>
            </>
          ) : null}
        </div>
      </div>

      <div className="print-only">
        <div className="text-xl font-semibold">{t('nav.timetable')}</div>
        <div className="mt-1 text-sm text-(--nb-color-fg)">
          {selectedSection
            ? `${selectedSection.grade?.gradeName || ''} â€¢ ${selectedSection.shift?.shiftName || ''} â€¢ ${t('common.sectionPrefix')} ${selectedSection.section}`
            : t('timetable.page.print.selectSection')}
        </div>
      </div>

      {isTeacher ? (
        <TeacherTimetablePanel
          sections={sections}
          sectionId={sectionId}
          setSectionId={setSectionId}
          sectionLabel={sectionLabel}
          loading={Boolean(
            (teacherSectionsQuery.isLoading && (sections || []).length === 0) ||
            (teacherSlotsQuery.isLoading && !Array.isArray(teacherSlotsQuery.data))
          )}
          error={teacherSlotsQuery.isError ? t('timetable.page.errors.loadFailed') : ''}
          slots={teacherSlotsQuery.data || []}
          todaySlots={teacherTodayQuery.data || []}
          todayLoading={Boolean(teacherTodayQuery.isLoading && !Array.isArray(teacherTodayQuery.data))}
          todayError={teacherTodayQuery.isError ? t('timetable.page.errors.loadTodayFailed') : ''}
          periods={periods}
          displayDays={displayDays}
          formatRangeWithAmPm={formatRangeWithAmPm}
          busy={dndBusy}
        />
      ) : (
        <>
          <div className="no-print">
            <DataToolbar
              filtersSlot={(
                <FilterRow align="center">
                  <FilterItem grow minWidthClass="min-w-35">
                    <DropdownSelect
                      value={gradeId}
                      onChange={setGradeId}
                      options={(grades||[]).slice().sort((a,b)=>{
                        const da = new Date(a.createdAt || 0).getTime();
                        const db = new Date(b.createdAt || 0).getTime();
                        return da - db;
                      }).map(g => ({ value: g._id, label: g.gradeName }))}
                      placeholder={t('common.filters.level')}
                    />
                  </FilterItem>

                  <FilterItem grow minWidthClass="min-w-30">
                    <FilterDropdownSelect
                      value={shiftId}
                      onChange={setShiftId}
                      options={(shifts||[]).map(s => ({ value: s._id, label: s.shiftName }))}
                      placeholder={t('common.filters.shift')}
                      searchPlaceholder={t('common.searchPlaceholders.shifts')}
                    />
                  </FilterItem>

                  <FilterItem grow minWidthClass="min-w-50">
                    <FilterDropdownSelect
                      value={sectionId}
                      onChange={setSectionId}
                      options={(sections||[]).map(s => ({ value: s._id, label: `${s.grade?.gradeName || ''} â€¢ ${s.shift?.shiftName || ''} â€¢ ${t('common.sectionPrefix')} ${s.section}` }))}
                      placeholder={t('common.filters.section')}
                      searchPlaceholder={t('common.searchPlaceholders.sections')}
                    />
                  </FilterItem>

                  <FilterItem grow minWidthClass="min-w-40">
                    <FilterDropdownSelect
                      value={subjectId}
                      onChange={setSubjectId}
                      options={(subjects||[]).map(s => ({ value: s._id, label: s.subjectName }))}
                      placeholder={t('timetable.page.filters.subject')}
                      searchPlaceholder={t('common.searchPlaceholders.subjects')}
                      disabled={isBreak}
                    />
                  </FilterItem>

                  <FilterItem grow minWidthClass="min-w-50">
                    <MultiSelectDropdown
                      value={days}
                      onChange={setDays}
                      options={dayOpts}
                      placeholder={t('timetable.page.filters.days')}
                      className="w-full"
                    />
                  </FilterItem>

                  <FilterItem minWidthClass="min-w-44" className="sm:w-auto">
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        step={60}
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="px-2 py-1 border border-(--nb-color-border) rounded-(--nb-radius-md) bg-(--nb-color-bg-card) text-(--nb-color-text) w-full"
                      />
                        <span className="text-sm text-(--nb-color-muted)">{t('common.to')}</span>
                      <input
                        type="time"
                        step={60}
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                          className="px-2 py-1 border border-(--nb-color-border) rounded-(--nb-radius-md) bg-(--nb-color-bg-card) text-(--nb-color-text) w-full"
                      />
                    </div>
                  </FilterItem>

                  <FilterItem grow minWidthClass="min-w-32">
                    <input
                      type="text"
                      value={room}
                      onChange={e=>setRoom(e.target.value)}
                      placeholder={t('common.room')}
                      className="px-2 py-1 border border-(--nb-color-border) rounded-(--nb-radius-md) bg-(--nb-color-bg-card) text-(--nb-color-text) w-full"
                    />
                  </FilterItem>
                </FilterRow>
              )}
              actionsSlot={(
                <button
                  type="button"
                  title={t('timetable.grid.break')}
                  aria-label={t('timetable.grid.break')}
                  onClick={() => {
                    setIsBreak(v => {
                      const next = !v;
                      if (next) setSubjectId('');
                      return next;
                    });
                  }}
                  className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${isBreak ? 'bg-(--nb-color-accent)' : 'bg-(--nb-color-border)'}`}
                >
                  <span
                    className={`inline-block h-5 w-5 bg-(--nb-color-bg-card) rounded-full shadow transform transition-transform ${isBreak ? 'translate-x-5' : 'translate-x-1'}`}
                  />
                </button>
              )}
              onReset={resetAll}
            />
          </div>

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
                  <th className="text-left px-3 py-2">{t('timetable.page.table.day')}</th>
                  {periods.length === 0 ? (
                    <th className="text-left px-3 py-2">{t('timetable.grid.noPeriods')}</th>
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
                    <tr><td className="px-3 py-2 text-sm text-(--nb-color-muted)" colSpan={2}>{t('timetable.page.loadingSlots')}</td></tr>
                  )}
                  {!loading && error && (
                    <tr><td className="px-3 py-2 text-sm text-red-600" colSpan={2}>{String(error)}</td></tr>
                  )}
                  {!loading && !error && slots.length === 0 && (
                    (displayDays.length === 0 ? (
                      <tr><td className="px-3 py-2 text-sm text-(--nb-color-muted)" colSpan={Math.max(2, 1 + periods.length)}>{t('timetable.grid.noDaysSelected')}</td></tr>
                    ) : periods.length === 0 ? (
                      <tr><td className="px-3 py-2 text-sm text-(--nb-color-muted)" colSpan={2}>{t('timetable.page.empty.setValidTimeRange')}</td></tr>
                    ) : (
                      <TimetableGrid
                        slots={slots}
                        daysFilter={displayDays}
                        periods={periods}
                        onDelete={canTimetableDelete ? onDelete : undefined}
                        onMove={canTimetableEdit ? onMove : undefined}
                        busy={dndBusy}
                      />
                    ))
                  )}
                  {!loading && !error && slots.length > 0 && (
                    <TimetableGrid
                      slots={slots}
                      daysFilter={displayDays}
                      periods={periods}
                      onDelete={canTimetableDelete ? onDelete : undefined}
                      onMove={canTimetableEdit ? onMove : undefined}
                      busy={dndBusy}
                    />
                  )}
                </>
              ),
            }}
          />
        </>
      )}
    </div>
  );
}
