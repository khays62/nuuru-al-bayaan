// modules/students.js
// Students API (moved from apiService.js)
import { apiUrl } from '../http';

export async function listStudents(params = {}) {
  try {
    const query = new URLSearchParams();
    const { sortBy, sortDir, ...rest } = params;
    if (sortBy) query.append('sort', `${sortBy}:${sortDir || 'asc'}`);
    Object.entries(rest).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') query.append(k, v); });
    const qs = query.toString();
    const res = await fetch(`${apiUrl('/students')}${qs ? `?${qs}` : ''}`);
    if (!res.ok) throw new Error('Failed list');
    return await res.json(); // { data, meta }
  } catch (e) {
    console.error('Failed to list students', e);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function createStudent(payload) {
  const res = await fetch(apiUrl('/students'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.status === 201, status: res.status, data };
}

export async function updateStudent(id, payload) {
  const res = await fetch(apiUrl(`/students/${id}`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function deactivateStudentApi(id) {
  const res = await fetch(apiUrl(`/students/${id}/deactivate`), { method: 'PATCH' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function reactivateStudentApi(id) {
  const res = await fetch(apiUrl(`/students/${id}/reactivate`), { method: 'PATCH' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// Transfer endpoint removed from student API; use modules/transfers.performTransfer instead

export async function getStudentProfile(id) {
  try {
    const res = await fetch(apiUrl(`/students/${id}`));
    if (!res.ok) throw new Error('Profile fail');
    return await res.json();
  } catch (e) {
    console.error('Profile error', e);
    return null;
  }
}

export async function getStudentHistory(id, params = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') query.append(k, v); });
    const qs = query.toString();
    const res = await fetch(`${apiUrl(`/students/${id}/history`)}${qs ? `?${qs}` : ''}`);
    if (!res.ok) throw new Error('History fail');
    return await res.json();
  } catch (e) {
    console.error('History error', e);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function getFullTranscript(id) {
  try {
    const res = await fetch(apiUrl(`/students/${id}/full-transcript`));
    if (!res.ok) throw new Error('Full transcript fail');
    return { ok: true, data: await res.json() };
  } catch (e) {
    console.error('Full transcript error', e);
    return { ok: false, error: 'Network or server error' };
  }
}

export async function getStudentTransfers(id, params = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') query.append(k, v); });
    const qs = query.toString();
    const res = await fetch(`${apiUrl(`/students/${id}/transfers`)}${qs ? `?${qs}` : ''}`);
    if (!res.ok) throw new Error('Transfers fail');
    return await res.json();
  } catch (e) {
    console.error('Transfers error', e);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}
