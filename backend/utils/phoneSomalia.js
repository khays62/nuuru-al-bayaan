// Somalia phone normalization/validation
// Canonical output: +252 + 9 digits (national significant number)
// Accepts:
// - +252 61xxxxxxx
// - 25261xxxxxxx
// - 061xxxxxxx (leading 0)
// - 61xxxxxxx / 77xxxxxxx

const digitsOnly = (s) => String(s || '').replace(/[^0-9]/g, '');

export function normalizeSomaliaPhone(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';

  const cleaned = raw.replace(/\s+/g, '');
  const hasPlus = cleaned.startsWith('+');
  const d = digitsOnly(cleaned);

  // Handle international
  if (hasPlus) {
    if (!d.startsWith('252')) return '';
    const national = d.slice(3);
    if (national.length !== 9) return '';
    if (!/^((61)|(77))/.test(national)) return '';
    return `+252${national}`;
  }

  // Handle no-plus international
  if (d.startsWith('252')) {
    const national = d.slice(3);
    if (national.length !== 9) return '';
    if (!/^((61)|(77))/.test(national)) return '';
    return `+252${national}`;
  }

  // Local 0XXXXXXXXX (10 digits) e.g. 061xxxxxxx, 077xxxxxxx
  if (d.length === 10 && d.startsWith('0')) {
    const national = d.slice(1);
    if (national.length !== 9) return '';
    if (!/^((61)|(77))/.test(national)) return '';
    return `+252${national}`;
  }

  // Local 9 digits e.g. 61xxxxxxx / 77xxxxxxx
  if (d.length === 9) {
    if (!/^((61)|(77))/.test(d)) return '';
    return `+252${d}`;
  }

  return '';
}

export function isValidSomaliaPhone(input) {
  return Boolean(normalizeSomaliaPhone(input));
}
