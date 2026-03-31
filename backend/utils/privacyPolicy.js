import PrivacySettings from '../models/PrivacySettings.js';

const PRIVACY_SETTINGS_KEY = 'privacy-policy';
export const SECURITY_LOCK_LEVEL = 3;

export const DEFAULT_PRIVACY_POLICY = Object.freeze({
  loginProtection: Object.freeze({
    enabled: true,
    stageOneAttempts: 10,
    stageOneCooldownSeconds: 15,
    stageTwoAttempts: 5,
    stageTwoCooldownSeconds: 30,
    stageThreeAttempts: 3,
    stageThreeCooldownSeconds: 60,
    lockoutSeconds: 24 * 60 * 60,
    maxIdentifierLength: 128,
    maxPasswordLength: 256,
  }),
  passwordPolicy: Object.freeze({
    minLength: 6,
    maxLength: 256,
    requireUppercase: false,
    requireLowercase: false,
    requireNumber: false,
    requireSymbol: false,
  }),
  sessionPolicy: Object.freeze({
    idleTimeoutMinutes: 30,
  }),
  studentDashboard: Object.freeze({
    profile: true,
    enrollments: true,
    transcript: true,
    attendance: true,
    timetable: true,
    finance: true,
    library: true,
    transfers: true,
  }),
  aiChat: Object.freeze({
    enabled: true,
    dailyLimitStudent: 30,
    dailyLimitTeacher: 60,
    dailyLimitStaff: 80,
  }),
});

function toInt(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.floor(n);
  return Math.min(max, Math.max(min, rounded));
}

