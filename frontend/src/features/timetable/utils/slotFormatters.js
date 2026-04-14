const hashString = (value) => {
  const s = String(value || '');
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const normalizeSubjectName = (value) => String(value || '').trim();

const subjectColorFromIndex = (index) => {
  const i = Math.max(0, Number(index) || 0);
  const hue = (i * 137.508) % 360;
  return `hsl(${hue.toFixed(1)} 70% 35%)`;
};

export const buildSubjectColorMap = (subjects = []) => {
  const list = Array.isArray(subjects) ? subjects : [];
  const unique = [];
  const seen = new Set();
  for (const item of list) {
    const name = normalizeSubjectName(item);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    unique.push(name);
  }
  unique.sort((a, b) => a.localeCompare(b));
  const map = new Map();
  unique.forEach((name, idx) => {
    map.set(name, subjectColorFromIndex(idx));
  });
  return map;
};

export const getSubjectTextColor = (subjectName, colorMap) => {
  const name = normalizeSubjectName(subjectName);
  if (!name) return '';
  if (colorMap && typeof colorMap.get === 'function') {
    const mapped = colorMap.get(name);
    if (mapped) return mapped;
  }
  return subjectColorFromIndex(hashString(name));
};

export const toShortTeacherName = (fullName, maxWords = 2) => {
  const raw = String(fullName || '').trim();
  if (!raw) return '';
  const words = raw.split(/\s+/).filter(Boolean);
  return words.slice(0, Math.max(1, Number(maxWords) || 2)).join(' ');
};
