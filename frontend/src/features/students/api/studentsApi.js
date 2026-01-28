// features/students/api/studentsApi.js
// Canonical Students API for feature-first architecture.

import { apiUrl, fetchJson } from '../../../shared/api/http';

export async function listStudents(params = {}, opts = {}) {
  try {
    const query = new URLSearchParams();
    const { sortBy, sortDir, ...rest } = params;
    if (sortBy) query.append('sort', `${sortBy}:${sortDir || 'asc'}`);
    Object.entries(rest).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const qs = query.toString();
    const data = await fetchJson(`${apiUrl('/students')}${qs ? `?${qs}` : ''}`, {
      signal: opts?.signal,
    });
    return data; // { data, meta }
  } catch (e) {
    if (e?.name !== 'AbortError') console.error('Failed to list students', e);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function createStudent(payload) {
  try {
    const data = await fetchJson('/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { ok: true, status: 201, data };
  } catch (e) {
    return {
      ok: false,
      status: e?.status || 0,
      data: e?.data || { message: e?.message || 'Network or server error' },
    };
  }
}

export async function updateStudent(id, payload) {
  try {
    const data = await fetchJson(`/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return { ok: true, status: 200, data };
  } catch (e) {
    return {
      ok: false,
      status: e?.status || 0,
      data: e?.data || { message: e?.message || 'Network or server error' },
    };
  }
}

export async function deactivateStudentApi(id) {
  try {
    const data = await fetchJson(`/students/${id}/deactivate`, { method: 'PATCH' });
    return { ok: true, status: 200, data };
  } catch (e) {
    return {
      ok: false,
      status: e?.status || 0,
      data: e?.data || { message: e?.message || 'Network or server error' },
    };
  }
}

export async function reactivateStudentApi(id) {
  try {
    const data = await fetchJson(`/students/${id}/reactivate`, { method: 'PATCH' });
    return { ok: true, status: 200, data };
  } catch (e) {
    return {
      ok: false,
      status: e?.status || 0,
      data: e?.data || { message: e?.message || 'Network or server error' },
    };
  }
}

// Transfer endpoint removed from student API; use modules/transfers.performTransfer instead

export async function getStudentProfile(id) {
  try {
    return await fetchJson(`/students/${id}`);
  } catch (e) {
    console.error('Profile error', e);
    return null;
  }
}

export async function getStudentHistory(id, params = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const qs = query.toString();
    return await fetchJson(`${apiUrl(`/students/${id}/history`)}${qs ? `?${qs}` : ''}`);
  } catch (e) {
    console.error('History error', e);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function getFullTranscript(id) {
  try {
    const data = await fetchJson(`/students/${id}/full-transcript`);
    return { ok: true, data };
  } catch (e) {
    console.error('Full transcript error', e);
    return { ok: false, error: 'Network or server error' };
  }
}

export async function getStudentTransfers(id, params = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const qs = query.toString();
    return await fetchJson(`${apiUrl(`/students/${id}/transfers`)}${qs ? `?${qs}` : ''}`);
  } catch (e) {
    console.error('Transfers error', e);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function resetStudentPassword(id) {
  try {
    const data = await fetchJson(`/students/${id}/reset-password`, { method: 'PATCH' });
    return { ok: true, status: 200, data };
  } catch (e) {
    return {
      ok: false,
      status: e?.status || 0,
      data: e?.data || { message: e?.message || 'Network or server error' },
    };
  }
}

export async function getStudentOverallSummary(studentId, opts = {}) {
  try {
    const data = await fetchJson(`/transcripts/students/${studentId}/overall-summary`, {
      signal: opts?.signal,
    });
    return {
      overallTotal: Number(data?.overallTotal || 0),
      weightedAverage: Number(data?.weightedAverage || 0),
      cumulativeRank: data?.cumulativeRank ?? null,
      cumulativeRankOutOf: Number(data?.cumulativeRankOutOf || 0),
      rankFromWeightedInLatest: data?.rankFromWeightedInLatest ?? null,
      rankLatestOutOf: Number(data?.rankLatestOutOf || 0),
    };
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    // Let callers decide how to surface errors; keep API layer quiet.
    throw e;
  }
}
