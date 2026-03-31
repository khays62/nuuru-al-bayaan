export const PRIVACY_POLICY_DEFAULTS = Object.freeze({
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

export const CLIENT_PRIVACY_POLICY_DEFAULTS = Object.freeze({
  passwordPolicy: Object.freeze({ ...PRIVACY_POLICY_DEFAULTS.passwordPolicy }),
  sessionPolicy: Object.freeze({ ...PRIVACY_POLICY_DEFAULTS.sessionPolicy }),
  studentDashboard: Object.freeze({ ...PRIVACY_POLICY_DEFAULTS.studentDashboard }),
  aiChat: Object.freeze({ ...PRIVACY_POLICY_DEFAULTS.aiChat }),
});

export const STUDENT_DASHBOARD_TABS = Object.freeze([
  Object.freeze({ key: 'profile', navKey: 'student-profile', route: 'profile', labelKey: 'nav.profile', hasShortcutCard: true, hasHomeWidget: false }),
  Object.freeze({ key: 'enrollments', navKey: 'student-enrollments', route: 'enrollments', labelKey: 'nav.enrollments', hasShortcutCard: false, hasHomeWidget: false }),
  Object.freeze({ key: 'transcript', navKey: 'student-transcript', route: 'transcript', labelKey: 'nav.transcript', hasShortcutCard: true, hasHomeWidget: true }),
  Object.freeze({ key: 'attendance', navKey: 'student-attendance', route: 'attendance', labelKey: 'nav.attendance', hasShortcutCard: true, hasHomeWidget: true }),
  Object.freeze({ key: 'timetable', navKey: 'student-timetable', route: 'timetable', labelKey: 'nav.timetable', hasShortcutCard: true, hasHomeWidget: true }),
  Object.freeze({ key: 'finance', navKey: 'student-finance', route: 'finance', labelKey: 'nav.finance', hasShortcutCard: false, hasHomeWidget: false }),
  Object.freeze({ key: 'library', navKey: 'student-library', route: 'library', labelKey: 'nav.library', hasShortcutCard: true, hasHomeWidget: false }),
  Object.freeze({ key: 'transfers', navKey: 'student-transfers', route: 'transfers', labelKey: 'nav.transfers', hasShortcutCard: false, hasHomeWidget: false }),
]);

export function getResolvedPrivacyPolicy(input = {}) {
  return {
    loginProtection: {
      ...PRIVACY_POLICY_DEFAULTS.loginProtection,
      ...(input?.loginProtection || {}),
    },
    passwordPolicy: {
      ...PRIVACY_POLICY_DEFAULTS.passwordPolicy,
      ...(input?.passwordPolicy || {}),
    },
    sessionPolicy: {
      ...PRIVACY_POLICY_DEFAULTS.sessionPolicy,
      ...(input?.sessionPolicy || {}),
    },
    studentDashboard: {
      ...PRIVACY_POLICY_DEFAULTS.studentDashboard,
      ...(input?.studentDashboard || {}),
    },
    aiChat: {
      ...PRIVACY_POLICY_DEFAULTS.aiChat,
      ...(input?.aiChat || {}),
    },
  };
}

export function getResolvedClientPrivacyPolicy(input = {}) {
  const resolved = getResolvedPrivacyPolicy({
    passwordPolicy: input?.passwordPolicy,
    sessionPolicy: input?.sessionPolicy,
    studentDashboard: input?.studentDashboard,
    aiChat: input?.aiChat,
  });
  return {
    passwordPolicy: resolved.passwordPolicy,
    sessionPolicy: resolved.sessionPolicy,
    studentDashboard: resolved.studentDashboard,
    aiChat: resolved.aiChat,
  };
}

export function isStudentDashboardTabEnabled(policyInput, key) {
  if (!key) return true;
  const policy = getResolvedClientPrivacyPolicy(policyInput);
  return policy.studentDashboard?.[key] !== false;
}

export function getStudentDashboardPolicyKeyFromNavItem(itemKey) {
  const key = String(itemKey || '').trim();
  const row = STUDENT_DASHBOARD_TABS.find((item) => item.navKey === key);
  return row?.key || null;
}