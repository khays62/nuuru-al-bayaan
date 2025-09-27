// buildQueryParams.js
// U beddel object params -> string query (oo iska saaraya values madhan/null/undefined)
export function buildQueryParams(params = {}) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== '' && v !== undefined && v !== null)
    .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
    .join('&');
  return q;
}
