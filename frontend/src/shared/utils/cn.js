/**
 * Tiny className joiner.
 * Keep it dependency-free to avoid churn.
 */
export function cn(...parts) {
  return parts
    .flat(Infinity)
    .filter(Boolean)
    .join(' ')
    .trim();
}
