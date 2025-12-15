// // modules/exams.js
// // Exams API (moved from apiService.js)
// import { fetchJson, apiUrl } from '../http';

// export async function getExamTypes() {
//   try {
//     return await fetchJson('/exams/types');
//   } catch (e) {
//     console.error('Failed to fetch exam types', e);
//     return [];
//   }
// }

// export async function getExamGrid({ academicYearId, gradeSectionId, subjectId }) {
//   try {
//     const query = new URLSearchParams({ academicYearId, gradeSectionId, subjectId });
//     const data = await fetchJson(`${apiUrl('/exams/grid')}?${query.toString()}`, { cache: 'no-store' });
//     return { ok: true, data };
//   } catch (e) {
//     console.error('Failed to fetch exam grid', e);
//     return { ok: false, error: 'Network or server error' };
//   }
// }

// export async function saveExamScore({ studentId, examId, subjectId, scoreObtained }) {
//   try {
//     const res = await fetch(apiUrl('/exams/score'), {
//       method: 'PUT',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ studentId, examId, subjectId, scoreObtained })
//     });
//     const data = await res.json().catch(() => ({}));
//     return { ok: res.ok, status: res.status, data };
//   } catch (e) {
//     console.error('Failed to save exam score', e);
//     return { ok: false, status: 0, data: { message: 'Network error' } };
//   }
// }

// export async function getExamSummary(params = {}) {
//   try {
//     const query = new URLSearchParams();
//     Object.entries(params).forEach(([k, v]) => {
//       if (v !== undefined && v !== null && v !== '') query.append(k, v);
//     });
//     const qs = query.toString();
//     const data = await fetchJson(`${apiUrl('/exams/summary')}${qs ? `?${qs}` : ''}`);
//     return { ok: true, data };
//   } catch (e) {
//     console.error('Failed to fetch exam summary', e);
//     return { ok: false, error: e?.message || 'Network or server error' };
//   }
// }

// export async function getExamSummaryAbort(params = {}, opts = {}) {
//   const { signal } = opts;
//   try {
//     const query = new URLSearchParams();
//     Object.entries(params).forEach(([k, v]) => {
//       if (v !== undefined && v !== null && v !== '') query.append(k, v);
//     });
//     const qs = query.toString();
//     const res = await fetch(`${apiUrl('/exams/summary')}${qs ? `?${qs}` : ''}`, { signal });
//     const data = await res.json().catch(() => ({}));
//     if (!res.ok) throw new Error(data?.message || 'Failed to fetch summary');
//     return { ok: true, data };
//   } catch (e) {
//     if (e?.name === 'AbortError') return { ok: false, error: 'aborted' };
//     console.error('Failed to fetch exam summary (abort)', e);
//     return { ok: false, error: e?.message || 'Network or server error' };
//   }
// }

// export async function getStudentTranscript(params = {}) {
//   try {
//     const query = new URLSearchParams();
//     Object.entries(params).forEach(([k, v]) => {
//       if (v !== undefined && v !== null && v !== '') query.append(k, v);
//     });
//     const qs = query.toString();
//     const data = await fetchJson(`${apiUrl('/exams/transcript')}${qs ? `?${qs}` : ''}`);
//     return { ok: true, data };
//   } catch (e) {
//     console.error('Failed to fetch transcript', e);
//     return { ok: false, error: e?.message || 'Network or server error' };
//   }
// }

// // Check if a set of subjects have scores recorded for a GradeSection (and optional AY)
// export async function hasScores(params = {}, opts = {}) {
//   try {
//     const query = new URLSearchParams();
//     Object.entries(params).forEach(([k, v]) => {
//       if (v !== undefined && v !== null && v !== '') query.append(k, v);
//     });
//     const qs = query.toString();
//     const { signal } = opts;
//   const res = await fetch(`${apiUrl('/exams/has-scores')}${qs ? `?${qs}` : ''}`, { signal, cache: 'no-store' });
//     const data = await res.json().catch(() => ({}));
//     if (!res.ok) throw new Error(data?.message || 'Failed to check has-scores');
//     return { ok: true, data };
//   } catch (e) {
//     if (e?.name === 'AbortError') return { ok: false, error: 'aborted' };
//     console.error('Failed to check has-scores', e);
//     return { ok: false, error: e?.message || 'Network or server error' };
//   }
// }


