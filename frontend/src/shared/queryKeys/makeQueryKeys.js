export const qkStr = (value) => (value == null ? '' : String(value));

// Minimal helper: keeps query key formatting consistent without changing shapes.
export function makeQueryKeys(scope) {
  const base = [scope];
  const key = (...parts) => [scope, ...parts];
  return { base, key };
}
