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
  announcements: Object.freeze(['view', 'add', 'edit', 'delete', 'full']),
  // Bell notifications / security module
  // - view: show bell + list alerts
  // - resetPassword: reset student/teacher password from bell
  // - unlock: unlock staff account from bell
  // - deactivate/activate: toggle account status from bell
  security: Object.freeze(['view', 'resetPassword', 'unlock', 'deactivate', 'activate', 'full']),
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
