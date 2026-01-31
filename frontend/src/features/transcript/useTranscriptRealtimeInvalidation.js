import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { on as onEvent, off as offEvent, EVENTS } from '../../utils/events';
import { transcriptKeys } from './queryKeys';

export function useTranscriptRealtimeInvalidation() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => {
      try {
        queryClient.invalidateQueries({ queryKey: transcriptKeys.fullBase() });
      } catch {
        // ignore
      }
    };

    onEvent(EVENTS.RESULTS_CHANGED, handler);
    onEvent(EVENTS.TRANSCRIPT_CHANGED, handler);
    onEvent(EVENTS.EXAMS_CHANGED, handler);

    // Enrollment-affecting events can change transcript progression.
    onEvent(EVENTS.STUDENTS_CHANGED, handler);
    onEvent(EVENTS.PROMOTIONS_CHANGED, handler);
    onEvent(EVENTS.TRANSFERS_CHANGED, handler);

    return () => {
      offEvent(EVENTS.RESULTS_CHANGED, handler);
      offEvent(EVENTS.TRANSCRIPT_CHANGED, handler);
      offEvent(EVENTS.EXAMS_CHANGED, handler);
      offEvent(EVENTS.STUDENTS_CHANGED, handler);
      offEvent(EVENTS.PROMOTIONS_CHANGED, handler);
      offEvent(EVENTS.TRANSFERS_CHANGED, handler);
    };
  }, [queryClient]);
}
