import { makeQueryKeys } from '../../shared/queryKeys/makeQueryKeys';

const promotions = makeQueryKeys('promotions');

export const promotionKeys = {
  all: promotions.base,

  rosterBase: promotions.key('roster'),
  roster: ({ search = '', academicYear = '', grade = '', shift = '', gradeSectionId = '', cohort = '' } = {}) =>
    promotions.key('roster', {
      search: String(search || ''),
      academicYear: String(academicYear || ''),
      grade: String(grade || ''),
      shift: String(shift || ''),
      gradeSectionId: String(gradeSectionId || ''),
      cohort: String(cohort || ''),
    }),
};
