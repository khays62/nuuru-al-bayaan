import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { on as onEvent, off as offEvent, EVENTS } from '../../utils/events';
import { announcementKeys } from './queryKeys';

export function useAnnouncementsRealtimeInvalidation({ userKey } = {}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => {
      try {
        queryClient.invalidateQueries({ queryKey: announcementKeys.list() });
        if (userKey) queryClient.invalidateQueries({ queryKey: ['announcements', 'unreadCount', userKey] });
      } catch {
        // ignore
      }
    };

    onEvent(EVENTS.ANNOUNCEMENTS_CHANGED, handler);
    return () => offEvent(EVENTS.ANNOUNCEMENTS_CHANGED, handler);
  }, [queryClient, userKey]);
}
