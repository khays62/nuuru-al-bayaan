// modules/exams.js
// Exams API (moved from apiService.js)
import { fetchJson, apiUrl } from '../../../shared/api/http';

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

export async function getExamTypes(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params?.templateVersion) query.append('templateVersion', String(params.templateVersion));
    if (params?.academicYearId) query.append('academicYearId', String(params.academicYearId));
    if (params?.gradeSectionId) query.append('gradeSectionId', String(params.gradeSectionId));
    const qs = query.toString();
    return await fetchJson(`${apiUrl('/exams/types')}${qs ? `?${qs}` : ''}`);
  } catch {
    // Avoid noisy console logs on logout/unauth.
    return [];
  }
}

export async function getExamTemplateVersions(opts = {}) {
  try {
    const data = await fetchJson('/exams/template/versions', {
      cache: 'no-store',
      signal: opts?.signal,
    });
    return { ok: true, data };
  } catch (e) {
    if (e?.name === 'AbortError') return { ok: false, error: 'Aborted' };
    return { ok: false, error: 'Network or server error' };
  }
}

export async function getExamTemplateDetail(templateVersion, opts = {}) {
  try {
    const query = new URLSearchParams();
    if (templateVersion) query.append('templateVersion', String(templateVersion));
    const qs = query.toString();
    const data = await fetchJson(`${apiUrl('/exams/template/detail')}${qs ? `?${qs}` : ''}`, {
      cache: 'no-store',
      signal: opts?.signal,
    });
    return { ok: true, data };
  } catch (e) {
    if (e?.name === 'AbortError') return { ok: false, error: 'Aborted' };
    return { ok: false, error: 'Network or server error' };
  }
}

export async function setExamTemplateTotal({ templateVersion, templateTotal }) {
  try {
    const data = await fetchJson('/exams/template/total', {
      method: 'PUT',
      body: JSON.stringify({ templateVersion, templateTotal }),
    });
    return { ok: true, status: 200, data };
  } catch (e) {
    return { ok: false, status: e?.status || 0, data: e?.data || { message: e?.message || 'Network error' } };
  }
}

export async function createExamTemplateComponent({ templateVersion, typeName, maxScore, order }) {
  try {
    const data = await fetchJson('/exams/template/component', {
      method: 'POST',
      body: JSON.stringify({ templateVersion, typeName, maxScore, order }),
    });
    return { ok: true, status: 200, data };
  } catch (e) {
    return { ok: false, status: e?.status || 0, data: e?.data || { message: e?.message || 'Network error' } };
  }
}

export async function updateExamTemplateComponent({ id, typeName, maxScore, order }) {
  try {
    const data = await fetchJson(`/exams/template/component/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ typeName, maxScore, order }),
    });
    return { ok: true, status: 200, data };
  } catch (e) {
    return { ok: false, status: e?.status || 0, data: e?.data || { message: e?.message || 'Network error' } };
  }
}

export async function cloneExamTemplateVersion(fromVersion) {
  try {
    const data = await fetchJson('/exams/template/clone', {
      method: 'POST',
      body: JSON.stringify({ fromVersion }),
    });
    return { ok: true, status: 200, data };
  } catch (e) {
    return { ok: false, status: e?.status || 0, data: e?.data || { message: e?.message || 'Network error' } };
  }
}

export async function setActiveExamTemplateVersion(templateVersion) {
  try {
    const data = await fetchJson('/exams/template/active', {
      method: 'PUT',
      body: JSON.stringify({ templateVersion }),
    });
    return { ok: true, status: 200, data };
  } catch (e) {
    return { ok: false, status: e?.status || 0, data: e?.data || { message: e?.message || 'Network error' } };
  }
}

export async function deleteExamTemplateComponent(id) {
  try {
    const data = await fetchJson(`/exams/template/component/${id}`, { method: 'DELETE' });
    return { ok: true, status: 200, data };
  } catch (e) {
    return { ok: false, status: e?.status || 0, data: e?.data || { message: e?.message || 'Network error' } };
  }
}

export async function deleteExamTemplateVersion(templateVersion) {
  try {
    const data = await fetchJson(`/exams/template/version/${templateVersion}`, { method: 'DELETE' });
    return { ok: true, status: 200, data };
  } catch (e) {
    return { ok: false, status: e?.status || 0, data: e?.data || { message: e?.message || 'Network error' } };
  }
}

export async function getExamGrid(
  { academicYearId, gradeSectionId, subjectId, enrollmentStatus, cohortId, templateVersion },
  opts = {}
) {
  try {
    const query = new URLSearchParams({ academicYearId, gradeSectionId, subjectId });
    if (enrollmentStatus) query.append('enrollmentStatus', enrollmentStatus);
    if (cohortId) query.append('cohortId', cohortId);
    if (templateVersion) query.append('templateVersion', String(templateVersion));
    const data = await fetchJson(`${apiUrl('/exams/grid')}?${query.toString()}`, { cache: 'no-store', signal: opts?.signal });
    return { ok: true, data };
  } catch {
    // Avoid noisy console logs on logout/unauth.
    return { ok: false, error: 'Network or server error' };
  }
}

export async function saveExamScore({ studentId, examId, subjectId, scoreObtained }) {
  try {
    const data = await fetchJson('/exams/score', {
      method: 'PUT',
      body: JSON.stringify({ studentId, examId, subjectId, scoreObtained }),
    });
    return { ok: true, status: 200, data };
  } catch (e) {
    // Avoid noisy console logs on logout/unauth.
    return { ok: false, status: e?.status || 0, data: e?.data || { message: e?.message || 'Network error' } };
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
    const data = await fetchJson(`${apiUrl('/exams/summary')}${qs ? `?${qs}` : ''}`, { signal });
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
    const data = await fetchJson(`${apiUrl('/exams/has-scores')}${qs ? `?${qs}` : ''}`, { signal, cache: 'no-store' });
    return { ok: true, data };
  } catch (e) {
    if (e?.name === 'AbortError') return { ok: false, error: 'aborted' };
    if (!isExpectedAuthOrAbortError(e)) {
      // Keep console clean on logout.
    }
    return { ok: false, error: e?.message || 'Network or server error' };
  }
}
