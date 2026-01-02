// api/index.js
// Barrel: re-export API modules from a single place

export { getGrades, getAcademicYears, getShifts } from './modules/lookups.js';
export * from './modules/lookups.js';
export * from './modules/subjects.js';
export * from './modules/exams.js';
export * from './modules/students.js';
export * from './modules/gradeSections.js';
export { listCohorts, createCohort, updateCohort, deleteCohort, activateCohort, archiveCohort, getAvailableCohortsForPromotion, getCohortTimeline } from './modules/cohorts.js';
export * from './modules/promotions.js';
export * from './modules/transfers.js';
export * from './modules/users.js';