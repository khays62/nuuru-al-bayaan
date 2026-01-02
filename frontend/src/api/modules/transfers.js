// modules/transfers.js
// Transfers API: candidates listing and perform transfer (proxy to student transfer logic)
import { apiUrl } from '../http';

export async function listTransferCandidates(params = {}) {
  try {
    const query = new URLSearchParams();
    const { sortBy, sortDir, ...rest } = params;
    if (sortBy) query.append('sort', `${sortBy}:${sortDir || 'asc'}`);
    Object.entries(rest).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') query.append(k, v); });
    const qs = query.toString();
    const res = await fetch(`${apiUrl('/transfers/candidates')}${qs ? `?${qs}` : ''}`, { cache: 'no-store', credentials: 'include' });
    if (!res.ok) throw new Error('Failed to list transfer candidates');
    return await res.json(); // { data, meta }
  } catch (e) {
    console.error('Failed to list transfer candidates', e);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function performTransfer(studentId, payload) {
  // Uses dedicated transfers endpoint so we keep Student routes clean
  const res = await fetch(apiUrl(`/transfers/${studentId}`), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function listTransferLogs(params = {}) {
  try {
    const query = new URLSearchParams();
    const { sortBy, sortDir, ...rest } = params;
    if (sortBy) query.append('sort', `${sortBy}:${sortDir || 'desc'}`);
    Object.entries(rest).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') query.append(k, v); });
    const qs = query.toString();
    const res = await fetch(`${apiUrl('/transfers/logs')}${qs ? `?${qs}` : ''}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to list transfer logs');
    return await res.json(); // { data, meta }
  } catch (e) {
    console.error('Failed to list transfer logs', e);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}
