// modules/cohorts.js
// Cohorts CRUD API
import { apiUrl, fetchJson } from '../../../shared/api/http';

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
    const data = await fetchJson('/cohorts', { method: 'POST', body: JSON.stringify(payload) });
    return { ok: true, data };
  } catch (e) {
    console.error('Failed to create cohort:', e);
    return { ok: false, error: e?.data?.message || e?.message || 'Network or server error', code: e?.data?.code };
  }
}

export async function updateCohort(id, payload) {
  try {
    const data = await fetchJson(`/cohorts/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    return { ok: true, data };
  } catch (e) {
    console.error('Failed to update cohort:', e);
    return { ok: false, error: e?.data?.message || e?.message || 'Network or server error', code: e?.data?.code };
  }
}

export async function deleteCohort(id) {
  try {
    const data = await fetchJson(`/cohorts/${id}`, { method: 'DELETE' });
    return { ok: true, data };
  } catch (e) {
    console.error('Failed to delete cohort:', e);
    return { ok: false, error: e?.data?.message || e?.message || 'Network or server error', code: e?.data?.code };
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

// Cohort timeline across academic years & grade sections
export async function getCohortTimeline(id) {
  if (!id) return { data: [] };
  try {
    const res = await fetchJson(apiUrl(`/cohorts/${id}/timeline`));
    return { data: res.timeline || [], cohort: res.cohort };
  } catch (e) {
    console.error('Failed to get cohort timeline:', e);
    return { data: [] };
  }
}
