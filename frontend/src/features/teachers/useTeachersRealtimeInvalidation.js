import { useQueryClient } from '@tanstack/react-query';
import { EVENTS } from '../../utils/events';
import { useRealtimeInvalidation } from '../../shared/realtime/useRealtimeInvalidation';
import { teacherKeys } from './queryKeys';

/**
 * Teacher feature realtime invalidation (EDCI).
 * Listens to FE events (which come from SSE dispatcher or local actions)
 * and invalidates only the relevant teacher query keys.
 */
export function useTeachersRealtimeInvalidation({ teacherId } = {}) {
  const queryClient = useQueryClient();

  useRealtimeInvalidation(
    [EVENTS.TEACHERS_CHANGED],
    (ev) => {
      const detail = ev?.detail || {};
      const changedId = detail?.id != null ? String(detail.id) : '';

      try {
        queryClient.invalidateQueries({ queryKey: teacherKeys.adminListBase, refetchType: 'active' });
      } catch {
        // ignore
      }

      // Keep assignments modals in sync cross-browser.
      try {
        queryClient.invalidateQueries({ queryKey: teacherKeys.assignmentsBase, refetchType: 'active' });
      } catch {
        // ignore
      }

      if (teacherId && changedId && changedId === String(teacherId)) {
        try {
          queryClient.invalidateQueries({ queryKey: teacherKeys.adminProfile(teacherId), refetchType: 'active' });
        } catch {
          // ignore
        }
        try {
          queryClient.invalidateQueries({ queryKey: teacherKeys.adminAuditLogsBase, refetchType: 'active' });
        } catch {
          // ignore
        }
        try {
          queryClient.invalidateQueries({ queryKey: teacherKeys.assignments(teacherId), refetchType: 'active' });
        } catch {
          // ignore
        }
      }
    },
    { enabled: true }
  );
}
