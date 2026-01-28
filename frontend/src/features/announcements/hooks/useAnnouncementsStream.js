import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiUrl } from '../../../shared/api/http';
import { announcementKeys } from '../queryKeys';

export function useAnnouncementsStream({ user } = {}) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const username = user?.username || null;
    const userKey = user?._id || user?.username || null;
    if (!userKey) return;

    let es;
    let closed = false;
    let reconnectTimer;
    let reconnectAttempt = 0;

    const connect = () => {
      if (closed) return;
      try {
        // IMPORTANT: When API_BASE_URL is an absolute URL (e.g. http://localhost:7000/api),
        // EventSource may not include cookies unless withCredentials=true.
        // When API_BASE_URL is relative (/api), this will still work.
        const streamUrl = apiUrl('/announcements/stream');
        es = new EventSource(streamUrl, { withCredentials: true });
      } catch {
        es = null;
        return;
      }

      reconnectAttempt = 0;

      es.onmessage = (evt) => {
        if (closed) return;
        let payload;
        try {
          payload = JSON.parse(evt.data);
        } catch {
          return;
        }

        const type = payload?.type;
        const announcement = payload?.announcement;
        const id = payload?.id;

        if (type === 'created' && announcement) {
          queryClient.setQueryData(announcementKeys.list(), (prev) => {
            const list = Array.isArray(prev) ? prev : [];
            const exists = list.some((a) => String(a?._id) === String(announcement?._id));
            if (exists) return list;
            return [announcement, ...list];
          });
          const onAnnouncementsPage =
            typeof window !== 'undefined'
            && typeof window.location?.pathname === 'string'
            && window.location.pathname.startsWith('/announcements');

          const isSelfAuthored =
            (username && String(announcement?.author || '') === String(username))
            || (userKey && String(announcement?.createdById || '') === String(userKey));

          if (!onAnnouncementsPage && !isSelfAuthored) {
            // Optimistic bump; periodic polling will reconcile.
            queryClient.setQueryData(['announcements', 'unreadCount', userKey], (prev) => {
              const cur = Number(prev || 0);
              return Number.isFinite(cur) ? cur + 1 : 1;
            });
          }
          return;
        }

        if (type === 'updated' && announcement) {
          queryClient.setQueryData(announcementKeys.list(), (prev) => {
            const list = Array.isArray(prev) ? prev : [];
            return list.map((a) => (String(a?._id) === String(announcement?._id) ? announcement : a));
          });
          return;
        }

        if (type === 'deleted' && id) {
          queryClient.setQueryData(announcementKeys.list(), (prev) => {
            const list = Array.isArray(prev) ? prev : [];
            return list.filter((a) => String(a?._id) !== String(id));
          });
        }
      };

      es.onerror = () => {
        // Some browsers auto-reconnect, but if we hit 401/cookie issues or proxy hiccups,
        // a lightweight backoff reconnect tends to be more reliable.
        if (closed) return;
        try {
          if (es?.readyState === EventSource.CLOSED) {
            reconnectAttempt += 1;
            const ms = Math.min(30_000, 1_000 * Math.pow(2, Math.min(5, reconnectAttempt)));
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
              try { es?.close(); } catch { /* ignore */ }
              connect();
            }, ms);
          }
        } catch {
          // ignore
        }
      };
    };

    connect();

    return () => {
      closed = true;
      clearTimeout(reconnectTimer);
      try {
        es?.close();
      } catch {
        // ignore
      }
    };
  }, [queryClient, user]);
}
