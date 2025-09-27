// Faylkan waa meesha dhexe ee aan kala hadalno backend-keena.
const API_BASE_URL = 'http://localhost:7000/api';

// --- Subject Functions ---
export const getSubjects = async (params = {}) => {
    try {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k,v]) => {
            if (v !== undefined && v !== null && v !== '') query.append(k, v);
        });
        const qs = query.toString();
        const response = await fetch(`${API_BASE_URL}/subjects${qs ? `?${qs}`: ''}`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json(); // { data, meta }
    } catch (error) {
        console.error('Failed to fetch subjects:', error);
        return { data: [], meta: { page:1, limit:10, total:0, totalPages:0 } };
    }
};

export const addSubject = async (subjectData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subjectData),
        });
        const data = await response.json();
        if (!response.ok) {
            return { error: data.message || 'Failed to create subject', field: data.field };
        }
        // Emit event for live sync (grades impacted)
        try {
            const gradeIds = (data.grades || []).map(g => (g._id || g));
            window.dispatchEvent(new CustomEvent('subjects:changed', { detail: { gradeIds } }));
        } catch(e) { /* no-op in SSR */ }
        return { data };
    } catch (error) {
        console.error('Failed to add subject:', error);
        return { error: 'Network or server error' };
    }
};

export const updateSubject = async (id, subjectData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/subjects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subjectData),
        });
        const data = await response.json();
        if (!response.ok) {
            return { error: data.message || 'Failed to update subject', field: data.field };
        }
        try {
            const gradeIds = (data.grades || []).map(g => (g._id || g));
            window.dispatchEvent(new CustomEvent('subjects:changed', { detail: { gradeIds } }));
        } catch(e) { /* ignore */ }
        return { data };
    } catch (error) {
        console.error('Failed to update subject:', error);
        return { error: 'Network or server error' };
    }
};

export const deleteSubject = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}/subjects/${id}`, { method: 'DELETE' });
        const data = await response.json().catch(()=>({}));
        if (!response.ok) {
            return { error: data.message || 'Failed to delete subject', details: data };
        }
        return { data };
    } catch (error) {
        console.error('Failed to delete subject:', error);
        return { error: 'Network or server error' };
    }
};

// --- Lookup Functions ---
// Shaqadan waxay si gaar ah ula soo baxaysaa liiska Grades-ka.
// ---- Grades (cached) ----
// React StrictMode mararka qaarkood wuxuu laba jeer wacaa effect-ka dev mode, si aan uga fogaanno
// laba request oo isku mid ah waxaan isticmaaleynaa cache + in-flight promise.
let __gradesCache = null;        // xogta la soo qaaday
let __gradesInFlight = null;     // promise socda hadda
export const getGrades = async (options = {}) => {
    const { force = false } = options;
    try {
        if (!force) {
            if (__gradesCache) return __gradesCache;       // xog hore
            if (__gradesInFlight) return __gradesInFlight; // sug request socda
        }
        __gradesInFlight = fetch(`${API_BASE_URL}/lookups/grades`)
            .then(async (response) => {
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                __gradesCache = data;
                __gradesInFlight = null;
                return data;
            })
            .catch(err => {
                __gradesInFlight = null;
                throw err;
            });
        return await __gradesInFlight;
    } catch (error) {
        console.error("Failed to fetch grades:", error);
        return [];
    }
};
export const invalidateGradesCache = () => { __gradesCache = null; };

export const getAcademicYears = async () => {
    try {
        if (getAcademicYears.__cache) return getAcademicYears.__cache;
        if (getAcademicYears.__inFlight) return getAcademicYears.__inFlight;
        getAcademicYears.__inFlight = fetch(`${API_BASE_URL}/lookups/academic-years`)
            .then(async (r) => {
                if (!r.ok) throw new Error('Network response was not ok');
                const data = await r.json();
                getAcademicYears.__cache = data;
                getAcademicYears.__inFlight = null;
                return data;
            })
            .catch(err => { getAcademicYears.__inFlight = null; throw err; });
        return await getAcademicYears.__inFlight;
    } catch (error) {
        console.error("Failed to fetch academic years:", error);
        return [];
    }
};
export const invalidateAcademicYearsCache = () => { getAcademicYears.__cache = null; };
export const getShifts = async () => {
    try {
        if (getShifts.__cache) return getShifts.__cache;
        if (getShifts.__inFlight) return getShifts.__inFlight;
        getShifts.__inFlight = fetch(`${API_BASE_URL}/lookups/shifts`)
            .then(async (r) => {
                if (!r.ok) throw new Error('Network response was not ok');
                const data = await r.json();
                getShifts.__cache = data;
                getShifts.__inFlight = null;
                return data;
            })
            .catch(err => { getShifts.__inFlight = null; throw err; });
        return await getShifts.__inFlight;
    } catch (error) {
        console.error("Failed to fetch shifts:", error);
        return [];
    }
};
export const invalidateShiftsCache = () => { getShifts.__cache = null; };
// Shaqadan waxay si gaar ah ula soo baxaysaa liiska fasallada.
 
// (Legacy Class API removed)

// --- Grade Sections (new) ---
export const listGradeSections = async (params = {}) => {
    try {
        const query = new URLSearchParams();
        const { sortBy, sortDir, ...rest } = params;
        if (sortBy) query.append('sort', `${sortBy}:${sortDir || 'asc'}`);
        Object.entries(rest).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') query.append(k, v); });
        const qs = query.toString();
    const response = await fetch(`${API_BASE_URL}/grades/sections${qs ? `?${qs}` : ''}` , { cache: 'no-store' });
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json(); // { data, meta }
    } catch (error) {
        console.error('Failed to fetch grade sections:', error);
        return { data: [], meta: { page:1, limit:10, total:0, totalPages:0 } };
    }
};
export const createGradeSection = async (payload) => {
    try {
        const res = await fetch(`${API_BASE_URL}/grades/sections`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) return { ok:false, error: data.message || 'Failed to create', code: data.code };
        return { ok:true, data };
    } catch (e) {
        console.error('Failed to create grade section', e);
        return { ok:false, error: 'Network or server error' };
    }
};
export const updateGradeSection = async (id, payload) => {
    try {
        const res = await fetch(`${API_BASE_URL}/grades/sections/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (!res.ok) return { ok:false, error: data.message || 'Failed to update', code: data.code, blocked: data.blocked };
        return { ok:true, data };
    } catch (e) {
        console.error('Failed to update grade section', e);
        return { ok:false, error: 'Network or server error' };
    }
};
export const deleteGradeSection = async (id) => {
    try {
        const res = await fetch(`${API_BASE_URL}/grades/sections/${id}`, { method: 'DELETE' });
        const data = await res.json().catch(()=>({}));
        if (!res.ok) return { ok:false, error: data.message || 'Failed to delete', code: data.code };
        return { ok:true, data };
    } catch (e) {
        console.error('Failed to delete grade section', e);
        return { ok:false, error: 'Network or server error' };
    }
};

