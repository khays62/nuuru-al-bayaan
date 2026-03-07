import { makeQueryKeys, qkStr } from '../../shared/queryKeys/makeQueryKeys';

const library = makeQueryKeys('library');

export const libraryKeys = {
  base: library.base,

  listBase: () => library.key('list'),
  list: ({ q, limit, page } = {}) => library.key(
    'list',
    qkStr(q || ''),
    qkStr(limit ?? ''),
    qkStr(page ?? ''),
  ),
};
