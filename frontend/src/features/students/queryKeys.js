import { makeQueryKeys, qkStr } from '../../shared/queryKeys/makeQueryKeys';

const students = makeQueryKeys('students');

export const studentKeys = {
  base: students.base,

  // Lookups used by Students feature (namespaced so realtime invalidation can refresh them)
  lookupsAcademicYears: () => students.key('lookups', 'academicYears'),
  lookupsGrades: () => students.key('lookups', 'grades'),
  lookupsShifts: () => students.key('lookups', 'shifts'),

  cohortsBase: students.key('cohorts'),
  cohorts: ({ status, academicYearId, limit } = {}) => students.key(
    'cohorts',
    qkStr(status || ''),
    qkStr(academicYearId || ''),
    qkStr(limit ?? ''),
  ),

  gradeSectionsBase: students.key('gradeSections'),
  gradeSectionsByGradeShift: ({ gradeId, shiftId, limit } = {}) => students.key(
    'gradeSections',
    'byGradeShift',
    qkStr(gradeId || ''),
    qkStr(shiftId || ''),
    qkStr(limit ?? ''),
  ),
  gradeSectionsStudentsForm: ({ limit, sortBy, sortDir } = {}) => students.key(
    'gradeSections',
    'studentsForm',
    qkStr(limit ?? ''),
    qkStr(sortBy || ''),
    qkStr(sortDir || ''),
  ),

  // Admin/Staff Students page (list + edit)
  adminListBase: students.key('adminList'),
  adminList: (params = {}) => students.key(
    'adminList',
    qkStr(params?.page ?? ''),
    qkStr(params?.limit ?? ''),
    qkStr(params?.search ?? ''),
    qkStr(params?.sortBy ?? ''),
    qkStr(params?.sortDir ?? ''),
    qkStr(params?.gradeSectionId ?? ''),
    qkStr(params?.status ?? ''),
    qkStr(params?.academicYear ?? ''),
    qkStr(params?.grade ?? ''),
    qkStr(params?.shift ?? ''),
    qkStr(params?.cohortId ?? ''),
    qkStr(params?.enrollmentStatus ?? ''),
    qkStr(params?.includeClosed ?? ''),
  ),

  adminProfileBase: students.key('adminProfile'),
  adminProfile: (studentId) => students.key('adminProfile', qkStr(studentId || '')),

  profile: (studentId) => students.key('profile', qkStr(studentId || '')),

  // Base keys (prefixes) for invalidation/refetch across variations (e.g. different limits)
  historyBase: (studentId) => [
    'students',
    'history',
    qkStr(studentId || ''),
  ],
  history: (studentId, { page, limit } = {}) => [
    'students',
    'history',
    qkStr(studentId || ''),
    qkStr(page || ''),
    qkStr(limit || ''),
  ],

  transfersBase: (studentId) => [
    'students',
    'transfers',
    qkStr(studentId || ''),
  ],
  transfers: (studentId, { limit } = {}) => [
    'students',
    'transfers',
    qkStr(studentId || ''),
    qkStr(limit || ''),
  ],

  transcriptBase: (studentId) => [
    'students',
    'transcript',
    qkStr(studentId || ''),
  ],
  transcriptByEnrollment: (studentId, { academicYearId, gradeSectionId } = {}) => [
    'students',
    'transcript',
    qkStr(studentId || ''),
    qkStr(academicYearId || ''),
    qkStr(gradeSectionId || ''),
  ],

  overallSummary: (studentId) => [
    'students',
    'overallSummary',
    qkStr(studentId || ''),
  ],

  levelStats: (studentId, enrollmentsKey) => [
    'students',
    'levelStats',
    qkStr(studentId || ''),
    qkStr(enrollmentsKey || ''),
  ],

  levelStatsBase: (studentId) => [
    'students',
    'levelStats',
    qkStr(studentId || ''),
  ],

  attendanceSelf: ({ from, to } = {}) => [
    'students',
    'attendance',
    'self',
    qkStr(from || ''),
    qkStr(to || ''),
  ],

  attendanceSelfBase: () => [
    'students',
    'attendance',
    'self',
  ],

  attendanceByStudentBase: (studentId) => [
    'students',
    'attendance',
    qkStr(studentId || ''),
  ],
  attendanceByStudent: (studentId, { from, to } = {}) => [
    'students',
    'attendance',
    qkStr(studentId || ''),
    qkStr(from || ''),
    qkStr(to || ''),
  ],

  timetableSlotsBase: () => [
    'students',
    'timetableSlotsByGS',
  ],
  timetableSlotsByGradeSection: (gradeSectionId) => [
    'students',
    'timetableSlotsByGS',
    qkStr(gradeSectionId || ''),
  ],

  // Student Finance (read-only viewer)
  financeMonthHistoryBase: (studentId) => [
    'students',
    'finance',
    'monthHistory',
    qkStr(studentId || ''),
  ],
  financeMonthHistory: (studentId, { academicYearId } = {}) => [
    'students',
    'finance',
    'monthHistory',
    qkStr(studentId || ''),
    qkStr(academicYearId || ''),
  ],

  // Digital Library (global resources)
  libraryListBase: () => [
    'students',
    'library',
  ],
  libraryList: ({ q, limit } = {}) => [
    'students',
    'library',
    qkStr(q || ''),
    qkStr(limit ?? ''),
  ],
};
