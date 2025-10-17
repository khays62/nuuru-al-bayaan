// http.js
// Helper: API base config + URL builder + JSON fetch wrapper

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL
  : 'http://localhost:7000/api';

export function apiUrl(path = '/') {
  const base = String(API_BASE_URL || '').replace(/\/$/, '');
  const p = String(path || '/');
  return p.startsWith('/') ? `${base}${p}` : `${base}/${p}`;
}

export async function fetchJson(urlOrPath, options = {}) {
  const url = /^https?:\/\//.test(urlOrPath) ? urlOrPath : apiUrl(urlOrPath);
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
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
