import { fetchJson } from '../../../shared/api/http';

export const listTeachers = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const path = qs ? `teachers?${qs}` : 'teachers';
  return fetchJson(path);
};

export const getAssignments = (teacherId, params = {}, options = {}) => {
  const qs = new URLSearchParams(params).toString();
  const path = qs ? `teachers/${teacherId}/assignments?${qs}` : `teachers/${teacherId}/assignments`;
  return fetchJson(path, options);
};

export const getRoster = (teacherId, params = {}, options = {}) => {
  const qs = new URLSearchParams(params).toString();
  const path = qs ? `teachers/${teacherId}/roster?${qs}` : `teachers/${teacherId}/roster`;
  return fetchJson(path, options);
};

export const createTeacher = (payload) =>
  fetchJson('teachers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateTeacher = (id, payload) =>
  fetchJson(`teachers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const deactivateTeacher = (id) =>
  fetchJson(`teachers/${id}/deactivate`, {
    method: 'PATCH',
  });

export const reactivateTeacher = (id) =>
  fetchJson(`teachers/${id}/reactivate`, {
    method: 'PATCH',
  });

export const deleteTeacher = (id) =>
  fetchJson(`teachers/${id}`, { method: 'DELETE' });

export const addAssignment = (teacherId, payload) =>
  fetchJson(`teachers/${teacherId}/assignments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const removeAssignment = (teacherId, assignmentId) =>
  fetchJson(`teachers/${teacherId}/assignments/${assignmentId}`, {
    method: 'DELETE',
  });
