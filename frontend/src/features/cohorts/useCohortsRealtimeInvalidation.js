import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { on as onEvent, off as offEvent, EVENTS } from '../../utils/events';
import { cohortsKeys } from './queryKeys';

export function useCohortsRealtimeInvalidation() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => {
      try {
        queryClient.invalidateQueries({ queryKey: cohortsKeys.listBase() });
        queryClient.invalidateQueries({ queryKey: cohortsKeys.timelineBase() });
      } catch {
        // ignore
      }
    };

    onEvent(EVENTS.COHORTS_CHANGED, handler);
    return () => offEvent(EVENTS.COHORTS_CHANGED, handler);
  }, [queryClient]);
}
