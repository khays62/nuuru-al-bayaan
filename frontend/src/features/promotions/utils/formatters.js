export const label = (v) => (v === undefined || v === null || v === '' || v === '-') ? null : String(v);

// Show AY as a short single year (the right-hand part of '2024-2025' → '2025')
export const yearShort = (s) => {
  if (!s || typeof s !== 'string') return null;
  const sep = s.includes('/') ? '/' : '-';
  const parts = s.split(sep).map((p) => p.trim());
  if (parts.length === 2) return parts[1];
  return s;
};

export const dotJoin = (parts) => (Array.isArray(parts) ? parts : []).filter(Boolean).join(' • ');

export const formatFrom = (from = {}) => {
  const grade = from.grade?.gradeName;
  const ay = yearShort(from.academicYear?.yearName);
  const section = from.section;
  const shift = from.shift?.shiftName;
  const cohort = from.cohort?.name;
  return dotJoin([label(grade), label(ay), label(section), label(shift), label(cohort)]);
};

export const formatTo = (target = {}) => {
  const grade = target.toGrade;
  const ay = yearShort(target.toAY);
  const section = target.section;
  const shift = target.shift;
  const cohort = target.cohort;
  return dotJoin([label(grade), label(ay), label(section), label(shift), label(cohort)]);
};

export const formatCurrent = (c = {}) => {
  // listStudents() returns s.current fields as simple strings; tolerate missing values
  return dotJoin([label(c.grade), label(c.ay), label(c.section), label(c.shift), label(c.cohort)]);
};

// Keep toasts concise: never include long student lists.
export const formatApiErrorToast = (errOrRes) => {
  const data = errOrRes?.data || errOrRes || {};
  return String(data?.error || data?.message || errOrRes?.message || 'Request failed').trim();
};
