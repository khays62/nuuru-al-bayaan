// modules/subjects.js
// Subjects API (moved from apiService.js)
import { fetchJson, apiUrl } from '../../../shared/api/http';

export async function getSubjects(params = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const qs = query.toString();
    const url = `${apiUrl('/subjects')}${qs ? `?${qs}` : ''}`;
    const data = await fetchJson(url);
    return data; // { data, meta }
  } catch (error) {
    console.error('Failed to fetch subjects:', error);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function addSubject(subjectData) {
  try {
    const data = await fetchJson('/subjects', { method: 'POST', body: JSON.stringify(subjectData) });
    try {
      const gradeIds = (data.grades || []).map(g => (g._id || g));
      window.dispatchEvent(new CustomEvent('subjects:changed', { detail: { gradeIds } }));
    } catch {
      /* no-op */
    }
    return { data };
  } catch (error) {
    console.error('Failed to add subject:', error);
    return { error: error?.data?.message || error?.message || 'Network or server error', field: error?.data?.field };
  }
}

export async function updateSubject(id, subjectData) {
  try {
    const data = await fetchJson(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(subjectData) });
    try {
      const gradeIds = (data.grades || []).map(g => (g._id || g));
      window.dispatchEvent(new CustomEvent('subjects:changed', { detail: { gradeIds } }));
    } catch {
      /* ignore */
    }
    return { data };
  } catch (error) {
    console.error('Failed to update subject:', error);
    return { error: error?.data?.message || error?.message || 'Network or server error', field: error?.data?.field };
  }
}

export async function deleteSubject(id) {
  try {
    const data = await fetchJson(`/subjects/${id}`, { method: 'DELETE' });
    return { data };
  } catch (error) {
    console.error('Failed to delete subject:', error);
    return { error: error?.data?.message || error?.message || 'Network or server error', details: error?.data };
  }
}
