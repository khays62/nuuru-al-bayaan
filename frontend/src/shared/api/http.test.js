import { describe, expect, test } from 'vitest';

import { apiUrl, fetchJson } from './http.js';

describe('shared/api/http bridge', () => {
  test('apiUrl returns a URL ending with path', () => {
    const url = apiUrl('/users');
    expect(url.endsWith('/users')).toBe(true);
    expect(url.includes('//users')).toBe(false);
  });

  test('apiUrl avoids duplicating /api prefix', () => {
    const url = apiUrl('/api/users');
    expect(url.includes('/api/api/')).toBe(false);
    expect(url.endsWith('/api/users')).toBe(true);
  });

  test('fetchJson is exported as a function', () => {
    expect(typeof fetchJson).toBe('function');
  });
});
