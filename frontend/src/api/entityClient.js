// entityClient.js
// Shaqo guud oo sameysa request GET (waxaan ku bilaabaynaa listing). Mustaqbal: support POST/PUT/DELETE generic.
import { buildQueryParams } from '../utils/buildQueryParams';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000/api';

export async function fetchEntity(endpoint, params = {}) {
  const qs = buildQueryParams(params);
  const url = qs ? `${BASE_URL}/${endpoint}?${qs}` : `${BASE_URL}/${endpoint}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }
  return res.json();
}
