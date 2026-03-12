import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';
import Input from '../../shared/components/ui/Input';
import Button from '../../shared/components/ui/Button';
import { useI18n } from '../../i18n/useI18n';
import appLogo from '../../assets/Logo.jpeg';

export default function LoginPage() {
  const { t } = useI18n();
  const { auth, login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cooldownUntilMs, setCooldownUntilMs] = useState(0);
  const [cooldownKind, setCooldownKind] = useState(''); // '' | 'COOLDOWN' | 'LOCKED' | 'BLOCKED'
  const [nowMs, setNowMs] = useState(Date.now());
  const [swapSides, setSwapSides] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 768px)').matches;
    } catch {
      return true;
    }
  });

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

  const formatLockDuration = (secs) => {
    const totalSeconds = Math.max(0, Math.ceil(Number(secs) || 0));
    const units = [
      { size: 30 * 24 * 60 * 60, singularKey: 'month', pluralKey: 'months', fallbackSingular: 'month', fallbackPlural: 'months' },
      { size: 7 * 24 * 60 * 60, singularKey: 'week', pluralKey: 'weeks', fallbackSingular: 'week', fallbackPlural: 'weeks' },
      { size: 24 * 60 * 60, singularKey: 'day', pluralKey: 'days', fallbackSingular: 'day', fallbackPlural: 'days' },
      { size: 60 * 60, singularKey: 'hour', pluralKey: 'hours', fallbackSingular: 'hour', fallbackPlural: 'hours' },
      { size: 60, singularKey: 'minute', pluralKey: 'minutes', fallbackSingular: 'minute', fallbackPlural: 'minutes' },
    ];

    for (const unit of units) {
      if (totalSeconds >= unit.size) {
        const count = Math.max(1, Math.ceil(totalSeconds / unit.size));
        const label = count === 1
          ? t(`auth.login.duration.${unit.singularKey}`, { defaultValue: unit.fallbackSingular })
          : t(`auth.login.duration.${unit.pluralKey}`, { defaultValue: unit.fallbackPlural });
        return `${count} ${label}`;
      }
    }

    return `1 ${t('auth.login.duration.minute', { defaultValue: 'minute' })}`;
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

  // Track desktop breakpoint for slide animation.
  useEffect(() => {
    let mql;
    try {
      if (typeof window === 'undefined' || !window.matchMedia) return;
      mql = window.matchMedia('(min-width: 768px)');
      const onChange = (e) => setIsDesktop(Boolean(e.matches));
      setIsDesktop(Boolean(mql.matches));
      if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange);
      else if (typeof mql.addListener === 'function') mql.addListener(onChange);
      return () => {
        if (typeof mql.removeEventListener === 'function') mql.removeEventListener('change', onChange);
        else if (typeof mql.removeListener === 'function') mql.removeListener(onChange);
      };
    } catch {
      // ignore
    }
    return undefined;
  }, []);

  const doLogin = async (username, password) => {
    if (!username || !password) return;
    if (loadingRef.current) return;
    if (cooldownRemainingSeconds > 0) {
      const now = Date.now();
      if (now - lastCooldownToastAtRef.current > 2000) {
        lastCooldownToastAtRef.current = now;
        toast.error(
          t('auth.login.errors.tooManyAttemptsTryAgainIn', {
            defaultValue: 'Too many attempts. Try again in {{time}}.',
            time: formatSeconds(cooldownRemainingSeconds),
          })
        );
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
        const isFinalAttemptBeforeBlock = Boolean(result?.isFinalAttemptBeforeBlock);
        const lastAttemptHint = isFinalAttemptBeforeBlock
          ? ((principalType === 'known' || code === 'WRONG_PASSWORD')
            ? t('auth.login.errors.lastAttemptBeforeLock', { defaultValue: ' Last attempt before lock.' })
            : t('auth.login.errors.lastAttemptBeforeBlock', { defaultValue: ' Last attempt before block.' }))
          : '';

        if (status === 429 && retryAfterSeconds > 0) {
          const until = Date.now() + retryAfterSeconds * 1000;
          setCooldownUntilMs(until);
          setCooldownKind(
            code === 'UNKNOWN_USERNAME_BLOCKED'
              ? 'BLOCKED'
              : (code === 'LOGIN_LOCKED_24H' ? 'LOCKED' : 'COOLDOWN')
          );
          lastCooldownToastAtRef.current = Date.now();
          if (code === 'LOGIN_LOCKED_24H') {
            if (principalType === 'unknown') {
              toast.error(t('auth.login.errors.unknownUsernameBlockedTryAgainIn', {
                defaultValue: 'Unknown username. Login is blocked. Try again in {{time}}.',
                time: formatLockDuration(retryAfterSeconds),
              }));
            } else {
              toast.error(t('auth.login.errors.accountLockedTryAgainIn', {
                defaultValue: 'Username is locked. Try again in {{time}}.',
                time: formatLockDuration(retryAfterSeconds),
              }));
            }
          } else if (code === 'UNKNOWN_USERNAME_BLOCKED') {
            toast.error(t('auth.login.errors.unknownUsernameBlockedTryAgainIn', {
              defaultValue: 'Unknown username. Login is blocked. Try again in {{time}}.',
              time: formatLockDuration(retryAfterSeconds),
            }));
          } else {
            toast.error(
              t('auth.login.errors.tooManyAttemptsTryAgainIn', {
                defaultValue: 'Too many attempts. Try again in {{time}}.',
                time: formatSeconds(retryAfterSeconds),
              })
            );
          }
          return;
        }

        if (status === 429 && code === 'UNKNOWN_USERNAME_BLOCKED') {
          toast.error(t('auth.login.errors.unknownUsernameBlocked', { defaultValue: 'Unknown username. Login is blocked.' }));
          return;
        }

        if (code === 'USER_NOT_FOUND') {
          if (isFinalAttemptBeforeBlock) {
            toast.error(
              t('auth.login.errors.unknownUsernameWithAttempts', {
                defaultValue: 'Unknown username. Attempts left: {{count}}.{{hint}}',
                count: remainingAttempts || 1,
                hint: lastAttemptHint,
              })
            );
          } else {
            toast.error(t('auth.login.errors.unknownUsername', { defaultValue: 'Unknown username.' }));
          }
          return;
        }
        if (code === 'WRONG_PASSWORD') {
          if (isFinalAttemptBeforeBlock) {
            toast.error(
              t('auth.login.errors.wrongPasswordWithAttempts', {
                defaultValue: 'Wrong password. Attempts left: {{count}}.{{hint}}',
                count: remainingAttempts || 1,
                hint: lastAttemptHint,
              })
            );
          } else {
            toast.error(t('auth.login.errors.wrongPassword', { defaultValue: 'Wrong password.' }));
          }
          return;
        }

        if (status === 401 && isFinalAttemptBeforeBlock) {
          toast.error(
            t('auth.login.errors.invalidCredentialsWithAttempts', {
              defaultValue: '{{message}} Attempts left: {{count}}.{{hint}}',
              message: result?.message || t('auth.login.errors.invalidCredentials', { defaultValue: 'Invalid credentials.' }),
              count: remainingAttempts || 1,
              hint: lastAttemptHint,
            })
          );
          return;
        }

        toast.error(result?.message || t('auth.login.errors.invalidCredentials', { defaultValue: 'Invalid credentials.' }));
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

  // Note: Do not invert transforms for RTL. `dir="rtl"` changes text direction, not CSS positioning.
  // Inverting would push both panels off-screen in RTL languages (Arabic).
  const formShiftPct = isDesktop && swapSides ? 100 : 0;
  const welcomeShiftPct = isDesktop && swapSides ? -100 : 0;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-(--nb-color-bg)">
      <div className="w-full max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl border border-(--nb-color-border) bg-(--nb-color-bg-card) shadow-(--nb-shadow-md)">
          {/* Decorative background */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-(--nb-color-brand-a12)" />
            <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-(--nb-color-accent-a12)" />
          </div>

          {/* Small switch */}
          <div className="absolute top-4 right-4 z-20">
            <button
              type="button"
              role="switch"
              aria-checked={swapSides}
              aria-label={t('auth.login.layout.switchLabel', { defaultValue: 'Switch layout' })}
              onClick={() => setSwapSides((v) => !v)}
              className="group inline-flex items-center rounded-full border border-(--nb-color-border) bg-(--nb-color-bg) p-1 shadow-(--nb-shadow-sm) hover:border-(--nb-color-accent) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--nb-color-accent-200)"
            >
              <span className="sr-only">{t('auth.login.layout.switchLabel', { defaultValue: 'Switch layout' })}</span>
              <span className="relative h-4 w-8 rounded-full bg-(--nb-color-border) transition-colors group-hover:bg-(--nb-color-accent-200)">
                <span
                  className="absolute top-0.5 h-3 w-3 rounded-full bg-(--nb-color-bg-card) shadow-(--nb-shadow-sm) transition-transform"
                  style={{
                    transform: swapSides ? 'translateX(14px)' : 'translateX(2px)',
                  }}
                />
              </span>
            </button>
          </div>

          <div className="relative md:min-h-130">
            {/* Form panel */}
            <div
              className="w-full md:absolute md:inset-y-0 md:left-0 md:w-1/2 p-8 md:p-12 transition-transform duration-500 ease-out will-change-transform"
              style={isDesktop ? { transform: `translateX(${formShiftPct}%)` } : undefined}
            >
              <div className="mx-auto w-full max-w-md">
                <div className="mb-8">
                  <div className="flex items-center gap-3">
                    <img
                      src={appLogo}
                      alt={t('auth.login.logoAlt', { defaultValue: 'Nuuru Al-Bayaan' })}
                      className="h-11 w-11 rounded-full object-cover border border-(--nb-color-border) bg-(--nb-color-bg-card)"
                      loading="lazy"
                      draggable={false}
                    />
                    <div className="inline-flex items-center gap-2 rounded-full border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-1 text-xs text-(--nb-color-muted)">
                      <span className="h-2 w-2 rounded-full bg-(--nb-color-accent)" />
                      <span>{t('auth.login.badge', { defaultValue: 'Welcome' })}</span>
                    </div>
                  </div>
                  <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-(--nb-color-text)">
                    {t('auth.login.title', { defaultValue: 'Sign in' })}
                  </h1>
                  <p className="mt-2 text-sm md:text-base text-(--nb-color-muted)">
                    {t('auth.login.subtitle', { defaultValue: 'Enter your username and password to log in.' })}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-(--nb-color-text) mb-1">
                      {t('auth.login.fields.usernameOrStudentId', { defaultValue: 'Username' })}
                    </label>
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
                    <label className="block text-sm font-semibold text-(--nb-color-text) mb-1">
                      {t('auth.login.fields.password', { defaultValue: 'Password' })}
                    </label>
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
                      ? t('auth.login.actions.signingIn', { defaultValue: 'Signing inâ€¦' })
                      : (
                        cooldownRemainingSeconds > 0
                          ? ((cooldownKind === 'LOCKED' || cooldownKind === 'BLOCKED')
                            ? t(
                              cooldownKind === 'LOCKED' ? 'auth.login.actions.locked' : 'auth.login.actions.blocked',
                              { defaultValue: cooldownKind === 'LOCKED' ? 'Locked' : 'Blocked' }
                            )
                            : t('auth.login.actions.tryAgainIn', {
                              defaultValue: 'Try again in {{time}}',
                              time: formatSeconds(cooldownRemainingSeconds),
                            }))
                          : t('auth.login.actions.signIn', { defaultValue: 'Sign in' })
                      )}
                  </Button>
                </form>
              </div>
            </div>

            {/* Welcome panel */}
            <div
              className="w-full md:absolute md:inset-y-0 md:left-1/2 md:w-1/2 p-8 md:p-12 transition-transform duration-500 ease-out will-change-transform"
              style={isDesktop ? { transform: `translateX(${welcomeShiftPct}%)` } : undefined}
            >
              <div className="relative h-full overflow-hidden rounded-3xl bg-linear-to-br from-(--nb-color-brand) via-(--nb-color-brand) to-(--nb-color-accent) text-white">
                <div className="pointer-events-none absolute inset-0 opacity-20">
                  <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/30" />
                  <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/20" />
                </div>

                <div className="relative flex h-full flex-col justify-center px-8 md:px-12 py-12">
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    {t('auth.login.welcome.title', { defaultValue: 'Hello, Friend!' })}
                  </h2>
                  <p className="mt-3 text-sm md:text-base text-white/85 max-w-md">
                    {t('auth.login.welcome.body', { defaultValue: 'Use your account to access all features of the system.' })}
                  </p>

                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={() => setSwapSides((v) => !v)}
                      className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/10 px-6 py-2 text-sm font-semibold text-white hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    >
                      {t('auth.login.welcome.cta', { defaultValue: 'Switch' })}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile spacing: keep panels stacked nicely */}
            <div className="md:hidden h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
