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
    staleTime: 5_000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  return q.data ?? 0;
}
