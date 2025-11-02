import React, { useEffect, useMemo, useState } from 'react';
import AcademicYearSelect from '../components/lookups/AcademicYearSelect';
import GradeSelect from '../components/lookups/GradeSelect';
import ShiftSelect from '../components/lookups/ShiftSelect';
import GradeSectionSelect from '../components/lookups/GradeSectionSelect';
import CohortSelect from '../components/lookups/CohortSelect';
import { Search, Play, Rocket, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { previewPromotion, executePromotion, listStudents } from '../api';

// Skeleton page for Promotions as a standalone tab per PROMOTION.md
// This wires the layout and UX elements; API integration to be added next.

const TimingSelector = ({ value, onChange }) => (
  <div className="flex items-center gap-3">
    <label className="font-medium">Timing</label>
    <select
      className="border rounded px-3 py-2 bg-white"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="mid-year">Mid-Year</option>
      <option value="year-end">Year-End</option>
    </select>
  </div>
);

export default function PromotionPage() {
  const [timing, setTiming] = useState('mid-year');
  const initialFilters = { q: '', ay: '', grade: '', shift: '', section: '', cohort: '' };
  const [filters, setFilters] = useState(initialFilters);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState(null);
  const [ayOptions, setAyOptions] = useState([]);
  const [gradeOptions, setGradeOptions] = useState([]);
  const [shiftOptions, setShiftOptions] = useState([]);
  const [cohortOptions, setCohortOptions] = useState([]);

  // Load filter options on mount
  useEffect(() => {
    import('../api').then(api => {
      api.getAcademicYears().then(res => setAyOptions(res.data || res || []));
      api.getGrades().then(res => setGradeOptions(res.data || res || []));
      api.getShifts().then(res => setShiftOptions(res.data || res || []));
      api.listCohorts().then(res => setCohortOptions(res.data || res || []));
    });
  }, []);
  // Fetch students when filters/timing change
  useEffect(() => {
    // Clear any existing preview when filters or timing change so the user must re-run Preview
    setPreview(null);
    setStudentsLoading(true);
    setStudentsError(null);
    // Build params for API
    const params = {
      search: filters.q,
      academicYear: filters.ay,
      grade: filters.grade,
      shift: filters.shift,
      gradeSectionId: filters.section,
      cohort: filters.cohort,
      // timing is not used by backend students API, so skip
    };
    listStudents(params)
      .then(res => {
        setStudents(res.data || []);
      })
      .catch(err => {
        setStudents([]);
        setStudentsError('Failed to load students');
      })
      .finally(() => setStudentsLoading(false));
  }, [filters, timing]);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [preview, setPreview] = useState(null); // { items:[], summary:{} }
  // removed `promoteResults` UI; preview + students tables are sufficient
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingPromote, setLoadingPromote] = useState(false);
  const [ayRefreshKey, setAyRefreshKey] = useState(0);

  // Also clear preview if the selected set of students changes — this prevents running Promote
  // against a preview that was generated for a different selection.
  useEffect(() => {
    setPreview(null);
  }, [Array.from(selectedIds).join(',')]);

  const allSelected = useMemo(() => students.length > 0 && selectedIds.size === students.length, [students, selectedIds]);

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(students.map(s => s._id)));
  };

  const toggleSelected = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  // Helpers: consistent formatting for From/To/Current sections
  const label = (v) => (v === undefined || v === null || v === '' || v === '-') ? null : String(v);
  // Show AY as a short single year (the right-hand part of '2024-2025' → '2025')
  const yearShort = (s) => {
    if (!s || typeof s !== 'string') return null;
    const sep = s.includes('/') ? '/' : '-';
    const parts = s.split(sep).map(p => p.trim());
    if (parts.length === 2) return parts[1];
    return s;
  };
  const dotJoin = (parts) => parts.filter(Boolean).join(' • ');
  const formatFrom = (from = {}) => {
    const grade = from.grade?.gradeName;
  const ay = yearShort(from.academicYear?.yearName);
    const section = from.section;
    const shift = from.shift?.shiftName;
    const cohort = from.cohort?.name;
    return dotJoin([label(grade), label(ay), label(section), label(shift), label(cohort)]);
  };
  const formatTo = (target = {}) => {
    const grade = target.toGrade;
  const ay = yearShort(target.toAY);
    const section = target.section;
    const shift = target.shift;
    const cohort = target.cohort;
    return dotJoin([label(grade), label(ay), label(section), label(shift), label(cohort)]);
  };
  const formatCurrent = (c = {}) => {
    // listStudents() returns s.current fields as simple strings; tolerate missing values
    return dotJoin([label(c.grade), label(c.ay), label(c.section), label(c.shift), label(c.cohort)]);
  };

  const handlePreview = async () => {
    if (students.length === 0 || selectedIds.size === 0) {
      toast.error('Select at least one student to preview');
      return;
    }
    setLoadingPreview(true);
    try {
      // Send studentIds as array in query string
      const params = new URLSearchParams();
      params.append('timing', timing);
      Array.from(selectedIds).forEach(id => params.append('studentIds', id));
    // UI no longer controls auto-create; backend decides and avoids duplicates
  const { ok, items, summary, error, debug } = await previewPromotion(params);
      if (!ok) throw new Error(error || 'Preview failed');
      // preview items received
      setPreview({ items, summary });
    } catch (err) {
      toast.error('Preview failed');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handlePromote = async () => {
    if (!preview) { toast.error('Run preview first'); return; }
    // Prevent execute if preview already shows mid-year error
    if (preview && preview.items && preview.items.some(it => Array.isArray(it.errors) && it.errors.some(e => String(e).includes('Mid-year promotion already done')))) {
      toast.error('Mid-year promotion already done for some students. Promotion stopped.');
      return;
    }
    setLoadingPromote(true);
    try {
  const response = await executePromotion({ timing, studentIds: Array.from(selectedIds) });
      // If backend returns error status, show toast and stop
      if (response && response.ok === false && response.error) {
        toast.error(response.error);
        // Clear preview when server returns an error (e.g., duplicate/mid-year already done)
        setPreview(null);
        setLoadingPromote(false);
        return;
      }
      const { ok, results, summary, error } = response;
  if (!ok) throw new Error(error || 'Promotion failed');
      // Clear preview after a successful promotion so Promote cannot be accidentally re-run
      // on stale preview (user must re-run Preview for the current timing/selection).
      setPreview(null);
      // If backend created a new Academic Year and returned its id, refresh AY list
      // and auto-select the new academic year so the UI reflects the new AY.
      // Backend field expected: `createdAcademicYearId` (or `createdAcademicYear._id`).
      const createdAYId = response?.createdAcademicYearId || response?.createdAcademicYear?.["_id"] || response?.createdAcademicYear?.id;
        if (createdAYId) {
        // trigger AcademicYearSelect to reload options
        setAyRefreshKey(k => k + 1);
        // select the newly created AY in filters
        setFilters(prev => ({ ...prev, ay: createdAYId }));
        // dispatch global event so any AcademicYearSelect instances refresh immediately
  try { window.dispatchEvent(new CustomEvent('academicYear:created', { detail: { createdAcademicYearId: createdAYId } })); } catch(e){}
      }
  // We removed the Promotion Results table — keep behavior: toast + clear selection
      // Notify user of overall outcome
      const failed = results.filter(r => Array.isArray(r.errors) && r.errors.length > 0).length;
      if (failed > 0) {
        toast.error(`Promotion completed with ${failed} failures`);
      } else {
        toast.success('Promotion completed successfully');
      }
      // clear selection but keep preview so user can compare
      setSelectedIds(new Set());
    } catch (err) {
      toast.error('Promotion failed');
    } finally {
      setLoadingPromote(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <TimingSelector value={timing} onChange={setTiming} />
          <input
            placeholder="Search students..."
            className="border rounded px-3 py-2 bg-white min-w-[220px]"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />
          <AcademicYearSelect
            value={filters.ay}
            onChange={v => setFilters({ ...filters, ay: v })}
            refreshKey={ayRefreshKey}
            className="min-w-[120px]"
            placeholder="AY"
          />
          <GradeSelect
            value={filters.grade}
            onChange={v => setFilters({ ...filters, grade: v })}
            className="min-w-[120px]"
            placeholder="Grade"
          />
          <ShiftSelect
            value={filters.shift}
            onChange={v => setFilters({ ...filters, shift: v })}
            className="min-w-[120px]"
            placeholder="Shift"
          />
          <GradeSectionSelect
              gradeId={filters.grade}
              shiftId={filters.shift}
              value={filters.section}
              onChange={v => setFilters({ ...filters, section: v })}
              className="min-w-[120px]"
              placeholder="Section"
            />
          <CohortSelect
            value={filters.cohort}
            onChange={v => setFilters({ ...filters, cohort: v })}
            className="min-w-[120px]"
            placeholder="Cohort"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreview}
            disabled={loadingPreview || loadingPromote}
            aria-busy={loadingPreview}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingPreview ? <Loader2 className="animate-spin" size={16}/> : <Play size={16}/>} 
            <span className="ml-1">Preview</span>
          </button>
          <button
            onClick={handlePromote}
            disabled={!preview || loadingPromote || loadingPreview}
            aria-busy={loadingPromote}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingPromote ? <Loader2 className="animate-spin" size={16}/> : <Rocket size={16}/>} 
            <span className="ml-1">Promote</span>
          </button>
          <button
            onClick={()=>{ setPreview(null); setSelectedIds(new Set()); setFilters(initialFilters); }}
            disabled={loadingPreview || loadingPromote}
            aria-busy={loadingPreview || loadingPromote}
            className="inline-flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-900 px-3 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16}/> Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Students table */}
        <div className="bg-white rounded shadow p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Students</h3>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              <span>Select All</span>
            </label>
          </div>
          <div className="border rounded overflow-auto max-h-[520px]">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2"></th>
                  <th className="p-2 text-left">Student</th>
                  <th className="p-2 text-left">Current</th>
                  <th className="p-2 text-left">Cohort</th>
                </tr>
              </thead>
              <tbody>
                {studentsLoading && (
                  <tr><td colSpan={4} className="p-4 text-center text-gray-400">Loading students...</td></tr>
                )}
                {studentsError && (
                  <tr><td colSpan={4} className="p-4 text-center text-red-500">{studentsError}</td></tr>
                )}
                {!studentsLoading && !studentsError && students.length === 0 && (
                  <tr><td colSpan={4} className="p-4 text-center text-gray-500">No students found</td></tr>
                )}
                {students.map(s => (
                  <tr key={s._id} className="border-t">
                    <td className="p-2"><input type="checkbox" checked={selectedIds.has(s._id)} onChange={()=>toggleSelected(s._id)} /></td>
                    <td className="p-2">{s.studentId} — {s.fullName}</td>
                    <td className="p-2">{formatCurrent(s.current || {}) || '-'}</td>
                    <td className="p-2"><span className="inline-block text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded">{s.current?.cohort || '-'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Preview panel */}
        <div className="bg-white rounded shadow p-3">
          <h3 className="font-semibold mb-2">Preview</h3>
          {!preview ? (
            <div className="text-gray-500">Run Preview to see targets, auto-create needs, and graduations</div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <div>Total: <b>{preview.summary.total}</b></div>
                <div>Promotable: <b className="text-emerald-700">{preview.summary.promotable}</b></div>
                <div>Graduates: <b className="text-blue-700">{preview.summary.graduates}</b></div>
                <div>Missing Targets: <b className="text-amber-700">{preview.summary.missingTargets}</b></div>
                <div>Capacity Issues: <b className="text-red-700">{preview.summary.capacityIssues}</b></div>
              </div>
              <div className="border rounded max-h-[520px] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Student</th>
                      <th className="p-2 text-left">From</th>
                      <th className="p-2 text-left">To</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((it, idx) => {
                      // Helper: get readable names from populated objects or fallback
                      const getName = (obj, key) => obj?.[key] || obj?.name || obj?.gradeName || obj?.yearName || obj?.shiftName || '-';
                      const from = it.fromGS || {};
                      const target = it.target || {};
                      return (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{it.studentId} — {it.fullName}</td>
                          <td className="p-2">
                            {formatFrom(from) || '-'}
                          </td>
                          <td className="p-2">
                            {formatTo(target) || '-'}
                          </td>
                          <td className="p-2">
                            {it.action === 'graduate' ? (
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">Graduate</span>
                            ) : !it.toGS ? (
                              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">Missing GS (will be auto-created on promote)</span>
                            ) : (
                              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded">OK</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Promotion Results table removed per request */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
