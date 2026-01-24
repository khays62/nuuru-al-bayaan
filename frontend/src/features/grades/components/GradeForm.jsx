import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { getGrades } from '../../lookups/api/lookups';
import { createGradeSection, updateGradeSection } from '../api/gradeSections';
import { getSubjects } from '../../subjects/api/subjects';
import { hasScores as apiHasScores } from '../../exams/api/exams';
import { Lock, RotateCcw } from 'lucide-react';
import GradeSelect from '../../lookups/components/GradeSelect';
import ShiftSelect from '../../lookups/components/ShiftSelect';
import { setCachedSubjects, invalidateSubjectsCache } from './subjectsCache';
import Button from '../../../shared/components/ui/Button.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox.jsx';
import Input from '../../../shared/components/ui/Input.jsx';


const GradeForm = ({ cls, onClose, onSuccess }) => {
  const isEdit = Boolean(cls?._id);

  // We intentionally remove className from the UI; backend still requires it, so we default it under the hood
  const [capacity, setCapacity] = useState(cls?.capacity || '');
  const [section, setSection] = useState(cls?.section || '');
  const [grade, setGrade] = useState(cls?.grade?._id || cls?.grade || '');
  const [shift, setShift] = useState(cls?.shift?._id || cls?.shift || '');
  const [subjects, setSubjects] = useState((cls?.subjects || []).map(s => s._id || s));
  // AY and Cohort removed from GS UI (AY/Cohort tracked in Enrollment)

  const [grades, setGrades] = useState([]);
  const [gradeSubjects, setGradeSubjects] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [hasScoreMap, setHasScoreMap] = useState({}); // subjectId -> boolean (has scores)
  const hasScoresAbortRef = useRef(null);
  const hasScoresTimerRef = useRef(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingPhase, setSubmittingPhase] = useState(''); // '', 'saving'
  const pendingGradeRef = useRef(null);
  const skipFirstGradeEffectRef = useRef(true); // avoid fetch on initial mount/open

  // Load lookups
  useEffect(() => {
    (async () => {
      const [g] = await Promise.all([
        getGrades(),
      ]);
      setGrades(g || []);
    })();
  }, []);

  // Helper: refresh subjects for current grade (force fresh)
  const refreshSubjects = async () => {
    if (!grade) { setGradeSubjects([]); return; }
    setLoadingSubs(true);
    try {
      invalidateSubjectsCache(grade);
      const res = await getSubjects({ grade, limit: 1000, sort: 'subjectName:asc' });
      const list = res.data || [];
      setCachedSubjects(grade, list);
      setGradeSubjects(list);
    } catch (e) { console.error(e); }
    finally { setLoadingSubs(false); }
  };

  // Load subjects only when user changes the grade (skip initial open)
  useEffect(() => {
    if (skipFirstGradeEffectRef.current) { skipFirstGradeEffectRef.current = false; return; }
    if (!grade) { setGradeSubjects([]); return; }
    void refreshSubjects();
  }, [grade]);

  // Removed auto live-sync via global events to avoid implicit network requests.

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
  if (!grade || !shift || !section) { toast.error('Please fill all required fields'); return; }
    if (submitting) return; // guard double submit
    setSubmitting(true);
    setSubmittingPhase('saving');
    // Derive a safe hidden className for backend compatibility
    const selectedGrade = grades.find(g => (g._id === grade));
    const gradeLabel = selectedGrade?.gradeName || 'Unnamed';
    const className = `Section (${gradeLabel})`;

    const payload = { className, section, capacity: capacity ? Number(capacity) : undefined, grade, shift, subjects };
    // No duplicate cohort assignment; rely on block above
    let result;
    if (isEdit) {
      const res = await updateGradeSection(cls._id, payload);
      if (!res.ok) {
        if (res.code === 'CLASS_STRUCTURAL_LOCKED') {
          toast.error(`Update blocked: ${res.error}. (${(res.blocked||[]).join(', ')})`);
        } else if (res.code === 'SUBJECTS_HAVE_SCORES') {
          const items = (res.blockedSubjects || []).map(s => s.subjectName || s._id).join(', ');
          toast.error(`Cannot remove subjects with scores: ${items}`);
        } else {
          toast.error(res.error || 'Failed to update');
        }
        setSubmitting(false);
        setSubmittingPhase('');
        return;
      }
      result = res.data;
    } else {
      const res = await createGradeSection(payload);
      if (!res.ok) {
        toast.error(res.error || 'Operation failed');
        setSubmitting(false);
        setSubmittingPhase('');
        return;
      }
      result = res.data;
    }

    if (result.removedSubjects && result.removedSubjects.length) {
      toast(() => (
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

    // No explicit resync UI; auto-handled above

    onSuccess && onSuccess(result.data || result);
    setSubmitting(false);
    setSubmittingPhase('');
    onClose();
  };

  // Toggle subject selection for checkbox list
  const toggleSubject = (id) => {
    setSubjects((prev) => {
      const has = prev.includes(id);
      // Prevent deselect if it has scores (guard in UI); backend will also enforce
      if (has && isEdit && hasScoreMap[id]) return prev;
      if (has) return prev.filter(s => s !== id);
      return [...prev, id];
    });
  };

  // Query has-scores for selected subjects in edit mode to disable deselection
  useEffect(() => {
    // Debounce and abort in-flight calls to reduce network noise
    if (!isEdit || !cls?._id || !subjects || subjects.length === 0) {
      setHasScoreMap({});
      if (hasScoresTimerRef.current) { clearTimeout(hasScoresTimerRef.current); hasScoresTimerRef.current = null; }
      if (hasScoresAbortRef.current) { hasScoresAbortRef.current.abort(); hasScoresAbortRef.current = null; }
      return;
    }
    if (hasScoresTimerRef.current) clearTimeout(hasScoresTimerRef.current);
    hasScoresTimerRef.current = setTimeout(async () => {
      if (hasScoresAbortRef.current) { hasScoresAbortRef.current.abort(); }
      const ctrl = new AbortController();
      hasScoresAbortRef.current = ctrl;
      try {
        const params = { gradeSectionId: cls._id, subjectIds: subjects.join(',') };
        const res = await apiHasScores(params, { signal: ctrl.signal });
        if (!ctrl.signal.aborted && res.ok) setHasScoreMap(res.data?.map || {});
      } catch {
        // ignore abort errors
      }
    }, 200);
    return () => {
      if (hasScoresTimerRef.current) { clearTimeout(hasScoresTimerRef.current); hasScoresTimerRef.current = null; }
    };
  }, [isEdit, cls?._id, subjects]);

  // Cohort refresh key & controls removed

  return (
    <div className="relative">
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Section</label>
            <Input disabled={submitting} value={section} onChange={e=>setSection(e.target.value)} type="text" className="mt-1" placeholder="e.g. 1, 2, A, B" required />
          </div>
          {/* Academic Year field removed (managed via Enrollment) */}
          <div>
            <label htmlFor="gradeform-grade" className="block text-sm font-medium text-gray-700">Grade</label>
            <GradeSelect id="gradeform-grade" name="gradeform-grade" disabled={submitting} value={grade} onChange={(v)=> onGradeChange({ target: { value: v } })} className="mt-1 w-full" placeholder="Select..." />
          </div>
          <div>
            <label htmlFor="gradeform-shift" className="block text-sm font-medium text-gray-700">Shift</label>
            <ShiftSelect id="gradeform-shift" name="gradeform-shift" disabled={submitting} value={shift} onChange={(v)=>setShift(v)} className="mt-1 w-full" placeholder="Select..." />
          </div>
          {/* Cohort field removed (managed via Enrollment) */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <span>Subjects</span>
              <button
                type="button"
                onClick={refreshSubjects}
                disabled={!grade || loadingSubs}
                title="Refresh subjects for this grade"
                className="inline-flex items-center rounded border px-1.5 py-1 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 disabled:opacity-50"
              >
                <RotateCcw size={14} className={loadingSubs ? 'animate-spin' : ''} />
              </button>
              {loadingSubs && <span className="text-xs text-gray-400">(Loading...)</span>}
            </label>
            <div className="mt-1 max-h-56 overflow-y-auto border border-gray-300 rounded-md px-3 py-2 divide-y divide-gray-100">
              {gradeSubjects.length === 0 && (
                <div className="text-sm text-gray-500 py-4">No subjects for this grade.</div>
              )}
              {gradeSubjects.map(sub => {
                const id = sub._id;
                const checked = subjects.includes(id);
                const locked = isEdit && checked && !!hasScoreMap[id];
                return (
                  <label key={id} className={`flex items-center gap-3 py-2 ${locked ? 'opacity-70' : ''}`}>
                    <Checkbox disabled={submitting || locked} checked={checked} onChange={() => toggleSubject(id)} />
                    <span className="text-sm text-gray-800">{sub.subjectName}</span>
                    {locked && (
                      <span className="ml-auto inline-flex items-center gap-1 text-xs text-gray-500">
                        <Lock size={14} /> has scores
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-gray-500">Tick subjects to include. Subjects with existing scores cannot be removed.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Capacity</label>
            <Input disabled={submitting} value={capacity} onChange={e=>setCapacity(e.target.value)} type="number" min={0} className="mt-1" />
          </div>
        </div>
          
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="neutral" disabled={submitting} onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="brand" disabled={submitting} className="flex items-center gap-2">
            {submitting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            )}
            {submitting ? (submittingPhase === 'resync' ? 'Resyncing...' : (isEdit ? 'Updating...' : 'Saving...')) : (isEdit ? 'Update' : 'Save')}
          </Button>
        </div>
      </form>

      {showConfirm && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-md p-5 shadow-lg w-full max-w-sm">
            <h4 className="font-semibold mb-2">Change Grade?</h4>
            <p className="text-sm text-gray-600 mb-4">If you change the grade, all previously selected subjects will be cleared. Are you sure?</p>
            <div className="flex justify-end gap-2">
              <Button variant="neutral" onClick={() => confirmGradeChange(false)}>Cancel</Button>
              <Button variant="danger" onClick={() => confirmGradeChange(true)}>Yes, change</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeForm;
