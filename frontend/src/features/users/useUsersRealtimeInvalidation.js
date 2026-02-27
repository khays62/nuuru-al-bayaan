import { useQueryClient } from '@tanstack/react-query';
import { EVENTS } from '../../utils/events';
import { useRealtimeInvalidation } from '../../shared/realtime/useRealtimeInvalidation';
import { userKeys } from './queryKeys';

/**
 * User Management realtime invalidation (EDCI).
 * Listens to FE USERS_CHANGED events (which come from SSE dispatcher or local actions)
 * and invalidates only the relevant users query keys.
 */
export function useUsersRealtimeInvalidation({ userId } = {}) {
  const queryClient = useQueryClient();

  useRealtimeInvalidation(
    [EVENTS.USERS_CHANGED],
    (ev) => {
      const detail = ev?.detail || {};
      const changedId = detail?.id != null ? String(detail.id) : '';

      try {
        queryClient.invalidateQueries({ queryKey: userKeys.adminListBase, refetchType: 'active' });
      } catch {
        // ignore
      }

      // Some backend events intentionally omit `id` (broadcast). In that case,
      // refresh all cached admin profiles/audit logs so open pages update without manual refresh.
      if (!changedId) {
        try {
          queryClient.invalidateQueries({ queryKey: userKeys.adminProfileBase, refetchType: 'active' });
        } catch {
          // ignore
        }
        try {
          queryClient.invalidateQueries({ queryKey: userKeys.adminAuditLogsBase, refetchType: 'active' });
        } catch {
          // ignore
        }
        return;
      }

      // If we know which user changed, refresh that profile cache too.
      try {
        queryClient.invalidateQueries({ queryKey: userKeys.adminProfile(changedId), refetchType: 'active' });
      } catch {
        // ignore
      }

      // If a specific user profile is open, refresh it and its audit logs.
      if (userId && changedId && changedId === String(userId)) {
        try {
          queryClient.invalidateQueries({ queryKey: userKeys.adminProfile(userId), refetchType: 'active' });
        } catch {
          // ignore
        }
        try {
          queryClient.invalidateQueries({ queryKey: userKeys.adminAuditLogsBase, refetchType: 'active' });
        } catch {
          // ignore
        }
      }
    },
    { enabled: true }
  );
}
