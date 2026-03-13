// frontend/src/api/sessionAbort.js
// A single AbortController for the current auth session.
// - Do NOT abort on normal tab navigation.
// - Abort immediately on logout (to stop post-logout request spam).

let controller = new AbortController();

export function getSessionSignal() {
  return controller.signal;
}

export function resetSessionAbortController() {
  controller = new AbortController();
  return controller.signal;
}

export function abortSessionRequests(reason) {
  try {
    if (!controller.signal.aborted) controller.abort(reason);
  } catch {
    // ignore
  }
}

export function anySignal(a, b) {
  if (a && b) {
    // Prefer native AbortSignal.any where available.
    try {
       
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
         
        return AbortSignal.any([a, b]);
      }
    } catch {
      // fall back
    }

    const combined = new AbortController();
    const abort = () => {
      try { combined.abort(); } catch { /* ignore */ }
    };
    if (a.aborted || b.aborted) {
      abort();
      return combined.signal;
    }
    a.addEventListener('abort', abort, { once: true });
    b.addEventListener('abort', abort, { once: true });
    return combined.signal;
  }

  return a || b || undefined;
}
