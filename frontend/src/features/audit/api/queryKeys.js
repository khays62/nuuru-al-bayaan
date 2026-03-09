const normalizeAuditParams = (value) => {
  if (typeof value === 'string') return { range: value };
  if (value && typeof value === 'object') return value;
  return {};
};

const rangeParts = (value) => {
  const params = normalizeAuditParams(value);
  return [params.range || 'custom', params.from || '', params.to || ''];
};

export const auditKeys = Object.freeze({
  all: ['audit'],
  analytics: (params) => ['audit', 'analytics', ...rangeParts(params)],
  analyticsDetails: ({ range, from, to, operation, metric, page, limit } = {}) => ['audit', 'analytics-details', range || 'custom', from || '', to || '', metric || operation || 'all', Number(page || 1), Number(limit || 20)],
  operationSummary: ({ operation, range, from, to } = {}) => ['audit', 'operation-summary', operation || 'all', range || 'custom', from || '', to || ''],
  summary: (params) => ['audit', 'summary', ...rangeParts(params)],
  top: (params) => ['audit', 'top', ...rangeParts(params)],
  timeline: ({ metric, ...params } = {}) => ['audit', 'timeline', ...rangeParts(params), metric || 'total'],
  events: ({ range, from, to, page, limit } = {}) => ['audit', 'events', range || 'custom', from || '', to || '', Number(page || 1), Number(limit || 20)],
});
