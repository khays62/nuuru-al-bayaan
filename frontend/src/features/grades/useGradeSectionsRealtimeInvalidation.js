import { useQueryClient } from '@tanstack/react-query';
import { EVENTS } from '../../utils/events';
import { useRealtimeInvalidation } from '../../shared/realtime/useRealtimeInvalidation';
import { gradeSectionKeys } from './queryKeys';

/**
 * Grade Sections realtime invalidation (EDCI).
 */
export function useGradeSectionsRealtimeInvalidation({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  useRealtimeInvalidation(
    [EVENTS.GRADE_SECTIONS_CHANGED],
    () => {
      try {
        queryClient.invalidateQueries({ queryKey: gradeSectionKeys.listBase, refetchType: 'active' });
      } catch {
        // ignore
      }
    },
    { enabled }
  );
}
