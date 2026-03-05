// features/students/api/studentFinance.js
// Read-only student finance endpoints for student-self dashboard and staff/admin student dashboard.

import { apiUrl, fetchJson } from '../../../shared/api/http';

function shouldLogStudentFinanceApiErrors() {
  try {
    return Boolean(import.meta?.env?.DEV) || localStorage.getItem('debug:studentFinanceApi') === '1';
  } catch {
    return false;
  }
}

export async function getStudentFinanceMonthHistory(studentId, params = {}, opts = {}) {
  const id = String(studentId || '').trim();
  if (!id) return { studentId: null, academicYearId: null, rows: [] };

  try {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const qs = query.toString();

    const data = await fetchJson(`${apiUrl(`/finance/student/${id}/month-history`)}${qs ? `?${qs}` : ''}`,
      { signal: opts?.signal }
    );
    return data || { studentId: id, academicYearId: null, rows: [] };
  } catch (e) {
    if (e?.name !== 'AbortError' && shouldLogStudentFinanceApiErrors()) {
      console.error('Failed to load student finance month history', e);
    }
    return { studentId: id, academicYearId: params?.academicYearId || null, rows: [] };
  }
}
