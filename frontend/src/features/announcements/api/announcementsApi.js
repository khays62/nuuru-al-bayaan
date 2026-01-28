import { fetchJson } from '../../../shared/api/http';

export async function getAnnouncements(opts = {}) {
  return await fetchJson('/announcements', { signal: opts?.signal });
}

export async function createAnnouncement(payload, opts = {}) {
  return await fetchJson('/announcements', {
    method: 'POST',
    body: JSON.stringify(payload),
    signal: opts?.signal,
  });
}

export async function updateAnnouncement(id, payload, opts = {}) {
  return await fetchJson(`/announcements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    signal: opts?.signal,
  });
}

export async function deleteAnnouncement(id, opts = {}) {
  return await fetchJson(`/announcements/${id}`, {
    method: 'DELETE',
    signal: opts?.signal,
  });
}

// Unread notifications (server-side per user)
export async function getAnnouncementsUnreadCount(opts = {}) {
  return await fetchJson('/announcements/unread-count', { signal: opts?.signal });
}

export async function markAnnouncementsRead(opts = {}) {
  return await fetchJson('/announcements/mark-read', {
    method: 'POST',
    signal: opts?.signal,
  });
}
