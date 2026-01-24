import crypto from 'crypto';
import { getCsrfCookieOptions } from '../config/cookies.js';

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

export const setCsrfCookie = (res, token) => {
  res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
};

// Double-submit CSRF protection:
// - server sets a readable csrf cookie
// - client must send same value in X-CSRF-Token header
// We enforce it only for browser-like requests (Origin present).
export const csrfProtection = (req, res, next) => {
  const method = String(req.method || '').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

  // Only enforce for browsers (CSRF is a browser problem).
  const origin = req.headers?.origin;
  if (!origin) return next();

  // Allow CSRF bootstrap endpoint itself.
  const path = String(req.path || '');
  if (
    path === '/auth/csrf' ||
    path === '/api/auth/csrf' ||
    path === '/auth/login' ||
    path === '/api/auth/login' ||
    path === '/auth/logout' ||
    path === '/api/auth/logout'
  ) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers?.[CSRF_HEADER_NAME] || req.headers?.[CSRF_HEADER_NAME.toLowerCase()];

  if (!cookieToken || !headerToken || String(cookieToken) !== String(headerToken)) {
    // If the client doesn't have a cookie yet (or it expired), set a new one so a retry can succeed.
    if (!cookieToken) {
      setCsrfCookie(res, generateCsrfToken());
    }
    return res.status(403).json({
      success: false,
      code: 'CSRF_INVALID',
      message: 'CSRF token missing or invalid',
    });
  }

  return next();
};
