// Centralized route permission requirements (canonical)

import { MODULE_PERMISSIONS } from './permissionContract.js';

export const permsAny = (module, actions) =>
	Array.isArray(actions) ? actions.map((action) => ({ module, action })) : [];

const actionsFor = (module) => (MODULE_PERMISSIONS[module] || []).filter((a) => a !== 'full');

export const studentsAny = permsAny('students', actionsFor('students'));
export const teachersAny = permsAny('teachers', actionsFor('teachers'));
export const subjectsAny = permsAny('subjects', actionsFor('subjects'));
export const gradesAny = permsAny('grades', actionsFor('grades'));
export const attendanceAny = permsAny('attendance', actionsFor('attendance'));
export const attendanceReportsAny = permsAny('attendanceReports', actionsFor('attendanceReports'));
export const timetableAny = permsAny('timetable', actionsFor('timetable'));
export const examsAny = permsAny('exams', actionsFor('exams'));
export const examsInputOnly = permsAny('exams', ['input']);
export const resultsAny = permsAny('results', actionsFor('results'));
export const promotionsAny = permsAny('promotions', actionsFor('promotions'));
export const cohortsAny = permsAny('cohorts', actionsFor('cohorts'));
export const transfersAny = permsAny('transfers', actionsFor('transfers'));
export const transcriptAny = permsAny('transcript', actionsFor('transcript'));
