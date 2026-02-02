export const setupKeys = {
  base: ['setup'],
  grades: () => [...setupKeys.base, 'grades'],
  shifts: () => [...setupKeys.base, 'shifts'],
  academicYears: () => [...setupKeys.base, 'academicYears'],
};
