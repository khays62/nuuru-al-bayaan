// modules/users.js
// User API — rewritten to match modules/subjects.js style

import { fetchJson, apiUrl } from '../http';

/**
 * Get list of users with optional query parameters.
 * Example: getUsers({ role: 'admin', page: 2 })
 */
export async function listUsers(params = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const qs = query.toString();
    // const url = `${apiUrl('/users')}${qs ? `?${qs}` : ''}`;
    const url = `${apiUrl('/users')}${qs ? `?${qs}&sortBy=createdAt&sortOrder=desc` : '?sortBy=createdAt&sortOrder=desc'}`;

    const data = await fetchJson(url);
    return data; // expected { data, meta }
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

/**
 * Create a new user
 */
export async function createUser(userData) {
  try {
    const res = await fetch(apiUrl('/users'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.message || 'Failed to create user', field: data.field };
    }
    window.dispatchEvent(new CustomEvent('users:changed'));
    return { data };
  } catch (error) {
    console.error('Failed to add user:', error);
    return { error: 'Network or server error' };
  }
}

/**
 * Update user details
 */
export async function updateUser(id, userData) {
  try {
    const res = await fetch(apiUrl(`/users/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.message || 'Failed to update user', field: data.field };
    }
    window.dispatchEvent(new CustomEvent('users:changed'));
    return { data };
  } catch (error) {
    console.error('Failed to update user:', error);
    return { error: 'Network or server error' };
  }
}

/**
 * Delete user
 */
export async function deleteUser(id) {
  try {
    const res = await fetch(apiUrl(`/users/${id}`), { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: data.message || 'Failed to delete user', details: data };
    }
    window.dispatchEvent(new CustomEvent('users:changed'));
    return { data };
  } catch (error) {
    console.error('Failed to delete user:', error);
    return { error: 'Network or server error' };
  }
}

/**
 * Toggle user active/inactive status
 */
export async function toggleUserStatus(id) {
  try {
    const res = await fetch(apiUrl(`/users/${id}/toggle`), { method: 'PATCH' });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.message || 'Failed to toggle user status' };
    }
    window.dispatchEvent(new CustomEvent('users:changed'));
    return { data };
  } catch (error) {
    console.error('Failed to toggle user status:', error);
    return { error: 'Network or server error' };
  }
}


export const getUserById = async (id) => {
  try {
    const res = await fetch(apiUrl(`/users/${id}`), {
      credentials: "include", // similar to withCredentials
    });

    if (!res.ok) {
      return { ok: false, error: `User not found (status ${res.status})` };
    }

    const data = await res.json(); // parse JSON

    // your backend returns { data: user }
    if (!data || !data.data) {
      return { ok: false, error: "User not found" };
    }

    return { ok: true, data: data.data }; // ✅ now frontend can access userRes.data

  } catch (err) {
    return { ok: false, error: err.message };
  }
};

export const getUserAuditLogs = async (id) => {
  try {
    const res = await fetch(apiUrl(`/users/${id}/logs`), {
      credentials: "include",
    });

    if (!res.ok) {
      return { ok: false, error: `Failed to fetch logs (status ${res.status})` };
    }

    const data = await res.json(); // parse JSON

    return { ok: true, data: data.data || [] }; // default to empty array if no logs
  } catch (err) {
    return { ok: false, error: err.message };
  }
};



export async function exportUserAuditCSV(userId) {
  return fetch(apiUrl(`/audit/logs/${userId}/export`), {
    credentials: "include"
  });
}

