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
    'full',
  ],
  transfers: ['view', 'transfer', 'full'],
  // Bell notifications / security module
  // - view: show bell + list alerts
  // - resetPassword: reset student/teacher password from bell
  // - unlock: unlock staff account from bell
  // - deactivate/activate: toggle account status from bell
  security: ['view', 'resetPassword', 'unlock', 'deactivate', 'activate', 'full'],
  timetable: ['view', 'add', 'edit', 'delete', 'print', 'download', 'full'],
  // Backward compatibility: some backend report endpoints accept attendance.print/download.
  attendance: ['view', 'edit', 'print', 'download', 'full'],
  attendanceReports: ['view', 'print', 'download', 'full'],
  announcements: ['view', 'add', 'edit', 'delete', 'full'],
  cohorts: ['view', 'add', 'edit', 'delete', 'full'],
  promotions: ['view', 'preview', 'promote', 'full'],
  transcript: ['view', 'print', 'download', 'full'],
  subjects: ['view', 'add', 'edit', 'delete', 'full'],
  grades: ['view', 'add', 'edit', 'delete', 'full'],
  exams: ['view', 'input', 'full'],
  results: ['view', 'print', 'download', 'full'],
});

export const MODULES = Object.freeze(Object.keys(MODULE_PERMISSIONS));
