export const transcriptKeys = {
  all: ['transcript'],
  studentBase: (studentId) => [...transcriptKeys.all, 'student', String(studentId || '')],
  student: (studentId, fetchType = 'full') => [...transcriptKeys.studentBase(studentId), String(fetchType || 'full')],
  enrollment: (studentId, enrollmentId) => [...transcriptKeys.studentBase(studentId), 'enrollment', String(enrollmentId || '')],
};
