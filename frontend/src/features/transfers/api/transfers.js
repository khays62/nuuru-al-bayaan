// modules/transfers.js
// Transfers API: candidates listing and perform transfer (proxy to student transfer logic)
import { apiUrl, fetchJson } from '../../../shared/api/http';

export async function listTransferCandidates(params = {}) {
  try {
    const query = new URLSearchParams();
    const { sortBy, sortDir, ...rest } = params;
    if (sortBy) query.append('sort', `${sortBy}:${sortDir || 'asc'}`);
    Object.entries(rest).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') query.append(k, v); });
    const qs = query.toString();
    const data = await fetchJson(`${apiUrl('/transfers/candidates')}${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
    return data; // { data, meta }
  } catch (e) {
    console.error('Failed to list transfer candidates', e);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

export async function performTransfer(studentId, payload) {
  // Uses dedicated transfers endpoint so we keep Student routes clean
  try {
    const data = await fetchJson(`/transfers/${studentId}`, { method: 'PATCH', body: JSON.stringify(payload) });
    return { ok: true, status: 200, data };
  } catch (e) {
    return { ok: false, status: e?.status || 0, data: e?.data || { message: e?.message || 'Network or server error' } };
  }
}

export async function listTransferLogs(params = {}) {
  try {
    const query = new URLSearchParams();
    const { sortBy, sortDir, ...rest } = params;
    if (sortBy) query.append('sort', `${sortBy}:${sortDir || 'desc'}`);
    Object.entries(rest).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') query.append(k, v); });
    const qs = query.toString();
    const data = await fetchJson(`${apiUrl('/transfers/logs')}${qs ? `?${qs}` : ''}`);
    return data; // { data, meta }
  } catch (e) {
    console.error('Failed to list transfer logs', e);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}
