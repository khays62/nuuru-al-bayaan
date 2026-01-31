import React from 'react';
import { on, off } from '../../utils/events';

/**
 * Subscribe to internal FE realtime events (EVENTS.*) and run a handler.
 *
 * This is intentionally generic so callers can do any mix of:
 * - queryClient.invalidateQueries({ queryKey: prefix })
 * - queryClient.removeQueries({ queryKey: prefix })
 * - queryClient.setQueryData(...)
 */
export function useRealtimeInvalidation(eventNames, onInvalidate, { enabled = true } = {}) {
  const handlerRef = React.useRef(onInvalidate);

  const eventKey = React.useMemo(() => {
    const names = Array.isArray(eventNames) ? eventNames : [eventNames];
    const clean = names.map((n) => String(n || '').trim()).filter(Boolean);
    return clean.join('|');
  }, [eventNames]);

  React.useEffect(() => {
    handlerRef.current = onInvalidate;
  }, [onInvalidate]);

  React.useEffect(() => {
    if (!enabled) return;

    const cleanNames = String(eventKey || '').split('|').map((x) => x.trim()).filter(Boolean);
    if (cleanNames.length === 0) return;

    const handler = (evt) => {
      try {
        // CustomEvent.detail is where our event payload lives.
        handlerRef.current?.(evt?.detail, evt);
      } catch {
        // ignore
      }
    };

    for (const name of cleanNames) on(name, handler);

    return () => {
      for (const name of cleanNames) off(name, handler);
    };
  }, [eventKey, enabled]);
}
