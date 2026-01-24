import { makeQueryKeys, qkStr } from '../../shared/queryKeys/makeQueryKeys';

const teacher = makeQueryKeys('teacher');

export const teacherKeys = {
  base: teacher.base,
  me: () => teacher.key('me'),
  assignments: (teacherRef) => teacher.key('assignments', qkStr(teacherRef || '')),

  // Teacher-scoped list of grade sections (used by Result/Exam/Timetable pages in teacher mode)
  gradeSections: ({ limit } = {}) => teacher.key('gradeSections', qkStr(limit || '')),
  gradeSectionById: (gradeSectionId) => teacher.key('gradeSection', qkStr(gradeSectionId || '')),

  // Timetable (teacher read-only)
  timetableSlots: ({ gradeSectionId } = {}) => teacher.key('timetableSlots', qkStr(gradeSectionId || '')),
  timetableTodayMine: ({ dayIndex } = {}) => teacher.key('timetableTodayMine', qkStr(dayIndex ?? '')),

  // Attendance Reports summary (teacher-scoped filtering happens in UI using timetable slots)
  attendanceReportSummary: ({ gradeSectionId, from, to }) =>
    teacher.key('attendanceReportSummary', qkStr(gradeSectionId || ''), qkStr(from || ''), qkStr(to || '')),
  subjectSlots: ({ gradeSectionId, subjectId }) =>
    teacher.key('subjectSlots', qkStr(gradeSectionId || ''), qkStr(subjectId || '')),
  examTypes: ({ academicYearId, gradeSectionId, templateVersion }) =>
    teacher.key(
      'examTypes',
      qkStr(academicYearId || ''),
      qkStr(gradeSectionId || ''),
      templateVersion == null ? '' : qkStr(templateVersion),
    ),
  examSummary: (params) =>
    teacher.key(
      'examSummary',
      qkStr(params?.academicYearId || ''),
      qkStr(params?.gradeSectionId || ''),
      qkStr(params?.mode || ''),
      qkStr(params?.subjectId || ''),
      qkStr(params?.examTypeId || ''),
      qkStr(params?.enrollmentStatus || ''),
      qkStr(params?.cohortId || ''),
      qkStr(params?.topN || ''),
      qkStr(params?.bottomN || ''),
    ),

  examGrid: (params) =>
    teacher.key(
      'examGrid',
      qkStr(params?.academicYearId || ''),
      qkStr(params?.gradeSectionId || ''),
      qkStr(params?.subjectId || ''),
      qkStr(params?.enrollmentStatus || ''),
      qkStr(params?.cohortId || ''),
      qkStr(params?.templateVersion || ''),
    ),

  studentsCount: ({ gradeSectionId, enrollmentStatus } = {}) =>
    teacher.key('studentsCount', qkStr(gradeSectionId || ''), qkStr(enrollmentStatus || '')),

  studentsList: ({ gradeSectionId, enrollmentStatus, limit, sortBy, sortDir } = {}) =>
    teacher.key(
      'studentsList',
      qkStr(gradeSectionId || ''),
      qkStr(enrollmentStatus || ''),
      qkStr(limit || ''),
      qkStr(sortBy || ''),
      qkStr(sortDir || ''),
    ),
};
