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

// Unlock only (clear login lockout). This does NOT change the password.
export const unlockUserLogin = async (userId) => {
  return http.fetchJson(`security/users/${userId}/unlock`, { method: 'POST', body: '{}' });
};

export const markAuthLockRead = async (eventId) => {
  return http.fetchJson(`security/auth-locks/${eventId}/read`, { method: 'PATCH', body: '{}' });
};

export const markAllAuthLocksRead = async () => {
  return http.fetchJson('security/auth-locks/read-all', { method: 'PATCH', body: '{}' });
};

export const clearAuthLockEvent = async (eventId) => {
  return http.fetchJson(`security/auth-locks/${eventId}/clear`, { method: 'POST', body: '{}' });
};

export const clearAllAuthLockEvents = async () => {
  return http.fetchJson('security/auth-locks/clear-all', { method: 'POST', body: '{}' });
};

export const deactivateUserAccount = async (userId) => {
  return http.fetchJson(`security/users/${userId}/deactivate`, { method: 'POST', body: '{}' });
};

export const activateUserAccount = async (userId) => {
  return http.fetchJson(`security/users/${userId}/activate`, { method: 'POST', body: '{}' });
};
