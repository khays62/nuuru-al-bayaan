import { fetchJson } from '../../../shared/api/http.js';

export async function getPrivacyPolicy() {
  return fetchJson('/security/privacy-policy');
}

export async function updatePrivacyPolicy(payload) {
  return fetchJson('/security/privacy-policy', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getClientPrivacyPolicy() {
  return fetchJson('/auth/privacy-policy');
}