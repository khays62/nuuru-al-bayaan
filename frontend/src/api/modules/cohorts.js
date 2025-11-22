// modules/cohorts.js
// Cohorts CRUD API
import { apiUrl, fetchJson } from '../http';

export async function listCohorts(params = {}) {
  const query = new URLSearchParams();
  const { sortBy, sortDir, ...rest } = params;
  if (sortBy) query.append('sort', `${sortBy}:${sortDir || 'asc'}`);
  Object.entries(rest).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') query.append(k, v); });
  const qs = query.toString();
  try {
    const data = await fetchJson(`${apiUrl('/cohorts')}${qs ? `?${qs}` : ''}`);
    // Expect { items or data, page/meta }
    if (Array.isArray(data)) {
      return { data, meta: { page: 1, limit: data.length, total: data.length, totalPages: 1 } };
    }
    const items = data.items || data.data || [];
    const meta = data.meta || { page: data.page || 1, limit: data.limit || items.length, total: data.total || items.length, totalPages: data.totalPages || 1 };
    return { data: items, meta };
  } catch (e) {
    console.error('Failed to list cohorts:', e);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function createCohort(payload) {
  try {
    const res = await fetch(apiUrl('/cohorts'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.message || 'Failed to create', code: data.code };
    return { ok: true, data };
  } catch (e) {
    console.error('Failed to create cohort:', e);
    return { ok: false, error: 'Network or server error' };
  }
}

export async function updateCohort(id, payload) {
  try {
    const res = await fetch(apiUrl(`/cohorts/${id}`), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.message || 'Failed to update', code: data.code };
    return { ok: true, data };
  } catch (e) {
    console.error('Failed to update cohort:', e);
    return { ok: false, error: 'Network or server error' };
  }
}

export async function deleteCohort(id) {
  try {
    const res = await fetch(apiUrl(`/cohorts/${id}`), { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.message || 'Failed to delete', code: data.code };
    return { ok: true, data };
  } catch (e) {
    console.error('Failed to delete cohort:', e);
    return { ok: false, error: 'Network or server error' };
  }
}

export async function archiveCohort(id) {
  return updateCohort(id, { status: 'archived' });
}

export async function activateCohort(id) {
  return updateCohort(id, { status: 'active' });
}

// Fetch cohorts available for promotion given academicYear + gradeSectionId (or grade+shift+section)
export async function getAvailableCohortsForPromotion(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) query.append(k, v); });
  const qs = query.toString();
  try {
    const res = await fetchJson(`${apiUrl('/cohorts/available')}${qs ? `?${qs}` : ''}`);
    // Expect { data:[], meta } or plain array
    if (Array.isArray(res)) return { data: res };
    return { data: res.data || [], meta: res.meta };
  } catch (e) {
    console.error('Failed to get available cohorts:', e);
    return { data: [] };
  }
}
