export function countWords(value) {
  const raw = String(value ?? '');
  const matches = raw.match(/\S+/g);
  return matches ? matches.length : 0;
}

export function clampRemarksWhileTyping(prevValue, nextValue, maxWords = 40) {
  // Do NOT trim/collapse whitespace here; it prevents users from typing spaces
  // in a controlled input. Preserve exactly what they type and reject updates
  // that exceed the word limit.
  const next = String(nextValue ?? '');
  if (countWords(next) > maxWords) return String(prevValue ?? '');
  return next;
}
