import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getAcademicYears, getGrades } from '../../lookups/api/lookups';
import { listStudents, getFullTranscript } from '../../students/api/studentsApi';
import { getCohortTimeline } from '../../cohorts/api/cohorts';
import CohortSelect from '../../lookups/components/CohortSelect';
import EnrollmentStatusSelect from '../../lookups/components/EnrollmentStatusSelect';
import { useCascadingFilters } from '../../../hooks/useCascadingFilters';
import AcademicYearSelect from '../../lookups/components/AcademicYearSelect';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import { Printer, RotateCcw } from 'lucide-react';
import TableShell from '../../../shared/components/table/TableShell.jsx';
import PrintHeader from '../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../shared/components/print/PrintFooter.jsx';

import Card from '../../../shared/components/ui/Card.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Select from '../../../shared/components/ui/Select.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox.jsx';
import Radio from '../../../shared/components/ui/Radio.jsx';
import Chip from '../../../shared/components/ui/Chip.jsx';
import FormField from '../../../shared/components/ui/FormField.jsx';
import LoadingState from '../../../shared/components/feedback/LoadingState.jsx';
import Alert from '../../../shared/components/ui/Alert.jsx';

export default function TranscriptPage() {
  // Lookups (for labels only)
  const [, setYears] = useState([]);
  // Grade/Shift data no longer displayed; timeline covers progression
  const [grades, setGrades] = useState([]); // grade levels list
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(-1); // user must choose one when timeline exists

  // Multi-student selection
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const pickerRef = useRef(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const hasAutoOpenedRef = useRef(false); // controls one-time auto-open for class picker

  // Controls
  const [mode, setMode] = useState('latest'); // full | latest (default latest per request)
  const [showFilters, setShowFilters] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState([]); // grade ids
  const levelsRef = useRef(null);
  const {
    academicYearId,
    setAcademicYearId,
    resetLower,
  } = useCascadingFilters();

  // Data per student
  const [loading, setLoading] = useState(false);
  const [transcripts, setTranscripts] = useState({}); // { [studentId]: { ok, data, error } }

  // Load lookups once for labels + levels
  useEffect(() => {
    (async () => {
      try {
        const ys = await getAcademicYears();
        setYears(Array.isArray(ys) ? ys : (ys?.data || []));
        const gRes = await getGrades?.();
        if (gRes) {
          const gData = Array.isArray(gRes?.data) ? gRes.data : (gRes?.data || gRes || []);
          setGrades(gData);
        }
      } catch {
        toast.error('Failed to load lookups');
      }
    })();
  }, []);

  // Load cohort timeline when cohort selected
  useEffect(() => {
    (async () => {
      if (!cohortId) { setTimeline([]); return; }
      setTimelineLoading(true);
      const { data } = await getCohortTimeline(cohortId);
      setTimelineLoading(false);
      setTimeline(data || []);
    })();
  }, [cohortId]);

  // Suggest students based on search once all required filters completed
  const suggTimer = useRef(null);
  const lastFilterKeyRef = useRef('');
  const lastEmptyTimelineIndexRef = useRef(null); // track which timeline index already announced empty
  useEffect(() => {
    if (suggTimer.current) clearTimeout(suggTimer.current);
    suggTimer.current = setTimeout(async () => {
      try {
        const filtersComplete = Boolean(
          academicYearId && cohortId && enrollmentStatus && ((timeline.length === 0) || activeTimelineIndex >= 0)
        );
        // Build a key representing current filter combo to allow re-auto-open when any changes
        const filterKey = [academicYearId, cohortId, enrollmentStatus, activeTimelineIndex].join('|');
        if (filterKey !== lastFilterKeyRef.current) {
          // allow auto-open again when any upstream filter changes (including timeline segment)
          hasAutoOpenedRef.current = false;
          lastFilterKeyRef.current = filterKey;
        }
        // Allow searching by name/ID even if filters not complete; but require filtersComplete for class auto list
        if (!filtersComplete && !search) { setSuggestions([]); setShowSuggestions(false); return; }
        const params = { page: 1, limit: 200 };
        // If a timeline segment is chosen and its AY differs from selected AY, use segment AY for suggestions (override)
        let segmentAcademicYearId = null;
        if (activeTimelineIndex >= 0 && timeline[activeTimelineIndex]?.academicYear?._id) {
          segmentAcademicYearId = String(timeline[activeTimelineIndex].academicYear._id);
        }
        const effectiveAcademicYearId = segmentAcademicYearId || academicYearId;
        if (effectiveAcademicYearId) params.academicYear = effectiveAcademicYearId;
        if (cohortId) params.cohort = cohortId;
        if (enrollmentStatus) params.enrollmentStatus = enrollmentStatus;
        if (search) params.search = search;
        // If a timeline segment is selected, narrow by its gradeSection (and optionally grade/shift)
        if (activeTimelineIndex >= 0 && timeline[activeTimelineIndex]) {
          const seg = timeline[activeTimelineIndex];
          const gsId = seg?.gradeSection?._id;
          if (gsId) params.gradeSectionId = gsId;
          const gradeIdSeg = seg?.grade?._id;
          if (gradeIdSeg) params.grade = gradeIdSeg;
          const shiftIdSeg = seg?.shift?._id;
          if (shiftIdSeg) params.shift = shiftIdSeg;
        }
        // After filters complete, we always fetch suggestions (even without search) to allow immediate class selection
        let res = await listStudents(params);
        let list = res?.data || [];
        const timelineChosen = activeTimelineIndex >= 0;
        const timelineHasSection = (timelineChosen && params.gradeSectionId);
        const initialEmpty = timelineChosen && list.length === 0;
        if (initialEmpty && lastEmptyTimelineIndexRef.current !== activeTimelineIndex) {
          toast.info('No students in selected timeline segment (Arday kuma jirto segment-kan)');
          lastEmptyTimelineIndexRef.current = activeTimelineIndex;
        }
        // Fallback 1: remove gradeSection only
        if (filtersComplete && timelineHasSection && list.length === 0) {
          const retryParams = { ...params };
          delete retryParams.gradeSectionId;
          res = await listStudents(retryParams);
          list = res?.data || [];
        }
        // Fallback 2: still empty – broaden fully (remove grade/shift narrowing) so segment beyond first years also shows cohort students
        if (filtersComplete && timelineChosen && list.length === 0) {
          const broadParams = { page: 1, limit: 200 };
          // Use segment AY if present, else selected AY
          if (effectiveAcademicYearId) broadParams.academicYear = effectiveAcademicYearId;
          if (cohortId) broadParams.cohort = cohortId;
          if (enrollmentStatus) broadParams.enrollmentStatus = enrollmentStatus;
          if (search) broadParams.search = search;
          res = await listStudents(broadParams);
          list = res?.data || [];
          if (list.length > 0) toast.success('Showing cohort students (Arday guud ee dufcada)');
        }
        setSuggestions(list);
        const shouldShow = list.length > 0 && (isPickerOpen || Boolean(search));
        setShowSuggestions(shouldShow);
        // Auto-open picker ONLY once per filter completion cycle
        if (!hasAutoOpenedRef.current && filtersComplete && list.length > 0 && !isPickerOpen) {
          setIsPickerOpen(true);
          setShowSuggestions(true);
          hasAutoOpenedRef.current = true;
        }
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 250);
    return () => { if (suggTimer.current) clearTimeout(suggTimer.current); };
  }, [search, academicYearId, enrollmentStatus, cohortId, timeline, activeTimelineIndex, isPickerOpen]);

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

  // (Top/Bottom removed)

  const getFilteredEnrollments = (dataObj) => {
    if (!dataObj?.enrollments) return [];
    const list = dataObj.enrollments;
    if (mode === 'latest') {
      return list.length ? [list[list.length - 1]] : [];
    }
    // 'full' and 'levels' modes return all enrollments (levels filtered later)
    return list;
  };

  const manualSelectionRef = useRef(false);

  const addStudent = (s) => {
    if (!s?._id) return;
    manualSelectionRef.current = true;
    setSelectedStudents(prev => prev.some(x => x._id === s._id) ? prev : [...prev, { _id: s._id, fullName: s.fullName, studentId: s.studentId }]);
  };
  const removeStudent = (id) => {
    manualSelectionRef.current = true;
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
    setMode('latest');
    setAcademicYearId('');
    resetLower('ay');
    setEnrollmentStatus('');
    setCohortId('');
    setShowFilters(false);
    setTimeline([]);
    setActiveTimelineIndex(-1);
    manualSelectionRef.current = false;
    hasAutoOpenedRef.current = false;
    setSelectedLevels([]);
    setLevelsOpen(false);
  };

  // Close levels dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!levelsOpen) return;
      if (!levelsRef.current) return;
      if (!levelsRef.current.contains(e.target)) setLevelsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [levelsOpen]);

  return (
    <div className="space-y-6 with-print-footer">
  <PrintHeader />

      <Card className="p-4 no-print">
        <h1 className="text-lg font-semibold mb-3">Transcript Builder</h1>
        {/* Row 1: Search + Select from class + Modes + Filters toggle */}
        <div className="flex flex-row flex-wrap items-end w-full gap-3">
          <div className="flex-1 min-w-[320px]" ref={pickerRef}>
            <FormField label="Search Student" htmlFor="transcript-search">
              <div className="relative">
                <Input
                  id="transcript-search"
                  name="transcript-search"
                  value={search}
                  onChange={e=>{ setSearch(e.target.value); setShowSuggestions(true); }}
                  onFocus={()=> setShowSuggestions(true)}
                  placeholder="Search by name or ID"
                  className="pr-28"
                />
                <div className="absolute right-1 top-1.5 flex gap-1">
                  <ActionButton
                    variant="neutral"
                    onClick={() => { setIsPickerOpen(v=>!v); setShowSuggestions(true); }}
                    title="Open class list"
                    className="text-xs"
                  >
                    Select from class ▾
                  </ActionButton>
                </div>
              </div>
              {(isPickerOpen || (showSuggestions && suggestions.length > 0)) && (
                <Card className="absolute left-0 right-0 top-full mt-1 z-50 max-h-72 overflow-auto">
                  <div className="sticky top-0 bg-white border-b px-2 py-1 flex items-center gap-2">
                    <Input
                      id="transcript-student-filter"
                      name="transcript-student-filter"
                      aria-label="Filter suggested students"
                      value={dropdownSearch}
                      onChange={e=>setDropdownSearch(e.target.value)}
                      placeholder="Filter list..."
                      className="text-sm"
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
                            <Checkbox checked={checked} onChange={()=> checked ? removeStudent(s._id) : addStudent(s)} aria-label={`Select ${s.fullName}`} />
                            <span>{s.fullName} <span className="text-gray-500">({s.studentId})</span></span>
                          </div>
                          {s.gradeDisplay && <span className="text-xs text-gray-500">{s.gradeDisplay}</span>}
                        </label>
                      );
                    });
                  })()}
                </Card>
              )}
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedStudents.map(s => (
                <Chip key={s._id} onRemove={()=>removeStudent(s._id)} removeLabel={`Remove ${s.fullName}`}>
                  {s.fullName} ({s.studentId})
                </Chip>
              ))}
            </div>
            </FormField>
          </div>
        </div>
        {/* Inline modes + filter toggle */}
        <div className="flex flex-row flex-wrap items-end gap-4 w-full">
          <div className="flex flex-row flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <Radio name="transcript-mode" checked={mode==='full'} onChange={()=> setMode('full')} />
              <span>Full Transcript</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Radio name="transcript-mode" checked={mode==='latest'} onChange={()=> setMode('latest')} />
              <span>Last Enrollment</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Radio name="transcript-mode" checked={mode==='levels'} onChange={()=> setMode('levels')} />
              <span>Levels</span>
            </label>
            <div className="relative flex items-center gap-2" ref={levelsRef}>
              <button
                type="button"
                disabled={mode!=='levels'}
                onClick={()=> mode==='levels' && setLevelsOpen(o=>!o)}
                className={`px-2 py-1 border rounded text-xs flex items-center gap-1 ${mode==='levels' ? 'bg-gray-50 hover:bg-gray-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                Levels ▾ {selectedLevels.length ? <span className="text-indigo-600">({selectedLevels.length})</span> : null}
              </button>
              {levelsOpen && mode==='levels' && (
                <Card className="absolute z-40 mt-1 w-48 max-h-64 overflow-auto">
                  <div className="sticky top-0 bg-white border-b px-2 py-1 text-xs font-medium">Select Levels</div>
                  {(!grades || grades.length===0) && <div className="px-3 py-2 text-xs text-gray-500">No grades</div>}
                  {grades && [...grades]
                    // Use same logic as GradeSelect: sort by createdAt to preserve DB insertion (level one → level two ...)
                    .sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt))
                    .map(g => {
                    const id = String(g._id || g.id);
                    const checked = selectedLevels.includes(id);
                    return (
                      <label key={id} className="flex items-center gap-2 px-3 py-1 text-xs hover:bg-gray-50 cursor-pointer">
                        <Checkbox checked={checked} onChange={()=> setSelectedLevels(prev => checked ? prev.filter(x => x!==id) : [...prev, id])} />
                        <span>{g.gradeName || g.name || 'Grade'}</span>
                      </label>
                    );
                  })}
                  {selectedLevels.length > 0 && (
                    <button
                      type="button"
                      onClick={()=> setSelectedLevels([])}
                      className="m-2 mt-1 px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 w-[calc(100%-1rem)]"
                    >Clear</button>
                  )}
                </Card>
              )}
            </div>
          </div>
          <label className="ml-auto flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
            <Checkbox checked={showFilters} onChange={e=> setShowFilters(e.target.checked)} />
            <span>Filters: AY → Cohort / Status / Timeline</span>
          </label>
        </div>
        {showFilters && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <FormField label="Academic Year" htmlFor="transcript-ay">
                <AcademicYearSelect id="transcript-ay" name="academicYearId" value={academicYearId} onChange={(v)=>{ setAcademicYearId(v); resetLower('ay'); setCohortId(''); setActiveTimelineIndex(-1); }} className="mt-1" placeholder="Select year" />
              </FormField>
              <FormField label="Cohort" htmlFor="transcript-cohort">
                <CohortSelect id="transcript-cohort" value={cohortId} onChange={(v)=>{ setCohortId(v); setActiveTimelineIndex(-1); }} mode="context" academicYear={academicYearId} disabled={!academicYearId} className="mt-1" placeholder="Select cohort" />
              </FormField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <FormField label="Enrollment Status" htmlFor="transcript-status">
                <EnrollmentStatusSelect id="transcript-status" value={enrollmentStatus} onChange={(v)=>{ setEnrollmentStatus(v); }} className="mt-1" placeholder="Select status" />
              </FormField>
              <FormField label="Timeline Segment" htmlFor="transcript-timeline">
                <Select
                  id="transcript-timeline"
                  value={timelineLoading ? -2 : activeTimelineIndex}
                  onChange={e=> {
                    const idx = Number(e.target.value);
                    setActiveTimelineIndex(idx);
                    if (idx >= 0) {
                      const hint = String(timeline?.[idx]?.statusHint || '').toLowerCase();
                      if (hint && ['active','inactive','promoted','graduated','transferred','withdrawn'].includes(hint)) {
                        setEnrollmentStatus(hint);
                      }
                    }
                  }}
                  disabled={timelineLoading || (!timeline.length && activeTimelineIndex === -1)}
                  className="mt-1"
                >
                  <option value={-1}>Dooro segment</option>
                  {timelineLoading && <option value={-2}>Loading…</option>}
                  {!timelineLoading && timeline.length === 0 && <option value={-3}>No timeline data</option>}
                  {!timelineLoading && timeline.map((seg, idx) => {
                    const gradeName = seg.grade?.gradeName || '';
                    const section = seg.gradeSection?.section || '';
                    const shiftName = seg.shift?.shiftName || '';
                    const ayName = seg.academicYear?.yearName || '';
                    const labelCore = [gradeName, section, shiftName].filter(Boolean).join(' - ');
                    const label = [ayName, labelCore].filter(Boolean).join(' | ');
                    return <option key={idx} value={idx}>{label || `Segment ${idx+1}`}</option>;
                  })}
                </Select>
              </FormField>
            </div>
          </>
        )}
        <div className="mt-3 flex flex-row flex-wrap gap-2 items-center">
          <ActionButton variant="neutral" onClick={handlePrint} title="Print" icon={<Printer size={16} />}>Print</ActionButton>
          <ActionButton variant="neutral" onClick={handleReset} title="Reset filters" icon={<RotateCcw size={16} />}>Reset</ActionButton>
        </div>
      </Card>

  <Card className="p-4 print:shadow-none print:p-0 print-container">
        {loading && <LoadingState message="Loading…" />}
        {!loading && selectedStudents.length > 0 && (
          <div className="space-y-8 print-two" style={{ breakInside: 'auto' }}>
            {(() => {
              return selectedStudents.map((sel) => {
              const t = transcripts[sel._id];
              const ok = t?.ok && t?.data;
              const dataObj = ok ? t.data : null;
              const enrolls = getFilteredEnrollments(dataObj);
              const filteredEnrolls = (mode==='levels' && selectedLevels.length) ? enrolls.filter(en => {
                // Collect possible grade identifiers from enrollment
                const directGrade = en.grade?._id || en.grade; // enrollment.grade can be object or id
                const gsGradeObj = en.gradeSection?.grade?._id || en.gradeSection?.grade; // may be object or name/id
                const gsGradeIdField = en.gradeSection?.gradeId; // explicit id if present
                const gsGradeNameField = en.gradeSection?.grade; // often a plain name (e.g. "level one")
                const candidates = [directGrade, gsGradeObj, gsGradeIdField, gsGradeNameField]
                  .filter(Boolean)
                  .map(x => String(x));
                // Build allowed names for selected level IDs
                const allowedNames = grades
                  .filter(g => selectedLevels.includes(String(g._id || g.id)))
                  .map(g => String(g.gradeName || g.name))
                  .filter(Boolean);
                return candidates.some(c => selectedLevels.includes(c) || allowedNames.includes(c));
              }) : enrolls;
              return (
                <div key={sel._id} className="space-y-3 student-block avoid-break">
                  <div className="print:text-center">
                    <h2 className="text-2xl font-semibold">{sel.fullName}</h2>
                    <p className="text-sm text-gray-500">Student ID: {sel.studentId}</p>
                  </div>
                  {(!ok || filteredEnrolls.length === 0) && (
                    <Alert variant="neutral">No transcript data for the selected mode/filters.</Alert>
                  )}
                  {ok && filteredEnrolls.map((en, idx) => (
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
                                  const ao = Number(a?.order || 0);
                                  const bo = Number(b?.order || 0);
                                  if (ao !== bo) return ao - bo;
                                  return String(a?.typeName || '').localeCompare(String(b?.typeName || ''));
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
                                    const ao = Number(a?.order || 0);
                                    const bo = Number(b?.order || 0);
                                    if (ao !== bo) return ao - bo;
                                    return String(a?.typeName || '').localeCompare(String(b?.typeName || ''));
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
              });
            })()}
          </div>
        )}
      </Card>

      <PrintFooter left="Generated by Nuuru Al-Bayaan" />
    </div>
  );
}