function toBool(value, fallback) {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function cloneDefaults() {
  return {
    loginProtection: { ...DEFAULT_PRIVACY_POLICY.loginProtection },
    passwordPolicy: { ...DEFAULT_PRIVACY_POLICY.passwordPolicy },
    sessionPolicy: { ...DEFAULT_PRIVACY_POLICY.sessionPolicy },
    studentDashboard: { ...DEFAULT_PRIVACY_POLICY.studentDashboard },
    aiChat: { ...DEFAULT_PRIVACY_POLICY.aiChat },
  };
}

export function normalizePrivacyPolicy(input = {}) {
  const base = cloneDefaults();
  const loginProtection = input?.loginProtection || {};
  const passwordPolicy = input?.passwordPolicy || {};
  const sessionPolicy = input?.sessionPolicy || {};
  const studentDashboard = input?.studentDashboard || {};
  const aiChat = input?.aiChat || {};

  base.loginProtection.enabled = toBool(loginProtection.enabled, base.loginProtection.enabled);
  base.loginProtection.stageOneAttempts = toInt(loginProtection.stageOneAttempts, base.loginProtection.stageOneAttempts, { min: 1, max: 100 });
  base.loginProtection.stageOneCooldownSeconds = toInt(loginProtection.stageOneCooldownSeconds, base.loginProtection.stageOneCooldownSeconds, { min: 1, max: 3600 });
  base.loginProtection.stageTwoAttempts = toInt(loginProtection.stageTwoAttempts, base.loginProtection.stageTwoAttempts, { min: 1, max: 100 });
  base.loginProtection.stageTwoCooldownSeconds = toInt(loginProtection.stageTwoCooldownSeconds, base.loginProtection.stageTwoCooldownSeconds, { min: 1, max: 7200 });
  base.loginProtection.stageThreeAttempts = toInt(loginProtection.stageThreeAttempts, base.loginProtection.stageThreeAttempts, { min: 1, max: 100 });
  base.loginProtection.stageThreeCooldownSeconds = toInt(loginProtection.stageThreeCooldownSeconds, base.loginProtection.stageThreeCooldownSeconds, { min: 1, max: 86400 });
  base.loginProtection.lockoutSeconds = toInt(loginProtection.lockoutSeconds, base.loginProtection.lockoutSeconds, { min: 60, max: 2_592_000 });
  base.loginProtection.maxIdentifierLength = toInt(loginProtection.maxIdentifierLength, base.loginProtection.maxIdentifierLength, { min: 16, max: 512 });
  base.loginProtection.maxPasswordLength = toInt(loginProtection.maxPasswordLength, base.loginProtection.maxPasswordLength, { min: 8, max: 512 });

  base.passwordPolicy.minLength = toInt(passwordPolicy.minLength, base.passwordPolicy.minLength, { min: 6, max: 128 });
  base.passwordPolicy.maxLength = toInt(passwordPolicy.maxLength, base.passwordPolicy.maxLength, { min: 8, max: 512 });
  base.passwordPolicy.requireUppercase = toBool(passwordPolicy.requireUppercase, base.passwordPolicy.requireUppercase);
  base.passwordPolicy.requireLowercase = toBool(passwordPolicy.requireLowercase, base.passwordPolicy.requireLowercase);
  base.passwordPolicy.requireNumber = toBool(passwordPolicy.requireNumber, base.passwordPolicy.requireNumber);
  base.passwordPolicy.requireSymbol = toBool(passwordPolicy.requireSymbol, base.passwordPolicy.requireSymbol);

  if (base.passwordPolicy.maxLength < base.passwordPolicy.minLength) {
    base.passwordPolicy.maxLength = base.passwordPolicy.minLength;
  }

  base.sessionPolicy.idleTimeoutMinutes = toInt(sessionPolicy.idleTimeoutMinutes, base.sessionPolicy.idleTimeoutMinutes, { min: 5, max: 1440 });

  for (const key of Object.keys(base.studentDashboard)) {
    base.studentDashboard[key] = toBool(studentDashboard[key], base.studentDashboard[key]);
  }

  base.aiChat.enabled = toBool(aiChat.enabled, base.aiChat.enabled);
  base.aiChat.dailyLimitStudent = toInt(aiChat.dailyLimitStudent, base.aiChat.dailyLimitStudent, { min: 0, max: 10_000 });
  base.aiChat.dailyLimitTeacher = toInt(aiChat.dailyLimitTeacher, base.aiChat.dailyLimitTeacher, { min: 0, max: 10_000 });
  base.aiChat.dailyLimitStaff = toInt(aiChat.dailyLimitStaff, base.aiChat.dailyLimitStaff, { min: 0, max: 10_000 });

  return base;
}

export async function getResolvedPrivacyPolicy() {
  const doc = await PrivacySettings.findOne({ singletonKey: PRIVACY_SETTINGS_KEY }).lean();
  return normalizePrivacyPolicy(doc || {});
}

export function getClientPrivacyPolicy(input = {}) {
  const resolved = normalizePrivacyPolicy(input);
  return {
    passwordPolicy: { ...resolved.passwordPolicy },
    sessionPolicy: { ...resolved.sessionPolicy },
    studentDashboard: { ...resolved.studentDashboard },
    aiChat: { ...resolved.aiChat },
  };
}

export function computeMaxAttempts(level = 0, policy = DEFAULT_PRIVACY_POLICY.loginProtection) {
  const n = Number.isFinite(level) ? Math.max(0, Math.floor(level)) : 0;
  if (!policy?.enabled) return Number.MAX_SAFE_INTEGER;
  if (n <= 0) return toInt(policy.stageOneAttempts, DEFAULT_PRIVACY_POLICY.loginProtection.stageOneAttempts, { min: 1, max: 100 });
  if (n === 1) return toInt(policy.stageTwoAttempts, DEFAULT_PRIVACY_POLICY.loginProtection.stageTwoAttempts, { min: 1, max: 100 });
  return toInt(policy.stageThreeAttempts, DEFAULT_PRIVACY_POLICY.loginProtection.stageThreeAttempts, { min: 1, max: 100 });
}

export function computeCooldownSeconds(level = 0, policy = DEFAULT_PRIVACY_POLICY.loginProtection) {
  const n = Number.isFinite(level) ? Math.max(0, Math.floor(level)) : 0;
  if (!policy?.enabled) return 0;
  if (n <= 0) return toInt(policy.stageOneCooldownSeconds, DEFAULT_PRIVACY_POLICY.loginProtection.stageOneCooldownSeconds, { min: 1, max: 3600 });
  if (n === 1) return toInt(policy.stageTwoCooldownSeconds, DEFAULT_PRIVACY_POLICY.loginProtection.stageTwoCooldownSeconds, { min: 1, max: 7200 });
  return toInt(policy.stageThreeCooldownSeconds, DEFAULT_PRIVACY_POLICY.loginProtection.stageThreeCooldownSeconds, { min: 1, max: 86400 });
}

export function getLockoutSeconds(policy = DEFAULT_PRIVACY_POLICY.loginProtection) {
  if (!policy?.enabled) return 0;
  return toInt(policy.lockoutSeconds, DEFAULT_PRIVACY_POLICY.loginProtection.lockoutSeconds, { min: 60, max: 2_592_000 });
}

export function isFinalAttemptBeforeBlock(level = 0, remainingAttempts = 0) {
  const n = Number.isFinite(level) ? Math.max(0, Math.floor(level)) : 0;
  const remaining = Number.isFinite(remainingAttempts) ? Math.max(0, Math.floor(remainingAttempts)) : 0;
  return n >= (SECURITY_LOCK_LEVEL - 1) && remaining === 1;
}

export function validatePasswordAgainstPolicy(password, policyInput = {}) {
  const policy = normalizePrivacyPolicy(policyInput).passwordPolicy;
  const value = String(password || '');
  const issues = [];

  if (!value || value.length < policy.minLength) {
    issues.push({ key: 'minLength', meta: { minLength: policy.minLength } });
  }
  if (value.length > policy.maxLength) {
    issues.push({ key: 'maxLength', meta: { maxLength: policy.maxLength } });
  }
  if (policy.requireUppercase && !/[A-Z]/.test(value)) issues.push({ key: 'requireUppercase' });
  if (policy.requireLowercase && !/[a-z]/.test(value)) issues.push({ key: 'requireLowercase' });
  if (policy.requireNumber && !/[0-9]/.test(value)) issues.push({ key: 'requireNumber' });
  if (policy.requireSymbol && !/[^A-Za-z0-9]/.test(value)) issues.push({ key: 'requireSymbol' });

  return {
    ok: issues.length === 0,
    issues,
    policy,
  };
}