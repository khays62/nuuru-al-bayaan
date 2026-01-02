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

// Optional fetch options (e.g. { signal }) for cancellation.
export const getAttendanceWithOptions = (params = {}, options = {}) => {
	const qs = new URLSearchParams(params).toString();
	const path = qs ? `attendance?${qs}` : 'attendance';
	return http.fetchJson(path, options);
};

// Student self view (read-only): only entries that were taken/saved.
export const getStudentSelfAttendanceWithOptions = (params = {}, options = {}) => {
	const qs = new URLSearchParams(params).toString();
	const path = qs ? `attendance/student/self?${qs}` : 'attendance/student/self';
	return http.fetchJson(path, options);
};

// Staff/admin: view a specific student's attendance in the same "self" shape.
export const getStudentAttendanceSelfWithOptions = (studentId, params = {}, options = {}) => {
	const id = String(studentId || '').trim();
	const qs = new URLSearchParams(params).toString();
	const path = qs ? `attendance/student/${id}/self?${qs}` : `attendance/student/${id}/self`;
	return http.fetchJson(path, options);
};
