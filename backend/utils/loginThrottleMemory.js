// In-memory throttle for unknown usernames / identifiers.
// This is a best-effort protection layer. Backend DB-based throttling remains the source of truth
// for real accounts, but unknown IDs can't be persisted safely.
// NOTE: In multi-instance deployments, replace this with a shared store (Redis).

const store = new Map();

const MAX_ENTRIES = 50_000;
const CLEANUP_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function cleanup(now = Date.now()) {
  // cheap opportunistic cleanup
  if (store.size <= MAX_ENTRIES) {
    for (const [k, v] of store) {
      if (!v || (now - (v.lastSeenMs || 0)) > CLEANUP_TTL_MS) store.delete(k);
    }
    return;
  }

  // If it grows too large, drop oldest-ish by TTL first.
  for (const [k, v] of store) {
    if (!v || (now - (v.lastSeenMs || 0)) > CLEANUP_TTL_MS) store.delete(k);
    if (store.size <= MAX_ENTRIES) break;
  }
}

export function getUnknownLoginState(key) {
  return store.get(String(key || '')) || null;
}

export function resetUnknownLoginState(key) {
  store.delete(String(key || ''));
}

export function recordUnknownLoginAttempt({
  key,
  computeCooldownSeconds,
  computeMaxAttempts,
  getLockoutSeconds,
  securityLockLevel = 4,
} = {}) {
  const now = Date.now();
  cleanup(now);

  const k = String(key || '');
  if (!k) {
    return {
      blocked: false,
      code: null,
      retryAfterSeconds: 0,
      remainingAttempts: null,
    };
  }

  const existing = store.get(k) || {
    failedAttempts: 0,
    cooldownLevel: 0,
    lockUntilMs: 0,
    blockedUntilMs: 0,
    lastSeenMs: now,
  };

  existing.lastSeenMs = now;

  if (existing.blockedUntilMs && existing.blockedUntilMs <= now) {
    existing.failedAttempts = 0;
    existing.cooldownLevel = 0;
    existing.lockUntilMs = 0;
    existing.blockedUntilMs = 0;
  }

  // If currently blocked/cooling down
  if (existing.blockedUntilMs && existing.blockedUntilMs > now) {
    const retryAfterSeconds = Math.max(0, Math.ceil((existing.blockedUntilMs - now) / 1000));
    store.set(k, existing);
    return {
      blocked: true,
      code: 'UNKNOWN_USERNAME_BLOCKED',
      retryAfterSeconds,
      remainingAttempts: 0,
      level: Number(existing.cooldownLevel || securityLockLevel),
      isFinalAttemptBeforeBlock: false,
    };
  }

  if (existing.lockUntilMs && existing.lockUntilMs > now) {
    const retryAfterSeconds = Math.max(0, Math.ceil((existing.lockUntilMs - now) / 1000));
    store.set(k, existing);
    return {
      blocked: true,
      code: 'LOGIN_COOLDOWN',
      retryAfterSeconds,
      remainingAttempts: 0,
      level: Number(existing.cooldownLevel || 0),
      isFinalAttemptBeforeBlock: false,
    };
  }

  const level = Number(existing.cooldownLevel || 0);
  const maxAttempts = computeMaxAttempts(level);

  existing.failedAttempts = Number(existing.failedAttempts || 0) + 1;

  if (existing.failedAttempts >= maxAttempts) {
    existing.failedAttempts = 0;

    const nextLevel = level + 1;
    if (nextLevel >= securityLockLevel) {
      const lockoutSeconds = Math.max(60, Number(getLockoutSeconds?.() || 0));
      existing.cooldownLevel = securityLockLevel;
      existing.lockUntilMs = 0;
      existing.blockedUntilMs = now + lockoutSeconds * 1000;
      store.set(k, existing);
      return {
        blocked: true,
        code: 'UNKNOWN_USERNAME_BLOCKED',
        retryAfterSeconds: lockoutSeconds,
        remainingAttempts: 0,
        level,
        isFinalAttemptBeforeBlock: false,
      };
    }

    const cooldownSeconds = computeCooldownSeconds(level);
    existing.cooldownLevel = nextLevel;
    existing.lockUntilMs = now + cooldownSeconds * 1000;
    store.set(k, existing);

    return {
      blocked: true,
      code: 'LOGIN_COOLDOWN',
      retryAfterSeconds: cooldownSeconds,
      remainingAttempts: 0,
      level,
      isFinalAttemptBeforeBlock: false,
    };
  }

  const remainingAttempts = Math.max(0, maxAttempts - existing.failedAttempts);
  store.set(k, existing);
  return {
    blocked: false,
    code: 'INVALID_CREDENTIALS',
    retryAfterSeconds: 0,
    remainingAttempts,
    level,
    isFinalAttemptBeforeBlock: level >= (securityLockLevel - 1) && remainingAttempts === 1,
  };
}
