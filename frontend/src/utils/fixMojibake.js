export function fixMojibake(input) {
  if (input === null || input === undefined) return input;

  const s = String(input);
  // Fast path: avoid touching normal strings.
  if (!/[âÃÂ]/.test(s)) return s;

  // Minimal, targeted cleanup for common UTF-8->cp1252 mojibake sequences
  // seen in this codebase (punctuation + UI symbols).
  return s
    // stray nbsp marker that often appears in these corruptions
    .replace(/Â/g, '')
    // bullets/dots
    .replace(/â€¢/g, '-')
    // en/em dashes
    .replace(/â€“/g, '-')
    .replace(/â€”/g, '-')
    // ellipsis
    .replace(/â€¦/g, '...')
    // quotes/apostrophes
    .replace(/â€˜/g, "'")
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€�/g, '"')
    // misc symbols
    .replace(/â‹¯/g, '...')
    .replace(/âœ“/g, '✓')
    // catch any leftover partial sequences
    .replace(/â€/g, '-');
}

