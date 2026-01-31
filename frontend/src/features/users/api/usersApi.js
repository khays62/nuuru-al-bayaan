// Users API (Feature-first)
// Phase 2: canonical implementation lives here.

import { fetchJson, apiUrl } from '../../../shared/api/http.js';

/**
 * Get list of users with optional query parameters.
 * Note: existing UI expects `listUsers()` to return an array (legacy behavior).
 * The API call may return an object (typically { data, meta }), so we normalize to array here.
 */
export async function listUsers(params = {}, options = {}) {
	const query = new URLSearchParams();
	Object.entries(params).forEach(([k, v]) => {
		if (v !== undefined && v !== null && v !== '') query.append(k, v);
	});
	const qs = query.toString();
	const url = `${apiUrl('/users')}${qs ? `?${qs}&sortBy=createdAt&sortOrder=desc` : '?sortBy=createdAt&sortOrder=desc'}`;

	const data = await fetchJson(url, { signal: options?.signal });
	// Normalize to legacy: return users array.
	if (Array.isArray(data)) return data;
	if (Array.isArray(data?.data)) return data.data;
	return [];
}

/**
 * Create a new user
 */
export async function createUser(userData) {
	return fetchJson('/users', { method: 'POST', body: JSON.stringify(userData) });
}

/**
 * Update user details
 */
export async function updateUser(id, userData) {
	return fetchJson(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) });
}

/**
 * Delete user
 */
export async function deleteUser(id) {
	return fetchJson(`/users/${id}`, { method: 'DELETE' });
}

/**
 * Toggle user active/inactive status
 */
export async function toggleUserStatus(id) {
	return fetchJson(`/users/${id}/toggle`, { method: 'PATCH' });
}

export const getUserById = async (id, options = {}) => {
	const data = await fetchJson(`/users/${id}`, { signal: options?.signal });
	return data?.data || data;
};

export const getUserAuditLogs = async (id, params = {}, options = {}) => {
	const qs = new URLSearchParams(params).toString();
	const path = qs ? `/users/${id}/logs?${qs}` : `/users/${id}/logs`;
	const data = await fetchJson(path, { signal: options?.signal });
	return {
		data: Array.isArray(data?.data) ? data.data : [],
		meta: data?.meta || null,
	};
};

export async function resetUserLoginLockout(userId) {
	return fetchJson(`/auth/users/${userId}/reset-lockout`, { method: 'PATCH' });
}

export async function exportUserAuditCSV(userId) {
	return fetch(apiUrl(`/audit/logs/${userId}/export`), {
		credentials: 'include',
	});
}
