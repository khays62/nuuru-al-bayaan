// modules/lookups.js
// Lookups with lightweight caching (grades, academic years, shifts)
import { fetchJson } from '../http';

// --- Grades (cached) ---
let __gradesCache = null;
let __gradesInFlight = null;
export async function getGrades(options = {}) {
  const { force = false } = options;
  try {
    if (!force) {
      if (__gradesCache) return __gradesCache;
      if (__gradesInFlight) return __gradesInFlight;
    }
    __gradesInFlight = fetchJson('/lookups/grades')
      .then((data) => { __gradesCache = data; __gradesInFlight = null; return data; })
      .catch(err => { __gradesInFlight = null; throw err; });
    return await __gradesInFlight;
  } catch (error) {
    console.error('Failed to fetch grades:', error);
    return [];
  }
}
export function invalidateGradesCache() { __gradesCache = null; }

// --- Academic Years (cached) ---
export async function getAcademicYears() {
  try {
    if (getAcademicYears.__cache) return getAcademicYears.__cache;
    if (getAcademicYears.__inFlight) return getAcademicYears.__inFlight;
    getAcademicYears.__inFlight = fetchJson('/lookups/academic-years')
      .then((data) => { getAcademicYears.__cache = data; getAcademicYears.__inFlight = null; return data; })
      .catch(err => { getAcademicYears.__inFlight = null; throw err; });
    return await getAcademicYears.__inFlight;
  } catch (error) {
    console.error('Failed to fetch academic years:', error);
    return [];
  }
}
export function invalidateAcademicYearsCache() { getAcademicYears.__cache = null; }

// --- Shifts (cached) ---
export async function getShifts() {
  try {
    if (getShifts.__cache) return getShifts.__cache;
    if (getShifts.__inFlight) return getShifts.__inFlight;
    getShifts.__inFlight = fetchJson('/lookups/shifts')
      .then((data) => { getShifts.__cache = data; getShifts.__inFlight = null; return data; })
      .catch(err => { getShifts.__inFlight = null; throw err; });
    return await getShifts.__inFlight;
  } catch (error) {
    console.error('Failed to fetch shifts:', error);
    return [];
  }
}
export function invalidateShiftsCache() { getShifts.__cache = null; }
