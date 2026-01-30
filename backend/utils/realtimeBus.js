import { EventEmitter } from 'events';

// Simple in-memory realtime bus for SSE.
// Note: This is single-process only. If you deploy multiple instances,
// you will need a shared pub/sub (e.g., Redis) to broadcast across instances.
export const realtimeBus = new EventEmitter();
// SSE keeps one listener per connected client; allow many connections.
realtimeBus.setMaxListeners(0);

export function publishRealtime(payload) {
  try {
    realtimeBus.emit('event', payload);
  } catch {
    // ignore
  }
}
