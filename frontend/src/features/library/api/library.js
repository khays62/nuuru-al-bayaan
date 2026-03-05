import { fetchJson } from '../../../shared/api/http';

export async function listLibraryResources(params = {}, opts = {}) {
  const q = String(params?.q || '').trim();
  const limit = params?.limit != null ? String(params.limit) : '';
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (limit) qs.set('limit', limit);
  const path = qs.toString() ? `/library?${qs.toString()}` : '/library';
  return await fetchJson(path, { method: 'GET', signal: opts?.signal });
}

export async function createLibraryResource(formData, opts = {}) {
  return await fetchJson('/library', {
    method: 'POST',
    body: formData,
    signal: opts?.signal,
  });
}

export async function deleteLibraryResource(resourceId, opts = {}) {
  const id = String(resourceId || '').trim();
  if (!id) throw new Error('Missing resource id');
  return await fetchJson(`/library/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    signal: opts?.signal,
  });
}
