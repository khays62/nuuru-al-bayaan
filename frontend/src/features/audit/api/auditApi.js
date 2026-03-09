import { fetchJson } from '../../../shared/api/http.js';

const buildAuditQuery = ({ range, from, to, operation, metric, page, limit } = {}) => {
  const params = new URLSearchParams();
  if (range) params.set('range', String(range));
  if (from) params.set('from', String(from));
  if (to) params.set('to', String(to));
  if (operation) params.set('operation', String(operation));
  if (metric) params.set('metric', String(metric));
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export const getAuditSummary = async (params = {}) => {
  return fetchJson(`/audit/summary${buildAuditQuery(params)}`);
};

export const getAuditTimeline = async (params = {}) => {
  return fetchJson(`/audit/timeline${buildAuditQuery(params)}`);
};

export const getAuditTop = async (params = {}) => {
  return fetchJson(`/audit/top${buildAuditQuery(params)}`);
};

export const getAuditAnalytics = async (params = {}) => {
  return fetchJson(`/audit/analytics${buildAuditQuery(params)}`);
};

export const getAuditAnalyticsDetails = async ({ range, from, to, operation, metric, limit = 30 } = {}) => {
  return fetchJson(`/audit/analytics/details${buildAuditQuery({ range, from, to, operation, metric, limit })}`);
};

export const getAuditOperationSummary = async ({ range, from, to, operation } = {}) => {
  return fetchJson(`/audit/analytics/operation-summary${buildAuditQuery({ range, from, to, operation })}`);
};

export const getAuditEvents = async ({ range, from, to, page = 1, limit = 20 } = {}) => {
  return fetchJson(`/audit/events${buildAuditQuery({ range, from, to, page, limit })}`);
};

export const postClientAuditEvent = async ({ action, path } = {}) => {
  return fetchJson('/audit/client-event', {
    method: 'POST',
    body: JSON.stringify({ action, path }),
  });
};
