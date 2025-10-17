// modules/exams.js
// Exams API (moved from apiService.js)
import { fetchJson, apiUrl } from '../http';

export async function getExamTypes() {
  try {
    return await fetchJson('/exams/types');
  } catch (e) {
    console.error('Failed to fetch exam types', e);
    return [];
  }
}

export async function getExamGrid({ academicYearId, gradeSectionId, subjectId }) {
  try {
    const query = new URLSearchParams({ academicYearId, gradeSectionId, subjectId });
    const data = await fetchJson(`${apiUrl('/exams/grid')}?${query.toString()}`, { cache: 'no-store' });
    return { ok: true, data };
  } catch (e) {
    console.error('Failed to fetch exam grid', e);
    return { ok: false, error: 'Network or server error' };
  }
}

export async function saveExamScore({ studentId, examId, subjectId, scoreObtained }) {
  try {
    const res = await fetch(apiUrl('/exams/score'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, examId, subjectId, scoreObtained })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    console.error('Failed to save exam score', e);
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
    console.error('Failed to fetch exam summary', e);
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
    const res = await fetch(`${apiUrl('/exams/summary')}${qs ? `?${qs}` : ''}`, { signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Failed to fetch summary');
    return { ok: true, data };
  } catch (e) {
    if (e?.name === 'AbortError') return { ok: false, error: 'aborted' };
    console.error('Failed to fetch exam summary (abort)', e);
    return { ok: false, error: e?.message || 'Network or server error' };
  }
}

export async function getStudentTranscript(params = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const qs = query.toString();
    const data = await fetchJson(`${apiUrl('/exams/transcript')}${qs ? `?${qs}` : ''}`);
    return { ok: true, data };
  } catch (e) {
    console.error('Failed to fetch transcript', e);
    return { ok: false, error: e?.message || 'Network or server error' };
  }
}
