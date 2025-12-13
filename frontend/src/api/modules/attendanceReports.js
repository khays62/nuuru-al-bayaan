import { http } from '../http';

export const getAttendanceReportSummary = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const path = qs ? `attendance/reports/summary?${qs}` : 'attendance/reports/summary';
  return http.fetchJson(path);
};

export const getAttendanceReportDetails = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const path = qs ? `attendance/reports/details?${qs}` : 'attendance/reports/details';
  return http.fetchJson(path);
};
