import { makeQueryKeys } from '../../shared/queryKeys/makeQueryKeys';

const subjects = makeQueryKeys('subjects');

export const subjectKeys = {
  all: subjects.base,

  listBase: subjects.key('list'),
  list: ({
    page = 1,
    limit = 10,
    search = '',
    sortBy = 'createdAt',
    sortDir = 'desc',
    grade = '',
  } = {}) =>
    subjects.key('list', {
      page: Number(page || 1),
      limit: Number(limit || 10),
      search: String(search || ''),
      sortBy: String(sortBy || ''),
      sortDir: String(sortDir || ''),
      grade: String(grade || ''),
    }),
};
