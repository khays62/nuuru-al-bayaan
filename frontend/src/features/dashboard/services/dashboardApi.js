import { fetchJson } from '../../../shared/api/http';

export async function getDashboardSummary(params = {}, options = {}) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', String(params.from));
  if (params?.to) qs.set('to', String(params.to));
  if (params?.academicYearId) qs.set('academicYearId', String(params.academicYearId));
  if (params?.gradeId) qs.set('gradeId', String(params.gradeId));
  if (params?.shiftId) qs.set('shiftId', String(params.shiftId));
  if (params?.gradeSectionId) qs.set('gradeSectionId', String(params.gradeSectionId));

  const url = `dashboard/summary${qs.toString() ? `?${qs.toString()}` : ''}`;
  return fetchJson(url, { method: 'GET', signal: options.signal, cache: 'no-store' });
}
