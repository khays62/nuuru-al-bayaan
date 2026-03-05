import { fixMojibake } from './fixMojibake';

export function displayText(value, fallback = '-') {
  if (value === null || value === undefined) return fallback;

  if (Array.isArray(value)) {
    const joined = value.filter((x) => x != null && String(x).trim() !== '').join(', ');
    const cleaned = fixMojibake(String(joined || '')).trim();
    return cleaned || fallback;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : fallback;
  }

  const cleaned = fixMojibake(String(value)).trim();
  return cleaned || fallback;
}
