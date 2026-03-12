import { useQueryClient } from '@tanstack/react-query';

import { useRealtimeInvalidation } from '../../shared/realtime/useRealtimeInvalidation.js';
import { EVENTS } from '../../utils/events.js';
import { privacyPolicyKeys } from './queryKeys.js';

export function usePrivacyPolicyRealtimeInvalidation({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  useRealtimeInvalidation(
    [EVENTS.PRIVACY_POLICY_CHANGED],
    () => {
      try {
        queryClient.invalidateQueries({ queryKey: privacyPolicyKeys.admin(), refetchType: 'active' });
      } catch {
        // ignore
      }
      try {
        queryClient.invalidateQueries({ queryKey: privacyPolicyKeys.client(), refetchType: 'active' });
      } catch {
        // ignore
      }
    },
    { enabled }
  );
}