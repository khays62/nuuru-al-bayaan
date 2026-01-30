import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiUrl } from '../api/http';
import { createRealtimeDispatcher } from './realtimeDispatcher';

export function useRealtimeStream({ user } = {}) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const roleLower = String(user?.role || '').toLowerCase();
    const canUseRealtime = roleLower === 'admin' || roleLower === 'staff' || roleLower === 'teacher';
    if (!canUseRealtime) return;

    let es;
    let closed = false;
    let reconnectTimer;
    let reconnectAttempt = 0;

    const dispatcher = createRealtimeDispatcher({ queryClient, debounceMs: 250 });

    const connect = () => {
      if (closed) return;
      try {
        const streamUrl = apiUrl('/realtime/stream');
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

        dispatcher.dispatch(payload);
      };

      es.onerror = () => {
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
      dispatcher.dispose();
      try { es?.close(); } catch { /* ignore */ }
    };
  }, [queryClient, user]);
}
