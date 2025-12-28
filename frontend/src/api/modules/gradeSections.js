// modules/gradeSections.js
// Grade Sections API (moved from apiService.js)
import { apiUrl } from '../http';

export async function listGradeSections(params = {}) {
  try {
    const query = new URLSearchParams();
    const { sortBy, sortDir, ...rest } = params;
    if (sortBy) query.append('sort', `${sortBy}:${sortDir || 'asc'}`);
    Object.entries(rest).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') query.append(k, v); });
    const qs = query.toString();
    const response = await fetch(`${apiUrl('/grades/sections')}${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json(); // { data, meta }
  } catch (error) {
    console.error('Failed to fetch grade sections:', error);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function createGradeSection(payload) {
  try {
    const res = await fetch(apiUrl('/grades/sections'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.message || 'Failed to create', code: data.code };
    return { ok: true, data };
  } catch (e) {
    console.error('Failed to create grade section', e);
    return { ok: false, error: 'Network or server error' };
  }
}

export async function updateGradeSection(id, payload) {
  try {
    const res = await fetch(apiUrl(`/grades/sections/${id}`), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.message || 'Failed to update', code: data.code, blocked: data.blocked };
    return { ok: true, data };
  } catch (e) {
    console.error('Failed to update grade section', e);
    return { ok: false, error: 'Network or server error' };
  }
}

export async function deleteGradeSection(id) {
  try {
    const res = await fetch(apiUrl(`/grades/sections/${id}`), { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.message || 'Failed to delete', code: data.code };
    return { ok: true, data };
  } catch (e) {
    console.error('Failed to delete grade section', e);
    return { ok: false, error: 'Network or server error' };
  }
}

export async function getGradeSectionById(id) {
  try {
    const res = await fetch(apiUrl(`/grades/sections/${id}`));
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch grade section');
    return { ok: true, data };
  } catch (e) {
    console.error('Failed to fetch grade section', e);
    return { ok: false, error: 'Network or server error' };
  }
}

export async function resyncGradeSectionCohort(id) {
  try {
    const res = await fetch(apiUrl(`/grades/sections/${id}/resync-cohort`), { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.message || 'Failed to resync', code: data.code };
    return { ok: true, ...data, data };
  } catch (e) {
    console.error('Failed to resync cohort', e);
    return { ok: false, error: 'Network or server error' };
  }
}
