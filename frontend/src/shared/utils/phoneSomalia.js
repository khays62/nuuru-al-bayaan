// Somalia phone normalization + validation
// Accepts:
// - +252XXXXXXXXX
// - +252 XX XXX XXXX (spaces)
// - 252XXXXXXXXX
// - 0XXXXXXXXX (e.g. 077..., will normalize)
// - XXXXXXXXX (e.g. 61..., 77...)
// Returns canonical E.164: +252XXXXXXXXX when valid.

export function normalizeSomaliaPhone(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return '';

  // Keep leading + then strip everything else to digits.
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  let national = '';

  if (hasPlus) {
    if (digits.startsWith('252')) {
      national = digits.slice(3);
    } else {
      return '';
    }
  } else if (digits.startsWith('252')) {
    national = digits.slice(3);
  } else if (digits.startsWith('0') && digits.length === 10) {
    // e.g. 077xxxxxxx
    national = digits.slice(1);
  } else if (digits.length === 9) {
    // e.g. 61xxxxxxx or 77xxxxxxx
    national = digits;
  } else {
    return '';
  }

  if (!/^\d{9}$/.test(national)) return '';

  // Prefix policy (as requested): accept 61... and 77... (from 077...)
  // This can be extended later.
  if (!(national.startsWith('61') || national.startsWith('77'))) return '';

  return `+252${national}`;
}

export function isValidSomaliaPhone(input) {
  return Boolean(normalizeSomaliaPhone(input));
}
