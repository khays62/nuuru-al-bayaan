// Simple in-memory cache for cohorts lists to avoid duplicate network calls (React StrictMode, remounts)
// Keyed by params signature (currently only `status` is used)
const cache = {};
const pending = {};

export function getCachedCohorts(key = 'active') {
  return cache[key];
}

export function setCachedCohorts(key, list) {
  cache[key] = Array.isArray(list) ? list : [];
}

export function getPendingCohorts(key = 'active') {
  return pending[key];
}

export function setPendingCohorts(key, promise) {
  pending[key] = promise;
}

export function clearPendingCohorts(key) {
  delete pending[key];
}

export function invalidateCohortsCache(key) {
  if (key) delete cache[key];
  else {
    for (const k of Object.keys(cache)) delete cache[k];
  }
}
