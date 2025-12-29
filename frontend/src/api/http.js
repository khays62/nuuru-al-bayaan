// http.js
// Helper: API base config + URL builder + JSON fetch wrapper

// Default to same-origin '/api' so cookie auth works in dev via Vite proxy.
// Override with VITE_API_BASE_URL when building/deploying.
const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL
  : '/api';

export function apiUrl(path = '/') {
  const base = String(API_BASE_URL || '').replace(/\/$/, '');
  const p = String(path || '/');
  return p.startsWith('/') ? `${base}${p}` : `${base}/${p}`;
}

export async function fetchJson(urlOrPath, options = {}) {
  const url = /^https?:\/\//.test(urlOrPath) ? urlOrPath : apiUrl(urlOrPath);
  const method = String(options.method || 'GET').toUpperCase();
  // Avoid setting Content-Type for GET/HEAD to prevent unnecessary CORS preflights
  const baseHeaders = (options.headers || {});
  const headers = (method === 'GET' || method === 'HEAD') ? baseHeaders : { 'Content-Type': 'application/json', ...baseHeaders };
  const credentials = options.credentials ?? 'include';
  const res = await fetch(url, { ...options, headers, credentials });
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await res.json().catch(() => ({})) : await res.text();
  if (!res.ok) {
    const message = (data && data.message) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const http = { apiUrl, fetchJson };
