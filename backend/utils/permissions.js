// Central contract for permission modules/actions (backend authoritative allowlist)
// Keep this aligned with the routes in backend/routes/*.
// NOTE: This is intentionally PER-MODULE (not a global action list), so we don't
// accidentally allow e.g. { students: { promote: true } }.

export const PERMISSION_CONTRACT = Object.freeze({
  students: Object.freeze([
    'view',
    'add',
    'edit',
    'delete',
    'resetPassword',
    'transfer',
    'deactivate',
    'reactivate',
    'download',
    'full',
  ]),
  teachers: Object.freeze([
    'view',
    'add',
    'edit',
    'delete',
    'resetPassword',
    'assign',
    'deactivate',
    'reactivate',
    'download',
    'full',
  ]),
  transfers: Object.freeze(['view', 'transfer', 'full']),
  subjects: Object.freeze(['view', 'add', 'edit', 'delete', 'full']),
  grades: Object.freeze(['view', 'add', 'edit', 'delete', 'full']),
  exams: Object.freeze(['view', 'input', 'full']),
  cohorts: Object.freeze(['view', 'add', 'edit', 'delete', 'full']),
  results: Object.freeze(['view', 'print', 'download', 'full']),
  transcript: Object.freeze(['view', 'print', 'download', 'full']),
  promotions: Object.freeze(['view', 'preview', 'promote', 'full']),
  timetable: Object.freeze(['view', 'add', 'edit', 'delete', 'print', 'download', 'full']),
  // Backward compatibility: some routes accept attendance.print/download for reports.
  attendance: Object.freeze(['view', 'edit', 'print', 'download', 'full']),
  attendanceReports: Object.freeze(['view', 'print', 'download', 'full']),
  announcements: Object.freeze(['add', 'edit', 'delete', 'full']),

  // Digital Library resources (PDFs/links)
  library: Object.freeze(['view', 'add', 'edit', 'delete', 'download', 'full']),

  // Bell notifications / security module
  // - view: show bell + list alerts
  // - resetPassword: reset student/teacher password from bell
  // - unlock: unlock staff account from bell
  // - deactivate/activate: toggle account status from bell
  // - resetLockout: reset staff login lockout (used in User Management)
  // - edit: legacy fallback (kept for backwards compatibility)
  security: Object.freeze(['view', 'resetPassword', 'unlock', 'deactivate', 'activate', 'resetLockout', 'edit', 'full']),

  // Finance (granular tab-based permissions)
  financeDashboard: Object.freeze(['view', 'full']),
  // Note: printing is governed by financePrint.print (global)
  financeAccounts: Object.freeze(['view', 'add', 'edit', 'delete', 'transfer', 'income', 'download', 'full']),
  // Accounts (sub-tabs)
  // NOTE: Enforced per-tab in financeRoutes.js and backward-compatible with legacy financeAccounts.* via middleware aliases.
  financeAccountsInstitution: Object.freeze(['view', 'add', 'edit', 'delete', 'transfer', 'income', 'download', 'full']),
  financeAccountsOverview: Object.freeze(['view', 'full']),
  financeAccountsLedger: Object.freeze(['view', 'download', 'full']),
  financeStudent: Object.freeze(['view', 'add', 'edit', 'delete', 'download', 'full']),
  // Student Finance (sub-tabs)
  // NOTE: These are used to allow admin to grant access per Student Finance tab.
  // They are enforced in financeRoutes.js and are backward-compatible with legacy financeStudent.* via middleware aliases.
  financeStudentReceipt: Object.freeze(['view', 'add', 'edit', 'delete', 'download', 'full']),
  financeStudentPreviousBalance: Object.freeze(['view', 'add', 'edit', 'delete', 'full']),
  financeStudentAmountType: Object.freeze(['view', 'add', 'edit', 'delete', 'full']),
  financeStudentFeeType: Object.freeze(['view', 'add', 'edit', 'delete', 'full']),
  // Modal-level permissions (separate from tab CRUD)
  financeStudentReceiptModal: Object.freeze(['view', 'input', 'save', 'revert', 'full']),
  financeStudentPreviousBalanceModal: Object.freeze(['view', 'input', 'save', 'revert', 'full']),

  financePayroll: Object.freeze(['view', 'add', 'edit', 'delete', 'download', 'full']),
  financePayrollEmployeeInfo: Object.freeze(['view', 'input', 'save', 'full']),

  financeExpenses: Object.freeze(['view', 'add', 'edit', 'delete', 'download', 'full']),
  // Expenses (sub-tabs)
  financeExpensesLedger: Object.freeze(['view', 'add', 'edit', 'delete', 'download', 'full']),
  financeExpensesCategories: Object.freeze(['view', 'add', 'edit', 'delete', 'full']),
  financeConfig: Object.freeze(['view', 'add', 'edit', 'delete', 'full']),
  financeFoundation: Object.freeze(['view', 'add', 'full']),
  financeAppointments: Object.freeze(['view', 'add', 'edit', 'delete', 'full']),
  financeAudit: Object.freeze(['view', 'full']),
  financeMaintenance: Object.freeze(['run', 'full']),
  financePrint: Object.freeze(['print', 'full']),
});

export const PERMISSION_MODULES = Object.freeze(Object.keys(PERMISSION_CONTRACT));

export const PERMISSION_ACTIONS = Object.freeze(
  Array.from(
    new Set(
      Object.values(PERMISSION_CONTRACT)
        .flatMap((actions) => (Array.isArray(actions) ? actions : []))
    )
  )
);

const MODULE_SET = new Set(PERMISSION_MODULES);

const isAllowedAction = (moduleName, actionName) => {
  const actions = PERMISSION_CONTRACT?.[moduleName];
  return Array.isArray(actions) && actions.includes(actionName);
};

const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/**
 * Validates and sanitizes a permissions payload.
 * - Rejects unknown modules/actions (privilege-injection hardening).
 * - Keeps only boolean `true` values.
 * - Returns a full object containing all known modules (so Mongoose defaults stay stable).
 */
export function sanitizePermissionsPayload(input) {
  const payload = isPlainObject(input) ? input : {};

  const unknownModules = [];
  const unknownActions = [];

  for (const [moduleName, modulePerm] of Object.entries(payload)) {
    if (!MODULE_SET.has(moduleName)) {
      unknownModules.push(moduleName);
      continue;
    }

    if (!isPlainObject(modulePerm)) continue;

    for (const actionName of Object.keys(modulePerm)) {
      if (!isAllowedAction(moduleName, actionName)) {
        unknownActions.push(`${moduleName}.${actionName}`);
      }
    }
  }

  const sanitized = {};
  for (const moduleName of PERMISSION_MODULES) {
    const modulePerm = isPlainObject(payload[moduleName]) ? payload[moduleName] : {};
    const out = {};
    const allowed = PERMISSION_CONTRACT[moduleName] || [];
    for (const actionName of allowed) {
      if (modulePerm?.[actionName] === true) out[actionName] = true;
    }
    sanitized[moduleName] = out;
  }

  return {
    sanitized,
    unknownModules,
    unknownActions,
  };
}
