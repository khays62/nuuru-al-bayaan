import {
  emitStudentsChanged,
  emitTeachersChanged,
  emitUsersChanged,
  emitSubjectsChanged,
  emitTimetableChanged,
  emitGradeSectionsChanged,
  emitCohortsChanged,
  emitTransfersChanged,
  emitPromotionsChanged,
  emitExamsChanged,
  emitResultsChanged,
  emitAttendanceChanged,
  emitTranscriptChanged,
  emitAnnouncementsChanged,
} from '../../utils/events';

function createDebouncer({ delayMs }) {
  const timers = new Map();
  return {
    debounce(key, fn) {
      const existing = timers.get(key);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        timers.delete(key);
        fn();
      }, delayMs);
      timers.set(key, t);
    },
    clearAll() {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    },
  };
}

export function createRealtimeDispatcher({ queryClient, debounceMs = 250 } = {}) {
  const debouncer = createDebouncer({ delayMs: debounceMs });

  const debugEnabled = (() => {
    try {
      return String(localStorage.getItem('debug:realtime') || '') === '1';
    } catch {
      return false;
    }
  })();

  const invalidateSecurityAuthLocks = () => {
    try {
      queryClient?.invalidateQueries?.({ queryKey: ['security', 'authLocks'] });
    } catch {
      // ignore
    }
  };

  const dispatch = (payload) => {
    const type = String(payload?.type || '');
    if (!type || type === 'hello' || type === 'ping') return;

    if (debugEnabled) {
      try {
        // eslint-disable-next-line no-console
        console.log('[realtime] event', { type, payload });
      } catch {
        // ignore
      }
    }

    // Debounce fan-out events to prevent refresh storms when multiple actions happen quickly.
    if (type === 'students:changed') {
      debouncer.debounce('students:changed', () => emitStudentsChanged({ source: 'realtime', ...payload }));
      return;
    }
    if (type === 'teachers:changed') {
      debouncer.debounce('teachers:changed', () => emitTeachersChanged({ source: 'realtime', ...payload }));
      return;
    }
    if (type === 'users:changed') {
      debouncer.debounce('users:changed', () => emitUsersChanged({ source: 'realtime', ...payload }));
      return;
    }
    if (type === 'subjects:changed') {
      debouncer.debounce('subjects:changed', () => emitSubjectsChanged({ source: 'realtime', ...payload }));
      return;
    }
    if (type === 'timetable:changed') {
      debouncer.debounce('timetable:changed', () => emitTimetableChanged({ source: 'realtime', ...payload }));
      return;
    }
    if (type === 'gradeSections:changed') {
      debouncer.debounce('gradeSections:changed', () => emitGradeSectionsChanged({ source: 'realtime', ...payload }));
      return;
    }
    if (type === 'cohorts:changed') {
      debouncer.debounce('cohorts:changed', () => emitCohortsChanged({ source: 'realtime', ...payload }));
      return;
    }
    if (type === 'transfers:changed') {
      debouncer.debounce('transfers:changed', () => emitTransfersChanged({ source: 'realtime', ...payload }));
      return;
    }
    if (type === 'promotions:changed') {
      debouncer.debounce('promotions:changed', () => emitPromotionsChanged({ source: 'realtime', ...payload }));
      return;
    }
    if (type === 'exams:changed') {
      debouncer.debounce('exams:changed', () => emitExamsChanged({ source: 'realtime', ...payload }));
      return;
    }
    if (type === 'results:changed') {
      debouncer.debounce('results:changed', () => emitResultsChanged({ source: 'realtime', ...payload }));
      return;
    }
    if (type === 'attendance:changed') {
      debouncer.debounce('attendance:changed', () => emitAttendanceChanged({ source: 'realtime', ...payload }));
      return;
    }
    if (type === 'transcript:changed') {
      debouncer.debounce('transcript:changed', () => emitTranscriptChanged({ source: 'realtime', ...payload }));
      return;
    }
    if (type === 'announcements:changed') {
      debouncer.debounce('announcements:changed', () => emitAnnouncementsChanged({ source: 'realtime', ...payload }));
      return;
    }
    if (type === 'security:authLocksChanged') {
      debouncer.debounce('security:authLocksChanged', invalidateSecurityAuthLocks);
      return;
    }
  };

  return {
    dispatch,
    dispose: () => debouncer.clearAll(),
  };
}
