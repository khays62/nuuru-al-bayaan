// Centralized route permission requirements (canonical)

export const permsAny = (module, actions) =>
	Array.isArray(actions) ? actions.map((action) => ({ module, action })) : [];

export const studentsAny = permsAny('students', [
	'view',
	'add',
	'edit',
	'delete',
	'transfer',
	'deactivate',
	'reactivate',
	'download',
]);

export const teachersAny = permsAny('teachers', ['view', 'add', 'edit', 'delete', 'assign']);
export const subjectsAny = permsAny('subjects', ['view', 'add', 'edit', 'delete']);
export const gradesAny = permsAny('grades', ['view', 'add', 'edit', 'delete']);
export const attendanceAny = permsAny('attendance', ['view', 'edit']);
export const attendanceReportsAny = permsAny('attendanceReports', ['view', 'print', 'download']);
export const timetableAny = permsAny('timetable', ['view', 'add', 'edit', 'delete', 'print', 'download']);
export const examsAny = permsAny('exams', ['view', 'input']);
export const examsInputOnly = permsAny('exams', ['input']);
export const resultsAny = permsAny('results', ['view', 'download', 'print']);
export const promotionsAny = permsAny('promotions', ['view', 'preview', 'promote']);
export const cohortsAny = permsAny('cohorts', ['view', 'add', 'edit', 'delete']);
export const transfersAny = permsAny('transfers', ['view', 'transfer']);
export const transcriptAny = permsAny('transcript', ['view', 'print', 'download']);
