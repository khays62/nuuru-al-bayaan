import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiUrl } from '../api/http';
import { createRealtimeDispatcher } from './realtimeDispatcher';

export function useRealtimeStream({ user } = {}) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const roleLower = String(user?.role || '').toLowerCase();
    const canUseRealtime = roleLower === 'admin' || roleLower === 'staff' || roleLower === 'teacher' || roleLower === 'student';
    if (!canUseRealtime) return;

    let es;
    let closed = false;
    let reconnectTimer;
    let reconnectAttempt = 0;

    let watchdog;
    let lastSeenAt = Date.now();

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
      reconnectAttempt += 1;
      const ms = Math.min(30_000, 1_000 * Math.pow(2, Math.min(5, reconnectAttempt)));
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
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

    connect();

    return () => {
      closed = true;
      clearTimeout(reconnectTimer);
      clearInterval(watchdog);
      dispatcher.dispose();
      try { es?.close(); } catch { /* ignore */ }
    };
  }, [queryClient, user]);
}
