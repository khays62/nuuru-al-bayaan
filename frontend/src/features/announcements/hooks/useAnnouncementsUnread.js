import { useQuery } from '@tanstack/react-query';
import { getAnnouncementsUnreadCount } from '../../../api';

export function useAnnouncementsUnread(userKey) {
  const q = useQuery({
    queryKey: ['announcements', 'unreadCount', userKey],
    enabled: !!userKey,
    queryFn: async ({ signal }) => {
      const data = await getAnnouncementsUnreadCount({ signal });
      const n = Number(data?.count || 0);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    },
    // SSE optimistically bumps unread; polling just reconciles occasionally.
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  return q.data ?? 0;
}
