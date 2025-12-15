// // modules/subjects.js
// // Subjects API (moved from apiService.js)
// import { fetchJson, apiUrl } from '../http';

// export async function getSubjects(params = {}) {
//   try {
//     const query = new URLSearchParams();
//     Object.entries(params).forEach(([k, v]) => {
//       if (v !== undefined && v !== null && v !== '') query.append(k, v);
//     });
//     const qs = query.toString();
//     const url = `${apiUrl('/subjects')}${qs ? `?${qs}` : ''}`;
//     const data = await fetchJson(url);
//     return data; // { data, meta }
//   } catch (error) {
//     console.error('Failed to fetch subjects:', error);
//     return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
//   }
// }

// export async function addSubject(subjectData) {
//   try {
//     const res = await fetch(apiUrl('/subjects'), {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(subjectData),
//     });
//     const data = await res.json();
//     if (!res.ok) {
//       return { error: data.message || 'Failed to create subject', field: data.field };
//     }
//     try {
//       const gradeIds = (data.grades || []).map(g => (g._id || g));
//       window.dispatchEvent(new CustomEvent('subjects:changed', { detail: { gradeIds } }));
//     } catch {
//       /* no-op */
//     }
//     return { data };
//   } catch (error) {
//     console.error('Failed to add subject:', error);
//     return { error: 'Network or server error' };
//   }
// }

// export async function updateSubject(id, subjectData) {
//   try {
//     const res = await fetch(apiUrl(`/subjects/${id}`), {
//       method: 'PUT',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(subjectData),
//     });
//     const data = await res.json();
//     if (!res.ok) {
//       return { error: data.message || 'Failed to update subject', field: data.field };
//     }
//     try {
//       const gradeIds = (data.grades || []).map(g => (g._id || g));
//       window.dispatchEvent(new CustomEvent('subjects:changed', { detail: { gradeIds } }));
//     } catch {
//       /* ignore */
//     }
//     return { data };
//   } catch (error) {
//     console.error('Failed to update subject:', error);
//     return { error: 'Network or server error' };
//   }
// }

// export async function deleteSubject(id) {
//   try {
//     const res = await fetch(apiUrl(`/subjects/${id}`), { method: 'DELETE' });
//     const data = await res.json().catch(() => ({}));
//     if (!res.ok) {
//       return { error: data.message || 'Failed to delete subject', details: data };
//     }
//     return { data };
//   } catch (error) {
//     console.error('Failed to delete subject:', error);
//     return { error: 'Network or server error' };
//   }
// }


// modules/subjects.js
import { fetchJson, apiUrl } from '../http';

// ------------------------- GET SUBJECTS -------------------------
export async function getSubjects(params = {}) {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const qs = query.toString();
    const url = `${apiUrl('/subjects')}${qs ? `?${qs}` : ''}`;

    const data = await fetchJson(url, {
      credentials: 'include'
    });

    return data;
  } catch (error) {
    console.error('Failed to fetch subjects:', error);
    return { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

// ------------------------- ADD SUBJECT -------------------------
export async function addSubject(subjectData) {
  try {
    const res = await fetch(apiUrl('/subjects'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(subjectData),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.message || 'Failed to create subject', field: data.field };
    }

    try {
      const gradeIds = (data.grades || []).map(g => g._id || g);
      window.dispatchEvent(new CustomEvent('subjects:changed', { detail: { gradeIds } }));
    } catch {}

    return { data };
  } catch (error) {
    console.error('Failed to add subject:', error);
    return { error: 'Network or server error' };
  }
}

// ------------------------- UPDATE SUBJECT -------------------------
export async function updateSubject(id, subjectData) {
  try {
    const res = await fetch(apiUrl(`/subjects/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(subjectData),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.message || 'Failed to update subject', field: data.field };
    }

    try {
      const gradeIds = (data.grades || []).map(g => g._id || g);
      window.dispatchEvent(new CustomEvent('subjects:changed', { detail: { gradeIds } }));
    } catch {}

    return { data };
  } catch (error) {
    console.error('Failed to update subject:', error);
    return { error: 'Network or server error' };
  }
}

// ------------------------- DELETE SUBJECT -------------------------
export async function deleteSubject(id) {
  try {
    const res = await fetch(apiUrl(`/subjects/${id}`), {
      method: 'DELETE',
      credentials: 'include'
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { error: data.message || 'Failed to delete subject', details: data };
    }

    return { data };
  } catch (error) {
    console.error('Failed to delete subject:', error);
    return { error: 'Network or server error' };
  }
}
