// features/students/api/studentsApi.js
// Canonical Students API for feature-first architecture.

import { apiUrl, fetchJson } from '../../../shared/api/http';

function shouldLogStudentsApiErrors() {
  try {
    return Boolean(import.meta?.env?.DEV) || localStorage.getItem('debug:studentsApi') === '1';
  } catch {
    return false;
  }
}

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
    if (e?.name !== 'AbortError' && shouldLogStudentsApiErrors()) {
      console.error('Failed to list students', e);
    }
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function createStudent(payload) {
  const photoFile = payload?.photoFile instanceof File ? payload.photoFile : null;
  const corePayload = photoFile ? (() => {
    const copy = { ...(payload || {}) };
    delete copy.photoFile;
    return copy;
  })() : payload;

  try {
    if (photoFile) {
      const fd = new FormData();
      Object.entries(corePayload || {}).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        if (k === 'transfer' || k === 'medical' || k === 'idDocument') {
          fd.append(k, JSON.stringify(v));
          return;
        }
        if (typeof v === 'boolean') {
          fd.append(k, v ? 'true' : 'false');
          return;
        }
        fd.append(k, String(v));
      });
      fd.append('photo', photoFile);
      const data = await fetchJson('/students', {
        method: 'POST',
        body: fd,
      });
      return { ok: true, status: 201, data };
    }

    const data = await fetchJson('/students', {
      method: 'POST',
      body: JSON.stringify(corePayload),
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
  const photoFile = payload?.photoFile instanceof File ? payload.photoFile : null;
  const corePayload = photoFile ? (() => {
    const copy = { ...(payload || {}) };
    delete copy.photoFile;
    return copy;
  })() : payload;

  try {
    if (photoFile) {
      const fd = new FormData();
      Object.entries(corePayload || {}).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        if (k === 'transfer' || k === 'medical' || k === 'idDocument') {
          fd.append(k, JSON.stringify(v));
          return;
        }
        if (typeof v === 'boolean') {
          fd.append(k, v ? 'true' : 'false');
          return;
        }
        fd.append(k, String(v));
      });
      fd.append('photo', photoFile);
      const data = await fetchJson(`/students/${id}`, {
        method: 'PATCH',
        body: fd,
      });
      return { ok: true, status: 200, data };
    }

    const data = await fetchJson(`/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(corePayload),
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

export async function uploadStudentPhoto(studentId, file) {
  const id = String(studentId || '').trim();
  if (!id) {
    return { ok: false, status: 0, data: { message: 'Missing studentId' } };
  }
  if (!file) {
    return { ok: false, status: 0, data: { message: 'Missing photo file' } };
  }
  try {
    const fd = new FormData();
    fd.append('photo', file);
    const data = await fetchJson(`/students/${id}/photo`, {
      method: 'POST',
      body: fd,
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
    if (shouldLogStudentsApiErrors()) console.error('Profile error', e);
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
    if (shouldLogStudentsApiErrors()) console.error('History error', e);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function getFullTranscript(id, params = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const qs = query.toString();

    const data = await fetchJson(`${apiUrl(`/students/${id}/full-transcript`)}${qs ? `?${qs}` : ''}`);
    return { ok: true, data };
  } catch (e) {
    if (shouldLogStudentsApiErrors()) console.error('Full transcript error', e);
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
    if (shouldLogStudentsApiErrors()) console.error('Transfers error', e);
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

export async function importStudents(payload = {}) {
  try {
    const data = await fetchJson('/students/import', {
      method: 'POST',
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
