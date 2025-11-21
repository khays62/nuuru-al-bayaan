import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getAcademicYears, getGrades, getShifts, listStudents, getFullTranscript } from '../api';
import { useCascadingFilters } from '../hooks/useCascadingFilters';
import AcademicYearSelect from '../components/lookups/AcademicYearSelect';
import GradeSelect from '../components/lookups/GradeSelect';
import ShiftSelect from '../components/lookups/ShiftSelect';
import GradeSectionSelect from '../components/lookups/GradeSectionSelect';
import ActionButton from '../components/common/ActionButton';
import { Printer, RotateCcw } from 'lucide-react';
import TableShell from '../components/common/table/TableShell';
import PrintHeader from '../components/print/PrintHeader';
import PrintFooter from '../components/print/PrintFooter';

export default function TranscriptPage() {
  // Lookups (for labels only)
  const [years, setYears] = useState([]);
  const [grades, setGrades] = useState([]);
  const [shifts, setShifts] = useState([]);

  // Multi-student selection
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const pickerRef = useRef(null);
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Controls
  const [mode, setMode] = useState('full'); // full | latest | filter
  const {
    academicYearId,
    setAcademicYearId,
    gradeId,
    setGradeId,
    shiftId,
    setShiftId,
    gradeSectionId,
    setGradeSectionId,
    sections,
    resetLower,
  } = useCascadingFilters();

  // Data per student
  const [loading, setLoading] = useState(false);
  const [transcripts, setTranscripts] = useState({}); // { [studentId]: { ok, data, error } }

  // Load lookups once for labels
  useEffect(() => {
    (async () => {
      try {
        const [ys, gs, ss] = await Promise.all([getAcademicYears(), getGrades(), getShifts()]);
        setYears(Array.isArray(ys) ? ys : (ys?.data || []));
        setGrades(Array.isArray(gs) ? gs : (gs?.data || []));
        setShifts(Array.isArray(ss) ? ss : (ss?.data || []));
      } catch {
        toast.error('Failed to load lookups');
      }
    })();
  }, []);

  // Suggest students based on search and optional filters
  const suggTimer = useRef(null);
  useEffect(() => {
    if (suggTimer.current) clearTimeout(suggTimer.current);
    suggTimer.current = setTimeout(async () => {
      try {
        const params = { page: 1, limit: mode === 'filter' ? 200 : 50 };
        if (search) params.search = search;
        if (mode === 'filter') {
          if (academicYearId) params.academicYear = academicYearId;
          if (gradeId) params.grade = gradeId;
          if (shiftId) params.shift = shiftId;
          if (gradeSectionId) params.gradeSectionId = gradeSectionId;
        }
        const shouldFetch = Boolean(search) || (mode === 'filter' && Boolean(academicYearId || gradeId || shiftId || gradeSectionId));
        if (!shouldFetch) { setSuggestions([]); return; }
        const res = await listStudents(params);
        const list = res?.data || [];
        setSuggestions(list);
        setShowSuggestions(list.length > 0 && (Boolean(search) || mode === 'filter'));
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 250);
    return () => { if (suggTimer.current) clearTimeout(suggTimer.current); };
  }, [search, mode, academicYearId, gradeId, shiftId, gradeSectionId]);

  // Close dropdowns on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!pickerRef.current) return;
      if (!pickerRef.current.contains(e.target)) {
        setIsPickerOpen(false);
        setShowSuggestions(false);
      }
    };
    if (showSuggestions || isPickerOpen) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showSuggestions, isPickerOpen]);

  // Auto-load transcripts for newly selected students
  useEffect(() => {
    const run = async () => {
      if (!selectedStudents.length) { setTranscripts({}); return; }
      setLoading(true);
      try {
        const current = selectedStudents.map(s => s._id);
        const toFetch = current.filter(id => !(transcripts[id]?.ok));
        if (toFetch.length === 0) return;
        const pairs = await Promise.all(toFetch.map(async (id) => {
          const { ok, data, error } = await getFullTranscript(id);
          return [id, { ok, data, error }];
        }));
        setTranscripts(prev => {
          const next = { ...prev };
          pairs.forEach(([id, payload]) => { next[id] = payload; });
          return next;
        });
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudents]);

  const getFilteredEnrollments = (dataObj) => {
    if (!dataObj?.enrollments) return [];
    const list = dataObj.enrollments;
    if (mode === 'latest') return list.length ? [list[list.length - 1]] : [];
    if (mode === 'filter') {
      const eq = (a, b) => (a != null && b != null) && String(a) === String(b);
      const eqText = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

      const selYear = years.find(y => String(y._id) === String(academicYearId));
      const selGrade = grades.find(g => String(g._id) === String(gradeId));
      const selShift = shifts.find(s => String(s._id) === String(shiftId));
      const selSection = sections.find(sc => String(sc._id) === String(gradeSectionId));

      return list.filter(en => {
        let ayOk = true;
        if (academicYearId) {
          const enAY = en.academicYear;
          ayOk = eq(enAY?._id, academicYearId) || eq(enAY, academicYearId) ||
                 eqText(enAY?.yearName, selYear?.yearName) || eqText(enAY, selYear?.yearName);
        }
        let gsOk = true;
        if (gradeSectionId) {
          const enGS = en.gradeSection;
          gsOk = eq(enGS?._id, gradeSectionId) || eq(enGS, gradeSectionId) ||
                 eqText(enGS?.section, selSection?.section) || eqText(enGS, selSection?.section);
        }
        let gOk = true;
        if (gradeId) {
          const enG = en.gradeSection?.grade ?? en.grade;
          gOk = eq(enG?._id, gradeId) || eq(enG, gradeId) ||
                eqText(enG?.gradeName, selGrade?.gradeName) || eqText(enG, selGrade?.gradeName);
        }
        let shOk = true;
        if (shiftId) {
          const enSh = en.gradeSection?.shift ?? en.shift;
          shOk = eq(enSh?._id, shiftId) || eq(enSh, shiftId) ||
                 eqText(enSh?.shiftName, selShift?.shiftName) || eqText(enSh, selShift?.shiftName);
        }
        return ayOk && gsOk && gOk && shOk;
      });
    }
    return list; // full
  };

  const addStudent = (s) => {
    if (!s?._id) return;
    setSelectedStudents(prev => prev.some(x => x._id === s._id) ? prev : [...prev, { _id: s._id, fullName: s.fullName, studentId: s.studentId }]);
  };
  const removeStudent = (id) => {
    setSelectedStudents(prev => prev.filter(x => x._id !== id));
    setTranscripts(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const handlePrint = () => window.print();
  const handleReset = () => {
    setSearch('');
    setDropdownSearch('');
    setSelectedStudents([]);
    setSuggestions([]);
    setShowSuggestions(false);
    setIsPickerOpen(false);
    setTranscripts({});
    setMode('full');
    setAcademicYearId('');
    setGradeId('');
    setShiftId('');
    setGradeSectionId('');
  };

  return (
    <div className="space-y-6 with-print-footer">
  <PrintHeader />

      <div className="bg-white p-4 rounded-lg shadow no-print">
        <h1 className="text-lg font-semibold mb-3">Transcript Builder</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="col-span-1 md:col-span-2" ref={pickerRef}>
            <label htmlFor="transcript-search" className="text-xs text-gray-500">Search Student</label>
            <div className="relative">
              <input
                id="transcript-search"
                name="transcript-search"
                value={search}
                onChange={e=>{ setSearch(e.target.value); setShowSuggestions(true); }}
                onFocus={()=> setShowSuggestions(true)}
                placeholder="Search by name or ID"
	                className="mt-1 w-full pr-20 px-3 py-2 bg-white/90 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute right-1 top-1.5 flex gap-1">
                {mode === 'filter' && (
                  <button
                    type="button"
                    onClick={() => { setIsPickerOpen(v=>!v); setShowSuggestions(true); }}
                    className="px-2 py-1 text-xs border rounded bg-gray-50 hover:bg-gray-100"
                    title="Open class list"
                  >
                    Select from class ▾
                  </button>
                )}
              </div>
              {(isPickerOpen || (showSuggestions && suggestions.length > 0)) && (
                <div className="absolute left-0 right-0 top-full mt-1 border rounded shadow-lg bg-white z-50 max-h-72 overflow-auto">
                  <div className="sticky top-0 bg-white border-b px-2 py-1 flex items-center gap-2">
                    <input
                      id="transcript-student-filter"
                      name="transcript-student-filter"
                      aria-label="Filter suggested students"
                      value={dropdownSearch}
                      onChange={e=>setDropdownSearch(e.target.value)}
                      placeholder="Filter list..."
                      className="w-full px-3 py-2 bg-white/90 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  {(() => {
                    const q = dropdownSearch.toLowerCase();
                    const list = (suggestions || []).filter(s => !q || s.fullName?.toLowerCase().includes(q) || String(s.studentId).toLowerCase().includes(q));
                    if (!list.length) return <div className="px-3 py-2 text-sm text-gray-500">No students found</div>;
                    return list.map(s => {
                      const checked = selectedStudents.some(x => x._id === s._id);
                      return (
                        <label key={s._id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={checked} onChange={()=> checked ? removeStudent(s._id) : addStudent(s)} aria-label={`Select ${s.fullName}`} />
                            <span>{s.fullName} <span className="text-gray-500">({s.studentId})</span></span>
                          </div>
                          {s.gradeDisplay && <span className="text-xs text-gray-500">{s.gradeDisplay}</span>}
                        </label>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedStudents.map(s => (
                <span key={s._id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs">
                  {s.fullName} ({s.studentId})
                  <button type="button" onClick={()=>removeStudent(s._id)} className="ml-1 text-indigo-500 hover:text-indigo-700">×</button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="transcript-mode" className="text-xs text-gray-500">Mode</label>
            <select id="transcript-mode" name="transcript-mode" value={mode} onChange={e=>setMode(e.target.value)} className="mt-1 w-full px-3 py-2 bg-white/90 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="full">Full Transcript (All Years)</option>
              <option value="latest">Latest Enrollment Only</option>
              <option value="filter">Filtered Transcript</option>
            </select>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {mode === 'filter' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="transcript-ay" className="text-xs text-gray-500">Academic Year</label>
                    <AcademicYearSelect id="transcript-ay" name="academicYearId" value={academicYearId} onChange={(v)=>{ setAcademicYearId(v); resetLower('ay'); }} className="mt-1 w-full" placeholder="Any" />
                  </div>
                  <div>
                    <label htmlFor="transcript-grade" className="text-xs text-gray-500">Grade</label>
                    <GradeSelect id="transcript-grade" name="gradeId" value={gradeId} onChange={(v)=>{ setGradeId(v); resetLower('grade'); }} className="mt-1 w-full" placeholder="Any" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="transcript-shift" className="text-xs text-gray-500">Shift</label>
                    <ShiftSelect id="transcript-shift" name="shiftId" value={shiftId} onChange={(v)=>{ setShiftId(v); resetLower('shift'); }} className="mt-1 w-full" placeholder="Any" />
                  </div>
                  <div>
                    <label htmlFor="transcript-section" className="text-xs text-gray-500">Section</label>
                    <GradeSectionSelect id="transcript-section" name="gradeSectionId" academicYearId={academicYearId} gradeId={gradeId} shiftId={shiftId} value={gradeSectionId} onChange={setGradeSectionId} className="mt-1 w-full" placeholder="Any" />
                  </div>
                </div>
                <p className="text-xs text-gray-500">When you set filters, the list above shows matching students. Select multiple students to print their transcripts at once.</p>
              </>
            )}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <ActionButton variant="neutral" onClick={handlePrint} title="Print" icon={<Printer size={16} />}>Print</ActionButton>
          <ActionButton variant="neutral" onClick={handleReset} title="Reset filters" icon={<RotateCcw size={16} />}>Reset</ActionButton>
        </div>
      </div>

  <div className="bg-white p-4 rounded-lg shadow print:shadow-none print:p-0 print-container">
        {loading && <div>Loading…</div>}
        {!loading && selectedStudents.length > 0 && (
          <div className="space-y-8 print-two" style={{ breakInside: 'auto' }}>
            {selectedStudents.map((sel) => {
              const t = transcripts[sel._id];
              const ok = t?.ok && t?.data;
              const dataObj = ok ? t.data : null;
              const enrolls = getFilteredEnrollments(dataObj);
              return (
                <div key={sel._id} className="space-y-3 student-block avoid-break">
                  <div className="print:text-center">
                    <h2 className="text-2xl font-semibold">{sel.fullName}</h2>
                    <p className="text-sm text-gray-500">Student ID: {sel.studentId}</p>
                  </div>
                  {(!ok || enrolls.length === 0) && (
                    <div className="text-sm text-gray-500">No transcript data for the selected mode/filters.</div>
                  )}
                  {ok && enrolls.map((en, idx) => (
                    <section key={en.enrollmentId || idx} className="p-3 avoid-break">
                      <div className="border-b pb-2 mb-2 text-sm flex flex-wrap gap-x-4 gap-y-1">
                        <span><span className="font-medium">Academic Year:</span> {en.academicYear?.yearName || '-'}</span>
                        <span><span className="font-medium">Grade:</span> {en.gradeSection?.grade || '-'}</span>
                        <span><span className="font-medium">Section:</span> {en.gradeSection?.section || '-'}</span>
                        <span><span className="font-medium">Shift:</span> {en.gradeSection?.shift || '-'}</span>
                        <span><span className="font-medium">Status:</span> {en.status}</span>
                      </div>
                      <div className="overflow-x-auto mt-3">
                        <TableShell>
                            <thead className="bg-gray-800">
                            <tr>
                              <th className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Subject</th>
                              {[...(en.transcript?.examTypes || [])]
                                .sort((a, b) => {
                                  const an = String(a.typeName || '').toLowerCase();
                                  const bn = String(b.typeName || '').toLowerCase();
                                  const aMid = /mid/.test(an), bMid = /mid/.test(bn);
                                  const aFin = /final/.test(an), bFin = /final/.test(bn);
                                  if (aMid && !bMid) return -1;
                                  if (!aMid && bMid) return 1;
                                  if (aFin && !bFin) return 1;
                                  if (!aFin && bFin) return -1;
                                  return an.localeCompare(bn);
                                })
                                .map(et => (
                                  <th key={et._id} className="text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">{et.typeName}</th>
                                ))}
                              <th className="text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Total</th>
                              <th className="text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Average</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700">
                            {(en.transcript?.rows || []).map(row => (
                              <tr key={String(row.subjectId)} className="odd:bg-white even:bg-gray-50">
                                <td className="px-4 py-3 border-x border-gray-700">{row.subjectName}</td>
                                {[...(en.transcript?.examTypes || [])]
                                  .sort((a, b) => {
                                    const an = String(a.typeName || '').toLowerCase();
                                    const bn = String(b.typeName || '').toLowerCase();
                                    const aMid = /mid/.test(an), bMid = /mid/.test(bn);
                                    const aFin = /final/.test(an), bFin = /final/.test(bn);
                                    if (aMid && !bMid) return -1;
                                    if (!aMid && bMid) return 1;
                                    if (aFin && !bFin) return 1;
                                    if (!aFin && bFin) return -1;
                                    return an.localeCompare(bn);
                                  })
                                  .map(et => {
                                    const cell = (row.exams || []).find(x => String(x.examTypeId) === String(et._id));
                                    return <td key={et._id} className="text-right px-4 py-3 border-x border-gray-700">{Number(cell?.score || 0).toFixed(2)}</td>;
                                  })}
                                <td className="text-right px-4 py-3 border-x border-gray-700">{Number(row.total || 0).toFixed(2)}</td>
                                <td className="text-right px-4 py-3 border-x border-gray-700">{Number(row.average || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t-2 border-gray-700">
                            <tr className="font-medium">
                              <td className="text-right px-4 py-3 border-b border-gray-700">Overall</td>
                              <td colSpan={(en.transcript?.examTypes?.length || 0)} className="border-b border-gray-700"></td>
                              <td className="text-right px-4 py-3 border-b border-gray-700">{Number(en.transcript?.overall?.total || 0).toFixed(2)}</td>
                              <td className="text-right px-4 py-3 border-b border-gray-700">{Number(en.transcript?.overall?.average || 0).toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        </TableShell>
                      </div>
                    </section>
                  ))}
                  {/* Removed extra summary footer under table per request */}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PrintFooter left="Generated by Nuuru Al-Bayaan" />
    </div>
  );
}
