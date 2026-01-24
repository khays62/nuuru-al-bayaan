import { makeQueryKeys, qkStr } from '../../shared/queryKeys/makeQueryKeys';

const users = makeQueryKeys('users');

export const userKeys = {
  all: users.base,
  list: (params = {}) => users.key('list', params),
  detail: (id) => users.key('detail', qkStr(id)),
  logs: (id) => users.key('logs', qkStr(id)),
};
