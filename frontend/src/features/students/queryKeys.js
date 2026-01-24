import { makeQueryKeys, qkStr } from '../../shared/queryKeys/makeQueryKeys';

const students = makeQueryKeys('students');

export const studentKeys = {
  base: students.base,

  profile: (studentId) => students.key('profile', qkStr(studentId || '')),
  history: (studentId, { page, limit } = {}) => [
    'students',
    'history',
    qkStr(studentId || ''),
    qkStr(page || ''),
    qkStr(limit || ''),
  ],

  transfers: (studentId, { limit } = {}) => [
    'students',
    'transfers',
    qkStr(studentId || ''),
    qkStr(limit || ''),
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

  attendanceSelf: ({ from, to } = {}) => [
    'students',
    'attendance',
    'self',
    qkStr(from || ''),
    qkStr(to || ''),
  ],

  attendanceByStudent: (studentId, { from, to } = {}) => [
    'students',
    'attendance',
    qkStr(studentId || ''),
    qkStr(from || ''),
    qkStr(to || ''),
  ],

  timetableSlotsByGradeSection: (gradeSectionId) => [
    'students',
    'timetableSlotsByGS',
    qkStr(gradeSectionId || ''),
  ],
};
