// api/index.js
// Barrel: re-export API modules from a single place

export { getGrades, getAcademicYears, getShifts } from '../features/lookups/api/lookups.js';
export * from '../features/lookups/api/lookups.js';
export * from '../features/subjects/api/subjects.js';
export * from '../features/exams/api/exams.js';
export * from '../features/students/api/studentsApi.js';
export * from '../features/grades/api/gradeSections.js';
export { listCohorts, createCohort, updateCohort, deleteCohort, activateCohort, archiveCohort, getAvailableCohortsForPromotion, getCohortTimeline } from '../features/cohorts/api/cohorts.js';
export * from '../features/promotions/api/promotions.js';
export * from '../features/transfers/api/transfers.js';
export * from '../features/users/api/usersApi.js';
export * from '../features/announcements/api/announcementsApi.js';