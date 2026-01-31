import { makeQueryKeys } from '../../shared/queryKeys/makeQueryKeys';

const transfers = makeQueryKeys('transfers');

export const transferKeys = {
  all: transfers.base,

  candidatesBase: transfers.key('candidates'),
  candidates: ({
    page = 1,
    limit = 10,
    search = '',
    academicYear = '',
    grade = '',
    shift = '',
    gradeSectionId = '',
  } = {}) =>
    transfers.key('candidates', {
      page: Number(page || 1),
      limit: Number(limit || 10),
      search: String(search || ''),
      academicYear: String(academicYear || ''),
      grade: String(grade || ''),
      shift: String(shift || ''),
      gradeSectionId: String(gradeSectionId || ''),
    }),

  logsBase: transfers.key('logs'),
  logs: ({ page = 1, limit = 10, search = '' } = {}) =>
    transfers.key('logs', {
      page: Number(page || 1),
      limit: Number(limit || 10),
      search: String(search || ''),
    }),
};
