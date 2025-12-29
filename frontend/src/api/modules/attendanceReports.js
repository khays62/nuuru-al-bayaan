import { http } from '../http';

export const getAttendanceReportSummary = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const path = qs ? `attendance/reports/summary?${qs}` : 'attendance/reports/summary';
  return http.fetchJson(path);
};

export const getAttendanceReportSummaryWithOptions = (params = {}, options = {}) => {
  const qs = new URLSearchParams(params).toString();
  const path = qs ? `attendance/reports/summary?${qs}` : 'attendance/reports/summary';
  return http.fetchJson(path, options);
};

export const getAttendanceReportDetails = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const path = qs ? `attendance/reports/details?${qs}` : 'attendance/reports/details';
  return http.fetchJson(path);
};

export const getAttendanceReportDetailsWithOptions = (params = {}, options = {}) => {
  const qs = new URLSearchParams(params).toString();
  const path = qs ? `attendance/reports/details?${qs}` : 'attendance/reports/details';
  return http.fetchJson(path, options);
};

export const getAttendanceReportStudentRangeWithOptions = (params = {}, options = {}) => {
  const qs = new URLSearchParams(params).toString();
  const path = qs ? `attendance/reports/student-range?${qs}` : 'attendance/reports/student-range';
  return http.fetchJson(path, options);
};
