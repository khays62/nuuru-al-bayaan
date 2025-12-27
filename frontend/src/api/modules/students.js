// modules/students.js
// Students API (moved from apiService.js)
import { apiUrl } from '../http';
import toast from 'react-hot-toast'; // ✅ add this at the top






export async function downloadStudentsCsv() {
  const res = await fetch(apiUrl('/students/export'), {
    method: "GET",
    credentials: "include",
  });

  // if (!res.ok) {
  //   console.error("CSV download failed", await res.text());
  //   return;
  // }

  if (!res.ok) {
    const errorData = await res.json(); // <-- get JSON from response
    toast.error(errorData?.message || "CSV download failed"); // <-- show toast with server message
    return;
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "students_export.csv";
  a.click();
  window.URL.revokeObjectURL(url);
}



export async function listStudents(params = {}) {
  try {
    const query = new URLSearchParams();
    const { sortBy, sortDir, ...rest } = params;
    if (sortBy) query.append('sort', `${sortBy}:${sortDir || 'asc'}`);
    Object.entries(rest).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') query.append(k, v); });
    const qs = query.toString();
    const res = await fetch(`${apiUrl('/students')}${qs ? `?${qs}` : ''}`, {credentials: 'include'});
    if (!res.ok) throw new Error('Failed list');
    return await res.json(); // { data, meta }
  } catch (e) {
    console.error('Failed to list students', e);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function createStudent(payload) {
  const res = await fetch(apiUrl('/students'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include'
});
  const data = await res.json().catch(() => ({}));
  return { ok: res.status === 201, status: res.status, data };
}

export async function updateStudent(id, payload) {
  const res = await fetch(apiUrl(`/students/${id}`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),   credentials: 'include'
});
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function deactivateStudentApi(id) {
  const res = await fetch(apiUrl(`/students/${id}/deactivate`),  { method: 'PATCH', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function reactivateStudentApi(id) {
  const res = await fetch(apiUrl(`/students/${id}/reactivate`), { method: 'PATCH', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function transferEnrollmentApi(id, payload) {
  const res = await fetch(apiUrl(`/students/${id}/enrollment/transfer`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function getStudentProfile(id) {
  try {
    const res = await fetch(apiUrl(`/students/${id}`), {credentials: 'include'});
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
    const res = await fetch(`${apiUrl(`/students/${id}/history`)}${qs ? `?${qs}` : ''}`, {credentials: 'include'});
    if (!res.ok) throw new Error('History fail');
    return await res.json();
  } catch (e) {
    console.error('History error', e);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function getFullTranscript(id) {
  try {
    const res = await fetch(apiUrl(`/students/${id}/full-transcript`), {credentials: 'include'});
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
    const res = await fetch(`${apiUrl(`/students/${id}/transfers`)}${qs ? `?${qs}` : ''}`, {credentials: 'include'});
    if (!res.ok) throw new Error('Transfers fail');
    return await res.json();
  } catch (e) {
    console.error('Transfers error', e);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}
