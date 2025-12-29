// Promotions API module
import { fetchJson } from '../http';

export async function previewPromotion(params) {
  // params: URLSearchParams object
  // return fetchJson(`/promotions/preview?${params.toString()}`,);
  return fetchJson(`/promotions/preview?${params.toString()}`, {
    credentials: 'include', // ✅ FIXED
    // Credentials: 'include',
  });
}

export async function executePromotion({ timing, studentIds }) {
  // autoCreate is managed server-side (defaults to true). We omit the flag from UI to avoid accidental misuse.
  return fetchJson('/promotions/execute', {
    method: 'POST',
    credentials: 'include', // ✅ FIXED
    // Credentials: 'include',
    body: JSON.stringify({ timing, studentIds })
  });
}
