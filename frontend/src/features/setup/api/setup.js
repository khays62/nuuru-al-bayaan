import { fetchJson } from '../../../shared/api/http.js';

// Grades
export async function listSetupGrades() {
  return fetchJson('/setup/grades');
}
export async function createSetupGrade(payload) {
  return fetchJson('/setup/grades', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
export async function updateSetupGrade(id, payload) {
  return fetchJson(`/setup/grades/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
export async function deleteSetupGrade(id) {
  return fetchJson(`/setup/grades/${id}`, {
    method: 'DELETE',
  });
}

// Shifts
export async function listSetupShifts() {
  return fetchJson('/setup/shifts');
}
export async function createSetupShift(payload) {
  return fetchJson('/setup/shifts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
export async function updateSetupShift(id, payload) {
  return fetchJson(`/setup/shifts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
export async function deleteSetupShift(id) {
  return fetchJson(`/setup/shifts/${id}`, {
    method: 'DELETE',
  });
}

// Academic Years
export async function listSetupAcademicYears() {
  return fetchJson('/setup/academic-years');
}
export async function createSetupAcademicYear(payload) {
  return fetchJson('/setup/academic-years', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
export async function updateSetupAcademicYear(id, payload) {
  return fetchJson(`/setup/academic-years/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
export async function deleteSetupAcademicYear(id) {
  return fetchJson(`/setup/academic-years/${id}`, {
    method: 'DELETE',
  });
}
