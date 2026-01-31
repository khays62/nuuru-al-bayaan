import { useQueryClient } from '@tanstack/react-query';
import { EVENTS } from '../../utils/events';
import { useRealtimeInvalidation } from '../../shared/realtime/useRealtimeInvalidation';
import { transferKeys } from './queryKeys';

/**
 * Transfers realtime invalidation (EDCI).
 * Realtime -> EVENTS.TRANSFERS_CHANGED -> invalidate transfers queries -> UI updates.
 */
export function useTransfersRealtimeInvalidation({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  useRealtimeInvalidation(
    [EVENTS.TRANSFERS_CHANGED],
    () => {
      try {
        queryClient.invalidateQueries({ queryKey: transferKeys.candidatesBase, refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: transferKeys.logsBase, refetchType: 'active' });
      } catch {
        // ignore
      }
    },
    { enabled }
  );
}
