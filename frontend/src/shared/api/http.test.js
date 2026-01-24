import { describe, expect, test } from 'vitest';

import { apiUrl, fetchJson } from './http.js';

describe('shared/api/http bridge', () => {
  test('apiUrl returns a URL ending with path', () => {
    const url = apiUrl('/users');
    expect(url.endsWith('/users')).toBe(true);
    expect(url.includes('//users')).toBe(false);
  });

  test('fetchJson is exported as a function', () => {
    expect(typeof fetchJson).toBe('function');
  });
});
