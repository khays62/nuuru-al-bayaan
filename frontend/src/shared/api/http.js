// http.js (canonical)
// Helper: API base config + URL builder + JSON fetch wrapper

// Default to same-origin '/api' so cookie auth works in dev via Vite proxy.
// Override with VITE_API_BASE_URL when building/deploying.
const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
	? import.meta.env.VITE_API_BASE_URL
	: '/api';

function getStoredLanguage() {
	try {
		const v = localStorage.getItem('app:lang');
		const base = String(v || '').trim().toLowerCase();
		if (base === 'ar' || base === 'so' || base === 'en') return base;
	} catch {
		// ignore
	}
	return '';
}

function getCookie(name) {
	if (typeof document === 'undefined') return '';
	const n = `${name}=`;
	const parts = String(document.cookie || '').split(';');
	for (const p of parts) {
		const s = p.trim();
		if (s.startsWith(n)) return decodeURIComponent(s.slice(n.length));
	}
	return '';
}

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
	const headers = (method === 'GET' || method === 'HEAD') ? { ...baseHeaders } : { 'Content-Type': 'application/json', ...baseHeaders };

	// Locale: allow backend to localize messages to the UI language.
	// Do not override if the caller already set it.
	const hasAcceptLanguage = Boolean(headers['Accept-Language'] || headers['accept-language']);
	if (!hasAcceptLanguage) {
		const lang = getStoredLanguage();
		if (lang) headers['Accept-Language'] = lang;
	}

	// CSRF: for unsafe methods, echo csrf_token cookie into header.
	// Backend enforces this only for browser requests (Origin present).
	if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
		const existing = headers['X-CSRF-Token'] || headers['x-csrf-token'];
		if (!existing) {
			const token = getCookie('csrf_token');
			if (token) headers['X-CSRF-Token'] = token;
		}
	}
	const credentials = options.credentials ?? 'include';
	const tryRequest = async () => {
		// Strip internal options so they don't reach the Fetch API.
		const { __csrfRetry, ...fetchOptions } = options || {};
		const res = await fetch(url, { ...fetchOptions, headers, credentials });
		const isJson = (res.headers.get('content-type') || '').includes('application/json');
		const data = isJson ? await res.json().catch(() => ({})) : await res.text();
		return { res, data };
	};

	const ensureCsrfCookie = async () => {
		try {
			// This endpoint sets/returns the csrf cookie/token.
			await fetch(apiUrl('/auth/csrf'), { method: 'GET', credentials: 'include' });
		} catch {
			// ignore
		}
	};

	// Proactively bootstrap CSRF cookie for unsafe methods.
	// This avoids depending on 403 bodies always being JSON/CSRF-detectable.
	if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
		const hasHeader = Boolean(headers['X-CSRF-Token'] || headers['x-csrf-token']);
		const cookieToken = getCookie('csrf_token');
		if (!hasHeader && !cookieToken) {
			await ensureCsrfCookie();
			const token = getCookie('csrf_token');
			if (token) headers['X-CSRF-Token'] = token;
		}
	}

	const { res, data } = await tryRequest();
	if (!res.ok) {
		if (res.status === 401 && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
			try {
				window.dispatchEvent(new CustomEvent('auth:unauthorized'));
			} catch {
				// ignore
			}
		}

		// CSRF resilience: if cookie expired/missing or header wasn't sent, bootstrap CSRF and retry once.
		const isUnsafe = !['GET', 'HEAD', 'OPTIONS'].includes(method);
		const maybeCsrf = res.status === 403 && isUnsafe && (
			String(data?.code || '').toUpperCase().includes('CSRF')
			|| String(data?.message || '').toLowerCase().includes('csrf')
		);

		if (maybeCsrf && options.__csrfRetry !== true) {
			await ensureCsrfCookie();
			// Refresh header from cookie after bootstrap.
			const token = getCookie('csrf_token');
			if (token) headers['X-CSRF-Token'] = token;
			return fetchJson(urlOrPath, { ...options, headers, credentials, __csrfRetry: true });
		}

		const message = (data && data.message) || `Request failed (${res.status})`;
		const err = new Error(message);
		err.status = res.status;
		err.data = data;
		throw err;
	}
	return data;
}

export const http = { apiUrl, fetchJson };
