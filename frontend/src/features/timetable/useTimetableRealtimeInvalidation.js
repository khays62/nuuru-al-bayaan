import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { on as onEvent, off as offEvent, EVENTS } from '../../utils/events';
import { teacherKeys } from '../teachers/queryKeys';
import { timetableKeys } from './queryKeys';

export function useTimetableRealtimeInvalidation({
  isTeacher,
  gradeSectionId,
  todayIdx,
} = {}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => {
      if (isTeacher) {
        try {
          queryClient.invalidateQueries({ queryKey: teacherKeys.timetableSlots({ gradeSectionId }) });
          queryClient.invalidateQueries({ queryKey: teacherKeys.timetableTodayMine({ dayIndex: todayIdx }) });
        } catch {
          // ignore
        }
        return;
      }

      queryClient.invalidateQueries({ queryKey: timetableKeys.slots({ gradeSectionId }) });
    };

    onEvent(EVENTS.TIMETABLE_CHANGED, handler);
    return () => offEvent(EVENTS.TIMETABLE_CHANGED, handler);
  }, [gradeSectionId, isTeacher, queryClient, todayIdx]);
}
