import { useEffect } from 'react';
import { on as onEvent, off as offEvent, EVENTS } from '../../utils/events';

export function useAttendanceRealtimeInvalidation({ onChanged } = {}) {
  useEffect(() => {
    if (typeof onChanged !== 'function') return;

    const handler = (e) => {
      try {
        onChanged(e);
      } catch {
        // ignore
      }
    };

    onEvent(EVENTS.ATTENDANCE_CHANGED, handler);
    return () => offEvent(EVENTS.ATTENDANCE_CHANGED, handler);
  }, [onChanged]);
}
