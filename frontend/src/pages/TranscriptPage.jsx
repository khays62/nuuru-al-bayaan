import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getAcademicYears, listStudents, getFullTranscript, getCohortTimeline, getGrades } from '../api';
import CohortSelect from '../components/lookups/CohortSelect';
import EnrollmentStatusSelect from '../components/lookups/EnrollmentStatusSelect';
import { useCascadingFilters } from '../hooks/useCascadingFilters';
import AcademicYearSelect from '../components/lookups/AcademicYearSelect';
import ActionButton from '../components/common/ActionButton';
import { Printer, RotateCcw } from 'lucide-react';
import TableShell from '../components/common/table/TableShell';
import PrintHeader from '../components/print/PrintHeader';
import PrintFooter from '../components/print/PrintFooter';
import { useAuth } from "../contexts/AuthContext";


export default function TranscriptPage() {
  // Lookups (for labels only)
  const { auth, hasPermission } = useAuth();

  const canViewTranscript = hasPermission("transcript", "view");
  const canPrintTranscript = hasPermission("transcript", "print");
  
  const [years, setYears] = useState([]);
  // Grade/Shift data no longer displayed; timeline covers progression
  const [grades, setGrades] = useState([]); // grade levels list
  const [shifts, setShifts] = useState([]); // legacy (hidden)
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const applyingTimelineRef = useRef(false);
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
    // The following from cascading filters are retained but UI removed
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
    setGradeId('');
    setShiftId('');
    setGradeSectionId('');
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

      <div className="bg-white p-4 rounded-lg shadow no-print">
        <h1 className="text-lg font-semibold mb-3">Transcript Builder</h1>
        {/* Row 1: Search + Select from class + Modes + Filters toggle */}
        {canViewTranscript && (
  <>
    {/* ===== Filters / Controls ===== */}
    <div className="flex flex-row flex-wrap items-end w-full gap-3">
      <div className="flex-1 min-w-[320px]" ref={pickerRef}>
        <label htmlFor="transcript-search" className="text-xs text-gray-500">
          Search Student
        </label>

        <div className="relative">
          <input
            id="transcript-search"
            name="transcript-search"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search by name or ID"
            className="mt-1 w-full pr-20 px-3 py-2 bg-white/90 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="absolute right-1 top-1.5 flex gap-1">
            <button
              type="button"
              onClick={() => {
                setIsPickerOpen(v => !v);
                setShowSuggestions(true);
              }}
              className="px-2 py-1 text-xs border rounded bg-gray-50 hover:bg-gray-100"
            >
              Select from class ▾
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* ===== Mode & Filters ===== */}
    <div className="flex flex-row flex-wrap items-end gap-4 w-full mt-3">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === 'full'} onChange={() => setMode('full')} />
          Full Transcript
        </label>

        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === 'latest'} onChange={() => setMode('latest')} />
          Last Enrollment
        </label>

        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === 'levels'} onChange={() => setMode('levels')} />
          Levels
        </label>
      </div>
    </div>

    {/* ===== Action buttons ===== */}
    <div className="mt-3 flex flex-wrap gap-2 items-center">
      {canPrintTranscript && (
        <ActionButton
          title="Print"
          variant="neutral"
          onClick={handlePrint}
          icon={<Printer size={16} />}
        >
          Print
        </ActionButton>
      )}

      <ActionButton
        variant="neutral"
        onClick={handleReset}
        title="Reset filters"
        icon={<RotateCcw size={16} />}
      >
        Reset
      </ActionButton>
    </div>

    {/* ===== Transcript Output ===== */}
    <div className="bg-white p-4 rounded-lg shadow print:shadow-none print:p-0 print-container mt-4">
      {loading && <div>Loading…</div>}

      {!loading && selectedStudents.length > 0 && (
        <div className="space-y-8 print-two">
          {selectedStudents.map(sel => (
            <div key={sel._id} className="student-block">
              <h2 className="text-xl font-semibold">{sel.fullName}</h2>
              <p className="text-sm text-gray-500">
                Student ID: {sel.studentId}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  </>
)}


      <PrintFooter left="Generated by Nuuru Al-Bayaan" />
    </div>
    </div>
  );
}
