import React, { useEffect, useMemo, useState } from 'react';
import DataToolbar from '../components/common/DataToolbar/DataToolbar';
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
	      className="px-3 py-2 bg-white/90 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

  // Load filter options on mount
  useEffect(() => {
    import('../api').then(api => {
      api.getAcademicYears().then(res => setAyOptions(res.data || res || []));
      api.getGrades().then(res => setGradeOptions(res.data || res || []));
      api.getShifts().then(res => setShiftOptions(res.data || res || []));
    });
  }, []);
  // filtersReady: all required dropdowns must be chosen (AY, Grade, Shift, Section, Cohort)
  const filtersReady = useMemo(() => (
    Boolean(filters.ay) && Boolean(filters.grade) && Boolean(filters.shift) && Boolean(filters.section) && Boolean(filters.cohort)
  ), [filters.ay, filters.grade, filters.shift, filters.section, filters.cohort]);

  // Fetch students only when filtersReady
  useEffect(() => {
    setPreview(null);
    if (!filtersReady) {
      // Keep table empty & reset selection until user chooses all filters
      setStudents([]);
      setSelectedIds(new Set());
      setStudentsLoading(false);
      setStudentsError(null);
      return;
    }
    setStudentsLoading(true);
    setStudentsError(null);
    const params = {
      search: filters.q,
      academicYear: filters.ay,
      grade: filters.grade,
      shift: filters.shift,
      gradeSectionId: filters.section,
      cohort: filters.cohort,
    };
    listStudents(params)
      .then(res => {
        const raw = res.data || [];
        // Normalize to provide a `current` object expected by the table formatter
        const mapped = raw.map(s => ({
          ...s,
          current: {
            grade: s.grade || null,
            ay: s.academicYear || null,
            section: s.section || null,
            shift: s.shift || null,
            cohort: s.cohort || null,
          }
        }));
        setStudents(mapped);
      })
      .catch(() => {
        setStudents([]);
        setStudentsError('Failed to load students');
      })
      .finally(() => setStudentsLoading(false));
  }, [filters, timing, filtersReady]);

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
    if (!filtersReady) {
      toast.error('Doora AY, Grade, Shift, Section iyo Cohort marka hore');
      return;
    }
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
  const { ok, items, summary, error, warnings, allNoScores } = await previewPromotion(params);
      if (!ok) throw new Error(error || 'Preview failed');
      // preview items received
      setPreview({ items, summary });
      // Show a short toast if all selected have no scores, but still render table
      if (allNoScores || (Array.isArray(warnings) && warnings.includes('NO_SCORES_ALL'))) {
        toast.error('All selected students have no exam scores.');
      }
    } catch (err) {
      toast.error(err?.message || 'Preview failed');
      setPreview(null);
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
      const code = err?.data?.error || '';
      if (code === 'NO_SCORES_ALL') {
        const names = Array.isArray(err?.data?.details)
          ? err.data.details.map(d => d.fullName).filter(Boolean)
          : [];
        const snippet = names.length === 0
          ? ''
          : names.length <= 3
            ? ` (${names.join(', ')})`
            : ` (${names.slice(0,3).join(', ')} +${names.length - 3} more)`;
        toast.error(`All selected students have no exam scores${snippet}. Please add/import scores first, then try Promote again.`);
      } else {
        toast.error(err?.message || 'Promotion failed');
      }
    } finally {
      setLoadingPromote(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-800">Promotions</h1>
        <p className="text-sm text-gray-600">Select context filters then preview eligibility before confirming promotions.</p>
      </div>
      <DataToolbar
        showReset={false}
        filtersSlot={<>
          <div className="flex flex-row flex-wrap gap-2 w-full">
            <div className="flex items-center"><TimingSelector value={timing} onChange={setTiming} /></div>
            <AcademicYearSelect value={filters.ay} onChange={v => setFilters({ ...filters, ay: v })} refreshKey={ayRefreshKey} className="flex-1 min-w-[120px]" placeholder="AY" />
            <GradeSelect value={filters.grade} onChange={v => setFilters({ ...filters, grade: v })} className="flex-1 min-w-[120px]" placeholder="Grade" />
            <ShiftSelect value={filters.shift} onChange={v => setFilters({ ...filters, shift: v })} className="flex-1 min-w-[120px]" placeholder="Shift" />
            <GradeSectionSelect gradeId={filters.grade} shiftId={filters.shift} value={filters.section} onChange={v => setFilters({ ...filters, section: v })} className="flex-1 min-w-[140px]" placeholder="Section" />
            <CohortSelect mode="promotion" academicYear={filters.ay} gradeSectionId={filters.section} gradeId={filters.grade} shiftId={filters.shift} section={null} value={filters.cohort} onChange={v => setFilters({ ...filters, cohort: v })} className="flex-1 min-w-[150px]" placeholder="Cohort" />
          </div>
        </>}
        actionsSlot={<div className="flex gap-2">
          <button onClick={handlePreview} disabled={!filtersReady || loadingPreview || loadingPromote} aria-busy={loadingPreview} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm">
            {loadingPreview ? <Loader2 className="animate-spin" size={16}/> : <Play size={16}/>} <span>Preview</span>
          </button>
          <button onClick={handlePromote} disabled={!preview || loadingPromote || loadingPreview} aria-busy={loadingPromote} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm">
            {loadingPromote ? <Loader2 className="animate-spin" size={16}/> : <Rocket size={16}/>} <span>Promote</span>
          </button>
          <button onClick={()=>{ setPreview(null); setSelectedIds(new Set()); setFilters(initialFilters); }} disabled={loadingPreview || loadingPromote} className="inline-flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 rounded shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm">
            <RefreshCw size={16}/> Reset
          </button>
        </div>}
        onReset={()=>{ setPreview(null); setSelectedIds(new Set()); setFilters(initialFilters); }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Students table */}
        <div className="bg-white rounded shadow p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Students</h3>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} disabled={!filtersReady || students.length === 0} />
              <span>Select All</span>
            </label>
          </div>
          <div className="border rounded overflow-auto max-h-[520px]">
            <table className="min-w-full text-sm border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 border-b border-gray-200"></th>
                  <th className="p-2 text-left border-b border-gray-200">Student</th>
                  <th className="p-2 text-left border-b border-gray-200">Current</th>
                  <th className="p-2 text-left border-b border-gray-200">Cohort</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {studentsLoading && (
                  <tr><td colSpan={4} className="p-4 text-center text-gray-400">Loading students...</td></tr>
                )}
                {studentsError && (
                  <tr><td colSpan={4} className="p-4 text-center text-red-500">{studentsError}</td></tr>
                )}
                {!studentsLoading && !studentsError && !filtersReady && (
                  <tr><td colSpan={4} className="p-4 text-center text-gray-500">Select AY, Grade, Shift, Section and Cohort to load students</td></tr>
                )}
                {!studentsLoading && !studentsError && filtersReady && students.length === 0 && (
                  <tr><td colSpan={4} className="p-4 text-center text-gray-500">No students found</td></tr>
                )}
                {students.map(s => (
                  <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-2"><input type="checkbox" checked={selectedIds.has(s._id)} onChange={()=>toggleSelected(s._id)} disabled={!filtersReady} /></td>
                    <td className="p-2 whitespace-nowrap font-medium text-gray-700">{s.studentId} — {s.fullName}</td>
                    <td className="p-2 text-xs text-gray-600">{formatCurrent(s.current || {}) || '-'}</td>
                    <td className="p-2"><span className="inline-block text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-200">{s.current?.cohort || '-'}</span></td>
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
                <table className="min-w-full text-sm border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left border-b border-gray-200">Student</th>
                      <th className="p-2 text-left border-b border-gray-200">From</th>
                      <th className="p-2 text-left border-b border-gray-200">To</th>
                      <th className="p-2 text-left border-b border-gray-200">Avg</th>
                      <th className="p-2 text-left border-b border-gray-200">Failed</th>
                      <th className="p-2 text-left border-b border-gray-200">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {preview.items.map((it, idx) => {
                      // Helper: get readable names from populated objects or fallback
                      const getName = (obj, key) => obj?.[key] || obj?.name || obj?.gradeName || obj?.yearName || obj?.shiftName || '-';
                      const from = it.fromGS || {};
                      const target = it.target || {};
                      const failed = (Array.isArray(it.errors) && it.errors.includes('BELOW_MIN_AVG')) || it.action === 'stay';
                      const graduated = it.action === 'graduate';
                      return (
                        <tr key={idx} className={`${failed ? 'bg-red-50' : graduated ? 'bg-blue-50' : 'bg-white'} hover:bg-gray-50 transition-colors`}>
                          <td className="p-2">{it.studentId} — {it.fullName}</td>
                          <td className="p-2">
                            {formatFrom(from) || '-'}
                          </td>
                          <td className="p-2">
                            {formatTo(target) || '-'}
                          </td>
                          <td className="p-2 text-xs">
                            {typeof it.overallAvg === 'number' ? it.overallAvg.toFixed(1) : '-'}
                          </td>
                          <td className="p-2 text-xs">
                            {typeof it.failedSubjects === 'number' ? it.failedSubjects : '-'}
                          </td>
                          <td className="p-2">
                            {it.action === 'graduate' ? (
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">Graduate</span>
                            ) : (Array.isArray(it.errors) && it.errors.includes('BELOW_MIN_AVG')) || it.action === 'stay' ? (
                              <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">Not eligible (avg &lt; 60)</span>
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