// --- Student Functions ---
export const listStudents = async (params = {}) => {
    try {
        const query = new URLSearchParams();
        const { sortBy, sortDir, ...rest } = params;
        if (sortBy) query.append('sort', `${sortBy}:${sortDir || 'asc'}`);
        Object.entries(rest).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') query.append(k, v); });
        const qs = query.toString();
        const res = await fetch(`${API_BASE_URL}/students${qs ? `?${qs}`: ''}`);
        if (!res.ok) throw new Error('Failed list');
        return await res.json(); // { data, meta }
    } catch (e) {
        console.error('Failed to list students', e);
        return { data: [], meta: { page:1, limit:10, total:0, totalPages:0 } };
    }
};
export const createStudent = async (payload) => {
    const res = await fetch(`${API_BASE_URL}/students`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json().catch(()=>({}));
    return { ok: res.status === 201, status: res.status, data };
};
export const updateStudent = async (id, payload) => {
    const res = await fetch(`${API_BASE_URL}/students/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json().catch(()=>({}));
    return { ok: res.ok, status: res.status, data };
};
export const deactivateStudentApi = async (id) => {
    const res = await fetch(`${API_BASE_URL}/students/${id}/deactivate`, { method: 'PATCH' });
    const data = await res.json().catch(()=>({}));
    return { ok: res.ok, status: res.status, data };
};
export const reactivateStudentApi = async (id) => {
    const res = await fetch(`${API_BASE_URL}/students/${id}/reactivate`, { method: 'PATCH' });
    const data = await res.json().catch(()=>({}));
    return { ok: res.ok, status: res.status, data };
};
export const reassignEnrollmentApi = async (id, payload) => {
    const res = await fetch(`${API_BASE_URL}/students/${id}/enrollment/reassign`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json().catch(()=>({}));
    return { ok: res.ok, status: res.status, data };
};
export const getStudentProfile = async (id) => {
    try {
        const res = await fetch(`${API_BASE_URL}/students/${id}`);
        if (!res.ok) throw new Error('Profile fail');
        return await res.json();
    } catch(e) { console.error('Profile error', e); return null; }
};
export const getStudentHistory = async (id, params={}) => {
    try {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') query.append(k, v); });
        const qs = query.toString();
        const res = await fetch(`${API_BASE_URL}/students/${id}/history${qs ? `?${qs}`:''}`);
        if (!res.ok) throw new Error('History fail');
        return await res.json();
    } catch(e) { console.error('History error', e); return { data: [], meta: { page:1, limit:10, total:0, totalPages:0 } }; }
};
