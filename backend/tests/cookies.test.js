import { describe, expect, test } from '@jest/globals';

import { getAuthCookieOptions, getCsrfCookieOptions } from '../config/cookies.js';

describe('cookies config', () => {
  test('auth cookie is httpOnly', () => {
    delete process.env.COOKIE_SAMESITE;
    delete process.env.COOKIE_SECURE;
    delete process.env.COOKIE_DOMAIN;

    const opts = getAuthCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('strict');
    expect(typeof opts.maxAge).toBe('number');
  });

  test('csrf cookie is not httpOnly', () => {
    delete process.env.COOKIE_SAMESITE;
    delete process.env.COOKIE_SECURE;
    delete process.env.COOKIE_DOMAIN;

    const opts = getCsrfCookieOptions();
    expect(opts.httpOnly).toBe(false);
    expect(opts.sameSite).toBe('strict');
    expect(typeof opts.maxAge).toBe('number');
  });
});
