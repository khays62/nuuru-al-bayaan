import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiUrl } from '../api/http';
import { createRealtimeDispatcher } from './realtimeDispatcher';

export function useRealtimeStream({ user } = {}) {
  const queryClient = useQueryClient();
  const userId = String(user?._id || user?.id || '');
  const roleLower = String(user?.role || '').toLowerCase();

  React.useEffect(() => {
    const canUseRealtime = roleLower === 'admin' || roleLower === 'staff' || roleLower === 'teacher' || roleLower === 'student';
    if (!canUseRealtime) return;

    let es;
    let closed = false;
    let reconnectTimer;
    let reconnectAttempt = 0;

    let watchdog;
    let lastSeenAt = Date.now();

    const clearReconnectTimer = () => {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    };

    const debugEnabled = (() => {
      try {
        return String(localStorage.getItem('debug:realtime') || '') === '1';
      } catch {
        return false;
      }
    })();

    const setProbeStatus = (patch) => {
      try {
        if (typeof window === 'undefined') return;
        const prev = window.__realtimeSseStatus || {};
        window.__realtimeSseStatus = { ...prev, ...patch };
      } catch {
        // ignore
      }
    };

    const dispatcher = createRealtimeDispatcher({ queryClient, debounceMs: 250 });

    const scheduleReconnect = () => {
      if (closed) return;
      if (reconnectTimer) return;
      reconnectAttempt += 1;
      const ms = Math.min(30_000, 1_000 * Math.pow(2, Math.min(5, reconnectAttempt)));
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        try { es?.close(); } catch { /* ignore */ }
        connect();
      }, ms);
      setProbeStatus({ state: 'reconnecting', reconnectAttempt, nextRetryInMs: ms });
      if (debugEnabled) {
        try {
          // eslint-disable-next-line no-console
          console.log('[realtime] reconnect scheduled', { reconnectAttempt, ms });
        } catch {
          // ignore
        }
      }
    };

    const connect = () => {
      if (closed) return;

      clearInterval(watchdog);
      clearReconnectTimer();
      try { es?.close(); } catch { /* ignore */ }

      try {
        const streamUrl = apiUrl('/realtime/stream');
        es = new EventSource(streamUrl, { withCredentials: true });
      } catch {
        es = null;
        scheduleReconnect();
        return;
      }

      setProbeStatus({ state: 'connecting', readyState: es?.readyState, lastSeenAt });

      es.onopen = () => {
        reconnectAttempt = 0;
        lastSeenAt = Date.now();
        clearReconnectTimer();
        setProbeStatus({ state: 'open:connected', readyState: es?.readyState, lastSeenAt });
        if (debugEnabled) {
          try {
            // eslint-disable-next-line no-console
            console.log('[realtime] connected');
          } catch {
            // ignore
          }
        }
      };

      const noteSeen = (kind) => {
        lastSeenAt = Date.now();
        setProbeStatus({ lastSeenAt, lastSeenKind: kind, readyState: es?.readyState });
      };

      // Heartbeat messages are sent as `event: ping`, so listen explicitly.
      es.addEventListener('ping', () => noteSeen('ping'));

      es.onmessage = (evt) => {
        if (closed) return;
        noteSeen('message');

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
        // Force our own reconnect loop (EventSource auto-reconnect can get stuck in some cases).
        scheduleReconnect();
      };

      // Watchdog: server pings every ~25s. If we haven't seen anything for >60s, reconnect.
      watchdog = setInterval(() => {
        if (closed) return;
        const age = Date.now() - lastSeenAt;
        if (age > 60_000) {
          if (debugEnabled) {
            try {
              // eslint-disable-next-line no-console
              console.warn('[realtime] stale stream; reconnecting', { age });
            } catch {
              // ignore
            }
          }
          scheduleReconnect();
        }
      }, 10_000);
    };

    const handleOnline = () => {
      if (closed) return;
      connect();
    };

    const handleVisibilityChange = () => {
      if (closed) return;
      if (typeof document === 'undefined') return;
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastSeenAt > 15_000) connect();
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    connect();

    return () => {
      closed = true;
      clearReconnectTimer();
      clearInterval(watchdog);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      dispatcher.dispose();
      try { es?.close(); } catch { /* ignore */ }
    };
  }, [queryClient, roleLower, userId]);
}
