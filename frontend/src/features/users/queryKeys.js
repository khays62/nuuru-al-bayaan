import { makeQueryKeys, qkStr } from '../../shared/queryKeys/makeQueryKeys';

const users = makeQueryKeys('users');

export const userKeys = {
  all: users.base,
  list: (params = {}) => users.key('list', params),
  detail: (id) => users.key('detail', qkStr(id)),
  logs: (id) => users.key('logs', qkStr(id)),

  // EDCI v2 (granular bases for realtime invalidation)
  adminListBase: ['users', 'adminList'],
  adminList: ({ search = '', role = '', status = '' } = {}) => [
    'users',
    'adminList',
    {
      search: String(search || ''),
      role: String(role || ''),
      status: String(status || ''),
    },
  ],

  adminProfileBase: ['users', 'adminProfile'],
  adminProfile: (userId) => ['users', 'adminProfile', String(userId || '')],

  adminAuditLogsBase: ['users', 'adminAuditLogs'],
  adminAuditLogs: ({ userId, page = 1, limit = 10 } = {}) => [
    'users',
    'adminAuditLogs',
    {
      userId: String(userId || ''),
      page: Number(page || 1),
      limit: Number(limit || 10),
    },
  ],
};
