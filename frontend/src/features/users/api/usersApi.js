// Users API (Feature-first)
// Phase 2: canonical implementation lives here.

import { fetchJson, apiUrl } from '../../../shared/api/http.js';

/**
 * Get list of users with optional query parameters.
 * Note: existing UI expects `listUsers()` to return an array (legacy behavior).
 * The API call returns an object (typically { data, meta }), so we normalize to array here.
 */
export async function listUsers(params = {}) {
	try {
		const query = new URLSearchParams();
		Object.entries(params).forEach(([k, v]) => {
			if (v !== undefined && v !== null && v !== '') query.append(k, v);
		});
		const qs = query.toString();
		const url = `${apiUrl('/users')}${qs ? `?${qs}&sortBy=createdAt&sortOrder=desc` : '?sortBy=createdAt&sortOrder=desc'}`;

		const data = await fetchJson(url);
		// Normalize to legacy: return users array.
		if (Array.isArray(data)) return data;
		if (Array.isArray(data?.data)) return data.data;
		return [];
	} catch (error) {
		console.error('Failed to fetch users:', error);
		return [];
	}
}

/**
 * Create a new user
 */
export async function createUser(userData) {
	try {
		const data = await fetchJson('/users', { method: 'POST', body: JSON.stringify(userData) });
		window.dispatchEvent(new CustomEvent('users:changed'));
		return { data };
	} catch (error) {
		console.error('Failed to add user:', error);
		return { error: error?.data?.message || error?.message || 'Network or server error', field: error?.data?.field };
	}
}

/**
 * Update user details
 */
export async function updateUser(id, userData) {
	try {
		const data = await fetchJson(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) });
		window.dispatchEvent(new CustomEvent('users:changed'));
		return { data };
	} catch (error) {
		console.error('Failed to update user:', error);
		return { error: error?.data?.message || error?.message || 'Network or server error', field: error?.data?.field };
	}
}

/**
 * Delete user
 */
export async function deleteUser(id) {
	try {
		const data = await fetchJson(`/users/${id}`, { method: 'DELETE' });
		window.dispatchEvent(new CustomEvent('users:changed'));
		return { data };
	} catch (error) {
		console.error('Failed to delete user:', error);
		return { error: error?.data?.message || error?.message || 'Network or server error', details: error?.data };
	}
}

/**
 * Toggle user active/inactive status
 */
export async function toggleUserStatus(id) {
	try {
		const data = await fetchJson(`/users/${id}/toggle`, { method: 'PATCH' });
		window.dispatchEvent(new CustomEvent('users:changed'));
		return { data };
	} catch (error) {
		console.error('Failed to toggle user status:', error);
		return { error: error?.data?.message || error?.message || 'Network or server error' };
	}
}

export const getUserById = async (id) => {
	try {
		const res = await fetch(apiUrl(`/users/${id}`), {
			credentials: 'include',
		});

		if (!res.ok) {
			return { ok: false, error: `User not found (status ${res.status})` };
		}

		const data = await res.json();
		if (!data || !data.data) {
			return { ok: false, error: 'User not found' };
		}

		return { ok: true, data: data.data };
	} catch (err) {
		return { ok: false, error: err.message };
	}
};

export const getUserAuditLogs = async (id) => {
	try {
		const res = await fetch(apiUrl(`/users/${id}/logs`), {
			credentials: 'include',
		});

		if (!res.ok) {
			return { ok: false, error: `Failed to fetch logs (status ${res.status})` };
		}

		const data = await res.json();
		return { ok: true, data: data.data || [] };
	} catch (err) {
		return { ok: false, error: err.message };
	}
};

export async function exportUserAuditCSV(userId) {
	return fetch(apiUrl(`/audit/logs/${userId}/export`), {
		credentials: 'include',
	});
}
