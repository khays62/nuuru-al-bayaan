/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from 'react';
import { queryClient } from '../queryClient';
import { abortSessionRequests, resetSessionAbortController } from '../api/sessionAbort';
import { fetchJson } from '../shared/api/http';
import { on as onEvent, off as offEvent, EVENTS } from '../utils/events';

const AuthContext = createContext();

const AUTH_LOGOUT_KEY = 'auth:logout';
const AUTH_LAST_ACTIVITY_KEY = 'auth:lastActivity';
const AUTH_VERIFY_INTERVAL_MS = (() => {
  const raw = import.meta?.env?.VITE_AUTH_VERIFY_INTERVAL_MS;
  const n = Number(raw);
  // Default: frequent enough to enforce deactivation, without spamming the backend.
  const base = Number.isFinite(n) && n > 0 ? n : 15_000;
  // Guardrail: avoid ultra-tight polling (e.g. 1000ms) that overloads the server.
  return Math.max(5_000, base);
})();
// Auto-logout after user inactivity (shared across tabs via localStorage).
// 30 minutes
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const idleTimerRef = React.useRef(null);
  const lastActivityWriteRef = React.useRef(0);

  const redirectToLogin = () => {
    try {
      if (typeof window !== 'undefined') {
        const path = window.location?.pathname || '';
        if (!path.startsWith('/login')) {
          window.location.assign('/login');
        }
      }
    } catch {
      // ignore
    }
  };

  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  const broadcastLogout = () => {
    try {
      localStorage.setItem(AUTH_LOGOUT_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  const noteActivity = () => {
    const now = Date.now();
    // Throttle writes to localStorage (mousemove can be very chatty)
    if (now - lastActivityWriteRef.current < 1000) return;
    lastActivityWriteRef.current = now;
    try {
      localStorage.setItem(AUTH_LAST_ACTIVITY_KEY, String(now));
    } catch {
      // ignore
    }
  };

  const clientLogout = async ({ redirect = true } = {}) => {
    try {
      abortSessionRequests('logout');
      setUser(null);
      await queryClient.cancelQueries();
      queryClient.clear();
    } catch {
      // ignore
    }
    if (redirect) redirectToLogin();
  };

  const fetchCurrentUser = async () => {
    try {
      const data = await fetchJson('/auth/verify');
      if (data?.success && data?.user) setUser(data.user);
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Heartbeat: detect global logout (token invalidated) even if the tab isn't making API calls.
  useEffect(() => {
    if (!user) return;
    let inFlight = false;
    let stopped = false;
    let timer = null;

    const getIntervalMs = () => {
      // Slow down when tab is hidden to reduce load.
      if (typeof document !== 'undefined' && document.hidden) return Math.max(30_000, AUTH_VERIFY_INTERVAL_MS);
      return AUTH_VERIFY_INTERVAL_MS;
    };

    const schedule = () => {
      if (stopped) return;
      clearTimeout(timer);
      timer = setTimeout(tick, getIntervalMs());
    };

    const tick = async () => {
      if (stopped) return;
      if (inFlight) return schedule();
      inFlight = true;
      try {
        const data = await fetchJson('/auth/verify');
        const ok = Boolean(data?.success && data?.user);
        if (!ok) clientLogout({ redirect: true });
      } catch {
        // ignore transient failures
      } finally {
        inFlight = false;
        schedule();
      }
    };

    const onVis = () => schedule();
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);
    schedule();

    return () => {
      stopped = true;
      clearTimeout(timer);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Cross-tab logout: if any tab logs out, all tabs should log out.
  useEffect(() => {
    const onStorage = (e) => {
      if (!e) return;
      if (e.key === AUTH_LOGOUT_KEY) {
        clientLogout({ redirect: true });
        return;
      }
      if (e.key === AUTH_LAST_ACTIVITY_KEY) {
        // Another tab was active; no immediate action needed here.
        // Our idle timer is scheduled based on shared lastActivity.
        scheduleIdleCheck();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Backend-driven invalidation (401): auto logout.
  useEffect(() => {
    const onUnauthorized = () => {
      if (!user) return;
      clientLogout({ redirect: true });
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const scheduleIdleCheck = () => {
    if (!user) return;
    clearIdleTimer();

    let last = Date.now();
    try {
      const raw = localStorage.getItem(AUTH_LAST_ACTIVITY_KEY);
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) last = n;
    } catch {
      // ignore
    }

    const remaining = Math.max(0, IDLE_TIMEOUT_MS - (Date.now() - last));
    idleTimerRef.current = setTimeout(() => {
      // When truly idle (no tab activity), auto-logout all tabs in this browser.
      logout({ global: false, broadcast: true, redirect: true });
    }, remaining);
  };

  // Idle auto-logout (shared across tabs via localStorage).
  useEffect(() => {
    if (!user) {
      clearIdleTimer();
      return;
    }

    // Initialize shared activity to now.
    noteActivity();
    scheduleIdleCheck();

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const onActivity = () => {
      noteActivity();
      scheduleIdleCheck();
    };
    for (const ev of events) window.addEventListener(ev, onActivity, { passive: true });

    return () => {
      for (const ev of events) window.removeEventListener(ev, onActivity);
      clearIdleTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const refreshUser = fetchCurrentUser;

  // Realtime permissions/profile refresh: when a user's account is changed, refresh auth state immediately.
  // This avoids waiting for the polling interval (default 15s) to pick up new permissions.
  useEffect(() => {
    if (!user) return;
    const currentId = String(user?.id || user?._id || '');
    if (!currentId) return;

    let timer = null;
    const handler = (ev) => {
      const changedId = ev?.detail?.id != null ? String(ev.detail.id) : '';
      if (!changedId || changedId !== currentId) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        fetchCurrentUser();
      }, 250);
    };

    onEvent(EVENTS.USERS_CHANGED, handler);
    return () => {
      clearTimeout(timer);
      offEvent(EVENTS.USERS_CHANGED, handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const hasPermission = (module, action) => {
    if (!user) return false;
    if (String(user.role || '').toLowerCase() === 'admin') return true;
    const perm = user.permissions?.[module];
    if (!perm) return false;
    return perm.full === true || perm[action] === true;
  };

  const login = async (username, password) => {
    try {
      const identifier = String(username || '').trim();
      const secret = String(password || '');

      const upperIdentifier = identifier.toUpperCase();
      // Student ID formats supported:
      // - numeric only (legacy)
      // - starts with ST (legacy)
      // - cohort-coded IDs like DU5SA15 (2 letters + digits + S + section letter + digits)
      const isStudent =
        /^[0-9]+$/.test(identifier) ||
        upperIdentifier.startsWith('ST') ||
        /^[A-Z]{2}\d+S[A-Z]\d{2,}$/i.test(identifier);

      const normalizedStudentId = /^[A-Z]{2}\d+S[A-Z]\d{2,}$/i.test(identifier)
        ? upperIdentifier
        : (upperIdentifier.startsWith('ST') ? upperIdentifier : identifier);

      const payload = isStudent
        ? { studentId: normalizedStudentId, password: secret }
        : { username: identifier, password: secret };

      const data = await fetchJson('/auth/login', { method: 'POST', body: JSON.stringify(payload) });

      if (data?.success) {
        // New auth session: ensure previous session abort state doesn't leak.
        resetSessionAbortController();

        // Ensure the default-password prompt shows again after each fresh login
        // if the account is still on the default password.
        try {
          const keys = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i);
            if (k) keys.push(k);
          }
          for (const k of keys) {
            if (
              k === 'student_force_pw_dismissed'
              || k === 'student_skip_force_pw'
              || k === 'user_force_pw_dismissed'
              || k.startsWith('user_force_pw_dismissed:')
            ) {
              sessionStorage.removeItem(k);
            }
          }
        } catch {
          // ignore
        }

        await fetchCurrentUser();
        return { success: true, status: 200 };
      }

      return {
        success: false,
        status: 200,
        code: data?.code,
        message: data?.message,
        remainingAttempts: data?.remainingAttempts,
        retryAfterSeconds: data?.retryAfterSeconds,
      };
    } catch (err) {
      const status = err?.status || 0;
      const data = err?.data || {};
      return {
        success: false,
        status,
        code: data?.code,
        message: data?.message || err.message,
        remainingAttempts: data?.remainingAttempts,
        retryAfterSeconds: data?.retryAfterSeconds,
      };
    }
  };

  const logout = async ({ global = true, broadcast = true, redirect = true } = {}) => {
    try {
      if (broadcast) broadcastLogout();

      // Immediately clear client auth + cancel in-flight queries so we don't spam 401s after logout.
      await clientLogout({ redirect: false });

      // Best-effort server logout (cookie clear). If it fails, we still consider client logged out.
      await fetchJson('/auth/logout', { method: 'POST', body: JSON.stringify({ global }) });
      try {
        sessionStorage.removeItem('student_force_pw_dismissed');
        sessionStorage.removeItem('student_skip_force_pw');
      } catch {
        // ignore
      }
    } catch {
      // Don't log noisy network/auth errors during logout.
    } finally {
      if (redirect) redirectToLogin();
    }
  };

  return (
    <AuthContext.Provider value={{ auth: { user }, loading, login, logout, hasPermission, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
