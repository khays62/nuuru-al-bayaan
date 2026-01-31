import { useQueryClient } from '@tanstack/react-query';
import { EVENTS } from '../../utils/events';
import { useRealtimeInvalidation } from '../../shared/realtime/useRealtimeInvalidation';
import { subjectKeys } from './queryKeys';

/**
 * Subjects realtime invalidation (EDCI).
 * Realtime -> EVENTS.SUBJECTS_CHANGED -> invalidate subjects queries -> UI updates.
 */
export function useSubjectsRealtimeInvalidation({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  useRealtimeInvalidation(
    [EVENTS.SUBJECTS_CHANGED],
    () => {
      try {
        queryClient.invalidateQueries({ queryKey: subjectKeys.listBase, refetchType: 'active' });
      } catch {
        // ignore
      }
    },
    { enabled }
  );
}