// modules/exams.js
import { fetchJson, apiUrl } from "../http";

/* -------------------------------------------------------------
   Get all exam types
------------------------------------------------------------- */


export async function getExamTypes() {
  try {
    return await fetchJson(apiUrl("/exams/types"), {
      credentials: "include",
    });
  } catch (err) {
    console.error("Failed to load exam types:", err);
    return { data: [] };
  }
}

/* -------------------------------------------------------------
   Check if exam scores exist
------------------------------------------------------------- */
export async function hasScores(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${apiUrl("/exams/has-scores")}${query ? `?${query}` : ""}`;

  try {
    return await fetchJson(url, { credentials: "include" });
  } catch (err) {
    console.error("Failed to check score status:", err);
    return { exists: false };
  }
}

/* -------------------------------------------------------------
   Ensure exams exist (create if missing)
------------------------------------------------------------- */
export async function ensureExams(payload) {
  try {
    const res = await fetch(apiUrl("/exams/ensure"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return await res.json();
  } catch (err) {
    console.error("Failed to ensure exams:", err);
    return { error: "Network error" };
  }
}

/* -------------------------------------------------------------
   Get exam grid
------------------------------------------------------------- */
// export async function getExamGrid(params = {}) {
//   const query = new URLSearchParams(params).toString();
//   const url = `${apiUrl("/exams/grid")}${query ? `?${query}` : ""}`;

//   try {
//     return await fetchJson(url, { credentials: "include" });
//   } catch (err) {
//     console.error("Failed to load exam grid:", err);
//     return { data: [] };
//   }
// }


// export async function getExamGrid(params = {}) {
//   console.log("Exam grid params sent:", params);

//   const query = new URLSearchParams(params).toString();
//   const url = `${apiUrl("/exams/grid")}${query ? `?${query}` : ""}`;
//   try {

//     return await fetch(url, {
//       method: "GET",
//       credentials: "include",
//       cache: "no-store",
//     })
//       .then(res => res.json());
    
//     // return await fetchJson(url, { credentials: "include" });
//   } catch (err) {
//     console.error("Failed to load exam grid:", err);
//     return { data: [] };
//   }
// }

// export async function getExamGrid(params = {}) {
//   console.log("Exam grid params sent:", params);

//   const query = new URLSearchParams(params).toString();
//   const url = `${apiUrl("/exams/grid")}${query ? `?${query}` : ""}`;
//   try {
//     const res = await fetch(url, {
//       method: "GET",
//       credentials: "include",
//       cache: "no-store",
//     });
//     const data = await res.json();
//     return { ok: true, data }; // wrap in ok/data
//   } catch (err) {
//     console.error("Failed to load exam grid:", err);
//     return { ok: false, error: err.message || "Unknown error" };
//   }
// }

export async function getExamGrid({ 
  academicYearId, 
  gradeSectionId, 
  subjectId, 
  enrollmentStatus, 
  cohortId 
}) {
  try {
    // Build query params
    const query = new URLSearchParams({ academicYearId, gradeSectionId, subjectId });
    if (enrollmentStatus) query.append("enrollmentStatus", enrollmentStatus);
    if (cohortId) query.append("cohortId", cohortId);

    const url = `${apiUrl("/exams/grid")}?${query.toString()}`;

    // 🔥 Proper fetch (like your commented example)
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    // Handle non-200 responses
    if (!res.ok) {
      return {
        ok: false,
        error: `Server error: ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      ok: true,
      data,
    };
  } catch (err) {
    console.error("Failed to load exam grid:", err);
    return {
      ok: false,
      error: err.message || "Unknown error",
    };
  }
}

