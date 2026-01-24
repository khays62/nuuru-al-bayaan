const normalizeSameSite = (value, fallback = 'strict') => {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'strict') return 'strict';
  if (v === 'lax') return 'lax';
  if (v === 'none') return 'none';
  return fallback;
};

const boolEnv = (value, fallback = false) => {
  if (value === undefined) return fallback;
  const v = String(value).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
};

export const getCookieConfig = () => {
  const isProd = process.env.NODE_ENV === 'production';

  // Defaults keep current dev behavior.
  // For cross-site deployments (frontend+backend on different domains), set:
  // - COOKIE_SAMESITE=none
  // - COOKIE_SECURE=1
  const sameSite = normalizeSameSite(process.env.COOKIE_SAMESITE, 'strict');
  const secure = boolEnv(process.env.COOKIE_SECURE, isProd);

  // Optional: set cookie domain explicitly (e.g., .example.com)
  const domain = process.env.COOKIE_DOMAIN ? String(process.env.COOKIE_DOMAIN).trim() : undefined;

  // Note: if sameSite='none', modern browsers require secure=true.
  if (sameSite === 'none' && !secure) {
    // Do not throw (to avoid bricking dev), but warn loudly.
    console.warn('[cookies] COOKIE_SAMESITE=none requires COOKIE_SECURE=1 for browsers.');
  }

  return { sameSite, secure, domain };
};

export const getAuthCookieOptions = () => {
  const { sameSite, secure, domain } = getCookieConfig();
  return {
    httpOnly: true,
    sameSite,
    secure,
    domain,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

export const getCsrfCookieOptions = () => {
  const { sameSite, secure, domain } = getCookieConfig();
  return {
    httpOnly: false,
    sameSite,
    secure,
    domain,
    // CSRF token is short-lived; it can be rotated often.
    maxAge: 2 * 60 * 60 * 1000,
  };
};
