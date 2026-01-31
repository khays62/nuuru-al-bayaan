import { makeQueryKeys } from '../../shared/queryKeys/makeQueryKeys';

const gradeSections = makeQueryKeys('gradeSections');

export const gradeSectionKeys = {
  all: gradeSections.base,

  listBase: gradeSections.key('list'),
  list: ({
    page = 1,
    limit = 10,
    search = '',
    sortBy = 'createdAt',
    sortDir = 'desc',
    grade = '',
    shift = '',
    section = '',
  } = {}) =>
    gradeSections.key('list', {
      page: Number(page || 1),
      limit: Number(limit || 10),
      search: String(search || ''),
      sortBy: String(sortBy || ''),
      sortDir: String(sortDir || ''),
      grade: String(grade || ''),
      shift: String(shift || ''),
      section: String(section || ''),
    }),
};
