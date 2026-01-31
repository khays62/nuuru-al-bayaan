import { useQueryClient } from '@tanstack/react-query';
import { EVENTS } from '../../utils/events';
import { useRealtimeInvalidation } from '../../shared/realtime/useRealtimeInvalidation';
import { promotionKeys } from './queryKeys';

/**
 * Promotions realtime invalidation (EDCI).
 * Realtime -> EVENTS.PROMOTIONS_CHANGED / EVENTS.STUDENTS_CHANGED -> invalidate roster -> UI updates.
 */
export function usePromotionsRealtimeInvalidation({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  useRealtimeInvalidation(
    [EVENTS.PROMOTIONS_CHANGED, EVENTS.STUDENTS_CHANGED],
    () => {
      try {
        queryClient.invalidateQueries({ queryKey: promotionKeys.rosterBase, refetchType: 'active' });
      } catch {
        // ignore
      }
    },
    { enabled }
  );
}
