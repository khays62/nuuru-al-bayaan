import { http } from '../http';

export const listTeachers = (params = {}) => {
	const qs = new URLSearchParams(params).toString();
	const path = qs ? `teachers?${qs}` : 'teachers';
	return http.fetchJson(path);
};

export const getAssignments = (teacherId, params = {}) => {
	const qs = new URLSearchParams(params).toString();
	const path = qs ? `teachers/${teacherId}/assignments?${qs}` : `teachers/${teacherId}/assignments`;
	return http.fetchJson(path);
};

export const getRoster = (teacherId, params = {}) => {
	const qs = new URLSearchParams(params).toString();
	const path = qs ? `teachers/${teacherId}/roster?${qs}` : `teachers/${teacherId}/roster`;
	return http.fetchJson(path);
};

export const createTeacher = (payload) =>
	http.fetchJson('teachers', {
		method: 'POST',
		body: JSON.stringify(payload),
	});

export const updateTeacher = (id, payload) =>
	http.fetchJson(`teachers/${id}`, {
		method: 'PUT',
		body: JSON.stringify(payload),
	});

export const deleteTeacher = (id) =>
	http.fetchJson(`teachers/${id}`, { method: 'DELETE' });

export const addAssignment = (teacherId, payload) =>
	http.fetchJson(`teachers/${teacherId}/assignments`, {
		method: 'POST',
		body: JSON.stringify(payload),
	});

export const removeAssignment = (teacherId, assignmentId) =>
	http.fetchJson(`teachers/${teacherId}/assignments/${assignmentId}`, {
		method: 'DELETE',
	});
