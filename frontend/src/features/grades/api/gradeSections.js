// modules/gradeSections.js
// Grade Sections API (moved from apiService.js)
import { apiUrl, fetchJson } from '../../../shared/api/http';

export async function listGradeSections(params = {}, options = {}) {
  try {
    const query = new URLSearchParams();
    const { sortBy, sortDir, ...rest } = params;
    if (sortBy) query.append('sort', `${sortBy}:${sortDir || 'asc'}`);
    Object.entries(rest).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') query.append(k, v); });
    const qs = query.toString();
    const data = await fetchJson(
      `${apiUrl('/grades/sections')}${qs ? `?${qs}` : ''}`,
      { cache: 'no-store', signal: options?.signal }
    );
    return data; // { data, meta }
  } catch (error) {
    console.error('Failed to fetch grade sections:', error);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function createGradeSection(payload) {
  try {
    const data = await fetchJson('/grades/sections', { method: 'POST', body: JSON.stringify(payload) });
    return { ok: true, data };
  } catch (e) {
    console.error('Failed to create grade section', e);
    return { ok: false, error: e?.data?.message || e?.message || 'Network or server error', code: e?.data?.code };
  }
}

export async function updateGradeSection(id, payload) {
  try {
    const data = await fetchJson(`/grades/sections/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    return { ok: true, data };
  } catch (e) {
    console.error('Failed to update grade section', e);
    return { ok: false, error: e?.data?.message || e?.message || 'Network or server error', code: e?.data?.code, blocked: e?.data?.blocked };
  }
}

export async function deleteGradeSection(id) {
  try {
    const data = await fetchJson(`/grades/sections/${id}`, { method: 'DELETE' });
    return { ok: true, data };
  } catch (e) {
    console.error('Failed to delete grade section', e);
    return { ok: false, error: e?.data?.message || e?.message || 'Network or server error', code: e?.data?.code };
  }
}

export async function getGradeSectionById(id) {
  try {
    const data = await fetchJson(`/grades/sections/${id}`);
    return { ok: true, data };
  } catch (e) {
    console.error('Failed to fetch grade section', e);
    return { ok: false, error: 'Network or server error' };
  }
}

export async function resyncGradeSectionCohort(id) {
  try {
    const data = await fetchJson(`/grades/sections/${id}/resync-cohort`, { method: 'POST' });
    return { ok: true, ...data, data };
  } catch (e) {
    console.error('Failed to resync cohort', e);
    return { ok: false, error: e?.data?.message || e?.message || 'Network or server error', code: e?.data?.code };
  }
}
