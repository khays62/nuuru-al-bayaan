// Single place to define which permission actions are assignable per module (frontend).
// Keep this aligned with backend/utils/permissions.js and backend route checks.

export const MODULE_PERMISSIONS = Object.freeze({
  students: [
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
  ],
  teachers: [
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
  ],
  transfers: ['view', 'transfer', 'full'],
  // Bell notifications / security module
  // - view: show bell + list alerts
  // - resetPassword: reset student/teacher password from bell
  // - unlock: unlock staff account from bell
  // - deactivate/activate: toggle account status from bell
  // - resetLockout: reset staff login lockout (used in User Management)
  // - edit: legacy fallback (kept for backwards compatibility)
  security: ['view', 'resetPassword', 'unlock', 'deactivate', 'activate', 'resetLockout', 'edit', 'full'],
  // Tracking & Audit is separate from bell notifications.
  trackingAudit: ['view', 'full'],
  // Privacy Control is separate from bell notifications.
  privacyControl: ['view', 'edit', 'full'],
  timetable: ['view', 'add', 'edit', 'delete', 'print', 'download', 'full'],
  // Backward compatibility: some backend report endpoints accept attendance.print/download.
  attendance: ['view', 'edit', 'print', 'download', 'full'],
  attendanceReports: ['view', 'print', 'download', 'full'],
  announcements: ['add', 'edit', 'delete', 'full'],
  // Digital Library resources (PDFs/links)
  library: ['view', 'add', 'edit', 'delete', 'download', 'full'],
  cohorts: ['view', 'add', 'edit', 'delete', 'full'],
  promotions: ['view', 'preview', 'promote', 'full'],
  transcript: ['view', 'print', 'download', 'full'],
  subjects: ['view', 'add', 'edit', 'delete', 'full'],
  grades: ['view', 'add', 'edit', 'delete', 'full'],
  exams: ['view', 'input', 'full'],
  results: ['view', 'print', 'download', 'full'],

  // Finance (granular tab-based permissions)
  financeDashboard: ['view', 'full'],
  // Note: printing is governed by financePrint.print (global)
  financeAccounts: ['view', 'add', 'edit', 'delete', 'transfer', 'income', 'download', 'full'],
  // Accounts (sub-tabs)
  financeAccountsInstitution: ['view', 'add', 'edit', 'delete', 'transfer', 'income', 'download', 'full'],
  financeAccountsOverview: ['view', 'full'],
  financeAccountsLedger: ['view', 'download', 'full'],
  financeStudent: ['view', 'add', 'edit', 'delete', 'download', 'full'],
  // Student Finance (sub-tabs)
  financeStudentReceipt: ['view', 'add', 'edit', 'delete', 'download', 'full'],
  financeStudentPreviousBalance: ['view', 'add', 'edit', 'delete', 'full'],
  financeStudentAmountType: ['view', 'add', 'edit', 'delete', 'full'],
  financeStudentFeeType: ['view', 'add', 'edit', 'delete', 'full'],
  // Modal-level permissions (separate from tab CRUD)
  financeStudentReceiptModal: ['view', 'input', 'save', 'revert', 'full'],
  financeStudentPreviousBalanceModal: ['view', 'input', 'save', 'revert', 'full'],

  financePayroll: ['view', 'add', 'edit', 'delete', 'download', 'full'],
  financePayrollEmployeeInfo: ['view', 'input', 'save', 'full'],

  financeExpenses: ['view', 'add', 'edit', 'delete', 'download', 'full'],
  // Expenses (sub-tabs)
  financeExpensesLedger: ['view', 'add', 'edit', 'delete', 'download', 'full'],
  financeExpensesCategories: ['view', 'add', 'edit', 'delete', 'full'],
  financeConfig: ['view', 'add', 'edit', 'delete', 'full'],
  financeFoundation: ['view', 'add', 'full'],
  financeAppointments: ['view', 'add', 'edit', 'delete', 'full'],
  financeAudit: ['view', 'full'],
  financeMaintenance: ['run', 'full'],
  financePrint: ['print', 'full'],
});

export const MODULES = Object.freeze(Object.keys(MODULE_PERMISSIONS));
