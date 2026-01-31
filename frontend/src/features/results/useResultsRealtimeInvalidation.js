import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { on as onEvent, off as offEvent, EVENTS } from '../../utils/events';

export function useResultsRealtimeInvalidation() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => {
      try {
        // Results page queries use teacher-scoped keys for both teacher & admin UI.
        queryClient.invalidateQueries({ queryKey: ['teacher', 'examSummary'] });
        queryClient.invalidateQueries({ queryKey: ['teacher', 'examTypes'] });
        queryClient.invalidateQueries({ queryKey: ['teacher', 'gradeSection'] });
      } catch {
        // ignore
      }
    };

    onEvent(EVENTS.RESULTS_CHANGED, handler);
    onEvent(EVENTS.EXAMS_CHANGED, handler);

    // Enrollment-affecting events can change the roster/filters, which affects summaries.
    onEvent(EVENTS.STUDENTS_CHANGED, handler);
    onEvent(EVENTS.PROMOTIONS_CHANGED, handler);
    onEvent(EVENTS.TRANSFERS_CHANGED, handler);

    return () => {
      offEvent(EVENTS.RESULTS_CHANGED, handler);
      offEvent(EVENTS.EXAMS_CHANGED, handler);
      offEvent(EVENTS.STUDENTS_CHANGED, handler);
      offEvent(EVENTS.PROMOTIONS_CHANGED, handler);
      offEvent(EVENTS.TRANSFERS_CHANGED, handler);
    };
  }, [queryClient]);
}
