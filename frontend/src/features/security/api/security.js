import { http } from '../../../shared/api/http';

export const getAuthLockCount = async () => {
  const data = await http.fetchJson('security/auth-locks/unread-count');
  return data;
};

export const listAuthLocks = async (limit = 20) => {
  const qs = new URLSearchParams({ limit: String(limit) }).toString();
  return http.fetchJson(`security/auth-locks?${qs}`);
};

export const resetUserPasswordAndUnlock = async (userId) => {
  return http.fetchJson(`security/users/${userId}/reset-password`, { method: 'POST', body: '{}' });
};

export const lockUser24h = async (userId) => {
  return http.fetchJson(`security/users/${userId}/lock-24h`, { method: 'POST', body: '{}' });
};

export const markAuthLockRead = async (eventId) => {
  return http.fetchJson(`security/auth-locks/${eventId}/read`, { method: 'PATCH', body: '{}' });
};
