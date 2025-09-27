import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { getGrades, getAcademicYears, getShifts, createGradeSection, updateGradeSection, getSubjects } from '../../api/apiService';
import { getCachedSubjects, setCachedSubjects, invalidateSubjectsCache } from './subjectsCache';

// Helper: turn array of ids from multi-select into array
function getSelectValues(selectEl) { return Array.from(selectEl.selectedOptions).map(o => o.value); }

const GradeForm = ({ cls, onClose, onSuccess }) => {
  const isEdit = Boolean(cls?._id);

  // We intentionally remove className from the UI; backend still requires it, so we default it under the hood
  const [capacity, setCapacity] = useState(cls?.capacity || '');
  const [section, setSection] = useState(cls?.section || '1');
  const [grade, setGrade] = useState(cls?.grade?._id || cls?.grade || '');
  const [academicYear, setAcademicYear] = useState(cls?.academicYear?._id || cls?.academicYear || '');
  const [shift, setShift] = useState(cls?.shift?._id || cls?.shift || '');
  const [subjects, setSubjects] = useState((cls?.subjects || []).map(s => s._id || s));

  const [grades, setGrades] = useState([]);
  const [years, setYears] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [gradeSubjects, setGradeSubjects] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pendingGradeRef = useRef(null);

  // Load lookups
  useEffect(() => {
    (async () => {
      const [g, y, s] = await Promise.all([
        getGrades(),
        getAcademicYears(),
        getShifts()
      ]);
      setGrades(g || []);
      setYears(y || []);
      setShifts(s || []);
    })();
  }, []);

  // Load subjects for selected grade
  useEffect(() => {
    if (!grade) { setGradeSubjects([]); return; }
    let cancelled = false;
    async function load() {
      const cached = getCachedSubjects(grade);
      if (cached) { if (!cancelled) setGradeSubjects(cached); return; }
      setLoadingSubs(true);
      try {
        const res = await getSubjects({ grade, limit: 1000, sort: 'subjectName:asc' });
        const list = res.data || [];
        setCachedSubjects(grade, list);
        if (!cancelled) setGradeSubjects(list);
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setLoadingSubs(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [grade]);

  // Live sync on subjects changes
  useEffect(() => {
    function onSubjectsChanged(e) {
      if (!grade) return;
      const impacted = e.detail?.gradeIds || [];
      if (impacted.includes(grade)) {
        invalidateSubjectsCache(grade);
        (async () => {
          try {
            setLoadingSubs(true);
            const res = await getSubjects({ grade, limit: 1000, sort: 'subjectName:asc' });
            const list = res.data || [];
            subjectsCache[grade] = list;
            setGradeSubjects(list);
          } catch(err) { console.error(err); } finally { setLoadingSubs(false); }
        })();
      }
    }
    window.addEventListener('subjects:changed', onSubjectsChanged);
    return () => window.removeEventListener('subjects:changed', onSubjectsChanged);
  }, [grade]);

  // Handle Grade Change confirm (if subjects already chosen)
  const onGradeChange = (e) => {
    const newGrade = e.target.value;
    if (subjects.length > 0 && newGrade !== grade) {
      pendingGradeRef.current = newGrade; setShowConfirm(true);
    } else { setGrade(newGrade); }
  };

  const confirmGradeChange = (proceed) => {
    if (proceed) {
      const newGrade = pendingGradeRef.current; setGrade(newGrade);
      if (subjects.length) { setSubjects([]); toast.success('Previous subjects cleared (grade changed)'); }
    }
    pendingGradeRef.current = null; setShowConfirm(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!grade || !academicYear || !shift || !section) { toast.error('Please fill all required fields'); return; }
    if (submitting) return; // guard double submit
    setSubmitting(true);
    // Derive a safe hidden className for backend compatibility
    const selectedGrade = grades.find(g => (g._id === grade));
    const gradeLabel = selectedGrade?.gradeName || 'Unnamed';
    const className = `Section (${gradeLabel})`;

    const payload = { className, section, capacity: capacity ? Number(capacity) : undefined, grade, academicYear, shift, subjects };
    let result;
    if (isEdit) {
      const res = await updateGradeSection(cls._id, payload);
      if (!res.ok) {
        if (res.code === 'CLASS_STRUCTURAL_LOCKED') {
          toast.error(`Update blocked: ${res.error}. (${(res.blocked||[]).join(', ')})`);
        } else {
          toast.error(res.error || 'Failed to update');
        }
        setSubmitting(false);
        return;
      }
      result = res.data;
    } else {
      const res = await createGradeSection(payload);
      if (!res.ok) { toast.error(res.error || 'Operation failed'); setSubmitting(false); return; }
      result = res.data;
    }

    if (result.removedSubjects && result.removedSubjects.length) {
      toast((t) => (
        <div>
          <div className="font-semibold mb-1">Removed subjects:</div>
          <ul className="list-disc ml-4 text-sm">
            {result.removedSubjects.map(r => <li key={r}>{r}</li>)}
          </ul>
        </div>
      ), { duration: 6000 });
    } else {
      toast.success(isEdit ? 'Updated' : 'Created');
    }

    onSuccess && onSuccess(result.data || result);
    setSubmitting(false);
    onClose();
  };

  const onSubjectsChange = (e) => { setSubjects(getSelectValues(e.target)); };

  return (
    <div className="relative">
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Section</label>
            <input disabled={submitting} value={section} onChange={e=>setSection(e.target.value)} type="text" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60" placeholder="e.g. 1, 2, A, B" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Academic Year</label>
            <select disabled={submitting} value={academicYear} onChange={e=>setAcademicYear(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60" required>
              <option value="">Select...</option>
              {years.map(y => <option key={y._id || y.yearName} value={y._id}>{y.yearName || y.label || y.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Grade</label>
            <select disabled={submitting} value={grade} onChange={onGradeChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60" required>
              <option value="">Select...</option>
              {grades.map(g => <option key={g._id || g.gradeName} value={g._id}>{g.gradeName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Shift</label>
            <select disabled={submitting} value={shift} onChange={e=>setShift(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60" required>
              <option value="">Select...</option>
              {shifts.map(s => <option key={s._id || s.shiftName} value={s._id}>{s.shiftName}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Subjects {loadingSubs && <span className="text-xs text-gray-400">(Loading...)</span>}</label>
            <select multiple disabled={submitting} value={subjects} onChange={onSubjectsChange} className="mt-1 block w-full px-3 py-2 h-40 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60">
              {gradeSubjects.map(sub => (
                <option key={sub._id} value={sub._id}>{sub.subjectName}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Hold Ctrl (Cmd on Mac) to select multiple.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Capacity</label>
            <input disabled={submitting} value={capacity} onChange={e=>setCapacity(e.target.value)} type="number" min={0} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" disabled={submitting} onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-60">Cancel</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2">
            {submitting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            )}
            {submitting ? (isEdit ? 'Updating...' : 'Saving...') : (isEdit ? 'Update' : 'Save')}
          </button>
        </div>
      </form>

      {showConfirm && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-md p-5 shadow-lg w-full max-w-sm">
            <h4 className="font-semibold mb-2">Change Grade?</h4>
            <p className="text-sm text-gray-600 mb-4">If you change the grade, all previously selected subjects will be cleared. Are you sure?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => confirmGradeChange(false)} className="px-3 py-1.5 text-sm rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
              <button onClick={() => confirmGradeChange(true)} className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700">Yes, change</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeForm;
