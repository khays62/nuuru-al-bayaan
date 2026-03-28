import { fetchJson } from '../../../shared/api/http';

export const listTeachers = (params = {}, options = {}) => {
  const qs = new URLSearchParams(params).toString();
  const path = qs ? `teachers?${qs}` : 'teachers';
  return fetchJson(path, options);
};

export const getTeacherProfile = (teacherId, options = {}) => {
  return fetchJson(`teachers/${teacherId}`, options);
};

export const getTeacherAuditLogs = (teacherId, params = {}, options = {}) => {
  const qs = new URLSearchParams(params).toString();
  const path = qs ? `teachers/${teacherId}/logs?${qs}` : `teachers/${teacherId}/logs`;
  return fetchJson(path, options);
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

export const createTeacher = (payload, photoFile = null) => {
  const file = photoFile instanceof File ? photoFile : null;
  if (!file) {
    return fetchJson('teachers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  const fd = new FormData();
  Object.entries(payload || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (k === 'idDocument') {
      fd.append(k, JSON.stringify(v));
      return;
    }
    if (typeof v === 'boolean') {
      fd.append(k, v ? 'true' : 'false');
      return;
    }
    fd.append(k, String(v));
  });
  fd.append('photo', file);
  return fetchJson('teachers', { method: 'POST', body: fd });
};

export const updateTeacher = (id, payload, photoFile = null) => {
  const file = photoFile instanceof File ? photoFile : null;
  if (!file) {
    return fetchJson(`teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  const fd = new FormData();
  Object.entries(payload || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (k === 'idDocument') {
      fd.append(k, JSON.stringify(v));
      return;
    }
    if (typeof v === 'boolean') {
      fd.append(k, v ? 'true' : 'false');
      return;
    }
    fd.append(k, String(v));
  });
  fd.append('photo', file);
  return fetchJson(`teachers/${id}`, { method: 'PUT', body: fd });
};

export const deactivateTeacher = (id) =>
  fetchJson(`teachers/${id}/deactivate`, {
    method: 'PATCH',
  });

export const reactivateTeacher = (id) =>
  fetchJson(`teachers/${id}/reactivate`, {
    method: 'PATCH',
  });

export const resetTeacherPassword = (id) =>
  fetchJson(`teachers/${id}/reset-password`, {
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

export const uploadTeacherPhoto = (teacherId, file) => {
  const fd = new FormData();
  fd.append('photo', file);
  return fetchJson(`teachers/${teacherId}/photo`, {
    method: 'POST',
    body: fd,
  });
};
