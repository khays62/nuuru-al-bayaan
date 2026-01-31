export const transcriptKeys = {
  all: ['transcript'],
  fullBase: () => [...transcriptKeys.all, 'full'],
  full: (studentId) => [...transcriptKeys.fullBase(), String(studentId || '')],
};
