import { http } from '../http';

export const markAttendanceBulk = (payload) =>
	http.fetchJson('attendance/mark', {
		method: 'POST',
		body: JSON.stringify(payload),
		headers: { 'Content-Type': 'application/json' },
	});

export const getAttendance = (params = {}) => {
	const qs = new URLSearchParams(params).toString();
	const path = qs ? `attendance?${qs}` : 'attendance';
	return http.fetchJson(path);
};