/* -------------------------------------------------------------
   Upsert a score (update or insert)
------------------------------------------------------------- */
export async function upsertScore(payload) {
  try {
    const res = await fetch(apiUrl("/exams/score"), {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return await res.json();
  } catch (err) {
    console.error("Failed to upsert score:", err);
    return { error: "Network error" };
  }
}

/* -------------------------------------------------------------
   Get summary report
------------------------------------------------------------- */
export async function getSummary(params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${apiUrl("/exams/summary")}${query ? `?${query}` : ""}`;

  try {
    return await fetchJson(url, { credentials: "include" });
  } catch (err) {
    console.error("Failed to load exam summary:", err);
    return { data: [] };
  }
}

/* -------------------------------------------------------------
   Get transcript
------------------------------------------------------------- */
// export async function getTranscript(params = {}) {
//   const query = new URLSearchParams(params).toString();
//   const url = `${apiUrl("/exams/transcript")}${query ? `?${query}` : ""}`;

//   try {
//     return await fetchJson(url, { credentials: "include" });
//   } catch (err) {
//     console.error("Failed to load transcript:", err);
//     return { data: null };
//   }
// }


export async function getTranscript(params = {}) {
  try {
    // Build query string safely
    const query = new URLSearchParams(params).toString();

    const url = `${apiUrl("/exams/transcript")}${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Transcript fetch failed:", response.status);
      return { data: null, error: true };
    }

    const data = await response.json();
    return { data, error: false };

  } catch (err) {
    console.error("Failed to load transcript:", err);
    return { data: null, error: true };
  }
}


export async function getStudentTranscript(params = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });

    const qs = query.toString();
    const url = `${apiUrl('/exams/transcript')}${qs ? `?${qs}` : ''}`;

    const data = await fetchJson(url, {
      credentials: 'include'
    });

    return { ok: true, data };
  } catch (e) {
    console.error('Failed to fetch transcript', e);
    return { ok: false, error: e?.message || 'Network or server error' };
  }
}



export async function saveExamScore({ studentId, examId, subjectId, scoreObtained }) {
  try {
    const res = await fetch(apiUrl('/exams/score'), {
      method: 'PUT',
      credentials: 'include',
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



export async function getExamSummaryAbort(params = {}, opts = {}) {
  const { signal } = opts;

  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });

    const qs = query.toString();
    const url = `${apiUrl('/exams/summary')}${qs ? `?${qs}` : ''}`;

    // ❗ FIX: merge BOTH signal + credentials inside the same object
    const res = await fetch(url, {
      signal,
      credentials: 'include'
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.message || 'Failed to fetch summary');
    }

    return { ok: true, data };
  } catch (e) {
    if (e?.name === 'AbortError') {
      return { ok: false, error: 'aborted' };
    }
    console.error('Failed to fetch exam summary (abort)', e);
    return { ok: false, error: e?.message || 'Network or server error' };
  }
}







// export async function getStudentTranscript(params = {}) {
//   try {
//     const query = new URLSearchParams();
//     Object.entries(params).forEach(([k, v]) => {
//       if (v !== undefined && v !== null && v !== '') query.append(k, v);
//     });
//     const qs = query.toString();
//     const data = await fetchJson(`${apiUrl('/exams/transcript')}${qs ? `?${qs}` : ''}`, { credentials: 'include' });
//     return { ok: true, data };
//   } catch (e) {
//     console.error('Failed to fetch transcript', e);
//     return { ok: false, error: e?.message || 'Network or server error' };
//   }
// }


// export async function saveExamScore({ studentId, examId, subjectId, scoreObtained }) {
//   try {
//     const res = await fetch(apiUrl('/exams/score'), {
//       method: 'PUT',
//       credentials: 'include',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ studentId, examId, subjectId, scoreObtained })
//     });
//     const data = await res.json().catch(() => ({}));
//     return { ok: res.ok, status: res.status, data };
//   } catch (e) {
//     console.error('Failed to save exam score', e);
//     return { ok: false, status: 0, data: { message: 'Network error' } };
//   }
// }


// export async function getExamSummaryAbort(params = {}, opts = {}) {
//   const { signal } = opts;
//   try {
//     const query = new URLSearchParams();
//     Object.entries(params).forEach(([k, v]) => {
//       if (v !== undefined && v !== null && v !== '') query.append(k, v);
//     });
//     const qs = query.toString();
//     const res = await fetch(`${apiUrl('/exams/summary')}${qs ? `?${qs}` : ''}`, { signal }, { credentials: 'include' });
//     const data = await res.json().catch(() => ({}));
//     if (!res.ok) throw new Error(data?.message || 'Failed to fetch summary');
//     return { ok: true, data };
//   } catch (e) {
//     if (e?.name === 'AbortError') return { ok: false, error: 'aborted' };
//     console.error('Failed to fetch exam summary (abort)', e);
//     return { ok: false, error: e?.message || 'Network or server error' };
//   }
// }