import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';
import Input from '../../shared/components/ui/Input';
import Button from '../../shared/components/ui/Button';

export default function LoginPage() {
  const { auth, login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cooldownUntilMs, setCooldownUntilMs] = useState(0);
  const [cooldownKind, setCooldownKind] = useState(''); // '' | 'COOLDOWN' | 'LOCKED_24H'
  const [nowMs, setNowMs] = useState(Date.now());

  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const wasLoggedInRef = useRef(false);
  const loadingRef = useRef(false);
  const clearAutofillIntervalRef = useRef(null);
  const hasFocusedRef = useRef(false);
  const lastCooldownToastAtRef = useRef(0);

  const clearForm = useMemo(
    () => () => {
      if (usernameRef.current) usernameRef.current.value = '';
      if (passwordRef.current) passwordRef.current.value = '';
    },
    []
  );

  const cooldownRemainingSeconds = Math.max(0, cooldownUntilMs ? Math.ceil((cooldownUntilMs - nowMs) / 1000) : 0);

  const formatSeconds = (secs) => {
    const s = Math.max(0, Math.floor(Number(secs) || 0));
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (hh > 0) return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  const stopAutofillClear = () => {
    if (clearAutofillIntervalRef.current) {
      clearInterval(clearAutofillIntervalRef.current);
      clearAutofillIntervalRef.current = null;
    }
  };

  const startAutofillClearUntilFocus = () => {
    stopAutofillClear();
    const start = Date.now();
    clearAutofillIntervalRef.current = setInterval(() => {
      if (hasFocusedRef.current) {
        stopAutofillClear();
        return;
      }

      // Keep fields empty until the user focuses the username.
      clearForm();

      // Safety stop.
      if (Date.now() - start > 2000) {
        stopAutofillClear();
      }
    }, 100);
  };

  const handleInput = () => {
    // Intentionally no auto-login on autofill.
    // Standard UX: user always clicks "Sign in".
  };

  // Redirect after successful login
  useEffect(() => {
    if (!auth?.user) return;

    const role = auth.user.role;
    switch (role) {
      case 'admin':
        navigate('/dashboard', { replace: true });
        break;
      case 'staff':
        navigate('/dashboard', { replace: true });
        break;
      case 'teacher':
        navigate('/teacher-dashboard', { replace: true });
        break;
      case 'student':
        navigate('/student-dashboard', { replace: true });
        break;
      default:
        navigate('/', { replace: true });
    }
  }, [auth?.user, navigate]);

  // Keep login inputs empty by default. Browser-saved logins will appear on focus.
  useEffect(() => {
    clearForm();
    hasFocusedRef.current = false;
    // Some browsers try to autofill after a delay; keep clearing until focus.
    requestAnimationFrame(() => clearForm());
    setTimeout(() => clearForm(), 0);
    startAutofillClearUntilFocus();
    return () => stopAutofillClear();
  }, [clearForm]);

  // After logout, reset inputs back to "clean until focus".
  useEffect(() => {
    const loggedIn = !!auth?.user;
    if (wasLoggedInRef.current && !loggedIn) {
      clearForm();
      hasFocusedRef.current = false;
      startAutofillClearUntilFocus();
    }
    wasLoggedInRef.current = loggedIn;
  }, [auth?.user, clearForm]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  // Tick a timer while we're in cooldown so countdown updates.
  useEffect(() => {
    if (!cooldownUntilMs) return;
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, [cooldownUntilMs]);

  // Auto-clear cooldown once it expires.
  useEffect(() => {
    if (!cooldownUntilMs) return;
    if (cooldownRemainingSeconds <= 0) setCooldownUntilMs(0);
  }, [cooldownRemainingSeconds, cooldownUntilMs]);

  const doLogin = async (username, password) => {
    if (!username || !password) return;
    if (loadingRef.current) return;
    if (cooldownRemainingSeconds > 0) {
      const now = Date.now();
      if (now - lastCooldownToastAtRef.current > 2000) {
        lastCooldownToastAtRef.current = now;
        toast.error(`Too many attempts. Try again in ${formatSeconds(cooldownRemainingSeconds)}.`);
      }
      return;
    }
    setLoading(true);
    try {
      const result = await login(username, password);
      if (!result?.success) {
        const status = Number(result?.status || 0);
        const retryAfterSeconds = Number(result?.retryAfterSeconds || 0);
        const code = String(result?.code || '');
        const principalType = String(result?.principalType || '');
        const remainingAttemptsRaw = result?.remainingAttempts;
        const remainingAttempts = Number.isFinite(Number(remainingAttemptsRaw)) ? Number(remainingAttemptsRaw) : null;
        const showAttemptsLeft = remainingAttempts !== null && Number.isFinite(remainingAttempts) && remainingAttempts <= 3;
        const lastAttemptHint = showAttemptsLeft && remainingAttempts === 1 ? ' Last attempt before lock.' : '';

        if (status === 429 && retryAfterSeconds > 0) {
          const until = Date.now() + retryAfterSeconds * 1000;
          setCooldownUntilMs(until);
          setCooldownKind(code === 'LOGIN_LOCKED_24H' ? 'LOCKED_24H' : 'COOLDOWN');
          lastCooldownToastAtRef.current = Date.now();
          if (code === 'LOGIN_LOCKED_24H') {
            if (principalType === 'unknown') {
              toast.error('Unknown username. Too many attempts; login is blocked.');
            } else {
              toast.error('Account locked for 24 hours. Please contact an administrator.');
            }
          } else {
            toast.error(`Too many attempts. Try again in ${formatSeconds(retryAfterSeconds)}.`);
          }
          return;
        }

        if (status === 429 && code === 'UNKNOWN_USERNAME_BLOCKED') {
          toast.error('Unknown username. Too many attempts; login is blocked.');
          return;
        }

        if (code === 'USER_NOT_FOUND') {
          if (showAttemptsLeft) {
            toast.error(`Unknown username / student ID. Attempts left: ${remainingAttempts}.${remainingAttempts === 1 ? ' Last attempt before block.' : ''}`);
          } else {
            toast.error('Unknown username / student ID.');
          }
          return;
        }
        if (code === 'WRONG_PASSWORD') {
          if (showAttemptsLeft) {
            toast.error(`Wrong password. Attempts left: ${remainingAttempts}.${lastAttemptHint}`);
          } else {
            toast.error('Wrong password.');
          }
          return;
        }

        if (status === 401 && showAttemptsLeft) {
          toast.error(`${result?.message || 'Invalid credentials.'} Attempts left: ${remainingAttempts}.${lastAttemptHint}`);
          return;
        }

        toast.error(result?.message || 'Invalid credentials.');
        return;
      }

      // Successful login clears any local cooldown state.
      setCooldownUntilMs(0);
      setCooldownKind('');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const username = (usernameRef.current?.value || '').trim();
    const password = (passwordRef.current?.value || '').trim();
    await doLogin(username, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center px-6 py-10">
      <div className="relative w-full max-w-4xl rounded-2xl p-2">
        <div className="relative flex flex-col justify-center rounded-2xl bg-white/70 px-6 py-16 backdrop-blur-md shadow-xl">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10">
              <h1 className="text-4xl font-extrabold uppercase text-gray-800">Sign in</h1>
              <p className="text-base font-bold leading-normal text-gray-500">
                Enter your username and password to log in.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username / Student ID</label>
                <Input
                  ref={usernameRef}
                  name="username"
                  type="text"
                  onInput={handleInput}
                  onFocus={() => { hasFocusedRef.current = true; stopAutofillClear(); }}
                  className="px-4 py-3"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <Input
                  ref={passwordRef}
                  name="password"
                  type="password"
                  onInput={handleInput}
                  className="px-4 py-3"
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || cooldownRemainingSeconds > 0}
                variant={cooldownRemainingSeconds > 0 ? 'danger' : 'brand'}
                size="lg"
                className="w-full justify-center py-3 font-semibold"
              >
                {loading
                  ? 'Signing in…'
                  : (
                    cooldownRemainingSeconds > 0
                      ? (cooldownKind === 'LOCKED_24H'
                        ? 'Locked (contact admin)'
                        : `Try again in ${formatSeconds(cooldownRemainingSeconds)}`)
                      : 'Sign in'
                  )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
