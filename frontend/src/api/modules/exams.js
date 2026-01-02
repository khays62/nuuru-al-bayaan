// modules/exams.js
// Exams API (moved from apiService.js)
import { fetchJson, apiUrl } from '../http';

function isExpectedAuthOrAbortError(e) {
  const status = e?.status;
  const msg = String(e?.message || '').toLowerCase();
  return (
    e?.name === 'AbortError' ||
    status === 401 ||
    status === 403 ||
    msg.includes('no token') ||
    msg.includes('not authorized') ||
    msg.includes('access denied')
  );
}

export async function getExamTypes() {
  try {
    return await fetchJson('/exams/types');
  } catch (e) {
    // Avoid noisy console logs on logout/unauth.
    return [];
  }
}

export async function getExamGrid({ academicYearId, gradeSectionId, subjectId, enrollmentStatus, cohortId }) {
  try {
    const query = new URLSearchParams({ academicYearId, gradeSectionId, subjectId });
    if (enrollmentStatus) query.append('enrollmentStatus', enrollmentStatus);
    if (cohortId) query.append('cohortId', cohortId);
    const data = await fetchJson(`${apiUrl('/exams/grid')}?${query.toString()}`, { cache: 'no-store' });
    return { ok: true, data };
  } catch (e) {
    // Avoid noisy console logs on logout/unauth.
    return { ok: false, error: 'Network or server error' };
  }
}

export async function saveExamScore({ studentId, examId, subjectId, scoreObtained }) {
  try {
    const res = await fetch(apiUrl('/exams/score'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, examId, subjectId, scoreObtained }),
      credentials: 'include'
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    // Avoid noisy console logs on logout/unauth.
    return { ok: false, status: 0, data: { message: 'Network error' } };
  }
}

export async function getExamSummary(params = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const qs = query.toString();
    const data = await fetchJson(`${apiUrl('/exams/summary')}${qs ? `?${qs}` : ''}`);
    return { ok: true, data };
  } catch (e) {
    if (!isExpectedAuthOrAbortError(e)) {
      // Keep console clean on logout; unexpected errors can be surfaced by UI.
    }
    return { ok: false, error: e?.message || 'Network or server error' };
  }
}

export async function getExamSummaryAbort(params = {}, opts = {}) {
  const { signal } = opts;
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const qs = query.toString();
    const res = await fetch(`${apiUrl('/exams/summary')}${qs ? `?${qs}` : ''}`, { signal, credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch summary');
    return { ok: true, data };
  } catch (e) {
    if (e?.name === 'AbortError') return { ok: false, error: 'aborted' };
    if (!isExpectedAuthOrAbortError(e)) {
      // Keep console clean on logout.
    }
    return { ok: false, error: e?.message || 'Network or server error' };
  }
}

export async function getStudentTranscript(params = {}, opts = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const qs = query.toString();
    const data = await fetchJson(`${apiUrl('/exams/transcript')}${qs ? `?${qs}` : ''}`, { signal: opts?.signal });
    return { ok: true, data };
  } catch (e) {
    if (!isExpectedAuthOrAbortError(e)) {
      // Keep console clean on logout.
    }
    return { ok: false, error: e?.message || 'Network or server error' };
  }
}

// Check if a set of subjects have scores recorded for a GradeSection (and optional AY)
export async function hasScores(params = {}, opts = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const qs = query.toString();
    const { signal } = opts;
  const res = await fetch(`${apiUrl('/exams/has-scores')}${qs ? `?${qs}` : ''}`, { signal, cache: 'no-store', credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Failed to check has-scores');
    return { ok: true, data };
  } catch (e) {
    if (e?.name === 'AbortError') return { ok: false, error: 'aborted' };
    if (!isExpectedAuthOrAbortError(e)) {
      // Keep console clean on logout.
    }
    return { ok: false, error: e?.message || 'Network or server error' };
  }
}
