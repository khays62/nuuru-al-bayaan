import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getGrades, getShifts } from '../../lookups/api/lookups';
import { listStudents, getFullTranscript } from '../../students/api/studentsApi';
import { getCohortTimeline } from '../../cohorts/api/cohorts';
import { useCascadingFilters } from '../../../hooks/useCascadingFilters';
import AcademicYearSelect from '../../lookups/components/AcademicYearSelect';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import { Printer, RotateCcw } from 'lucide-react';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import PrintHeader from '../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../shared/components/print/PrintFooter.jsx';
import headerImg from '../../../assets/nuuruBayaanHeader.png';

import EnrollmentCohortToolbar from '../../../shared/components/filters/EnrollmentCohortToolbar.jsx';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import { PdfDownloadButton, ExcelDownloadButton, CopyTableButton } from '../../../shared/components/exports/downloadButtons';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import FilterDropdownSelect from '../../../shared/components/DataToolbar/FilterDropdownSelect.jsx';

import Card from '../../../shared/components/ui/Card.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox.jsx';
import Radio from '../../../shared/components/ui/Radio.jsx';
import Chip from '../../../shared/components/ui/Chip.jsx';
import FormField from '../../../shared/components/ui/FormField.jsx';
import LoadingState from '../../../shared/components/ui/LoadingState.jsx';
import Skeleton from '../../../shared/components/ui/Skeleton.jsx';
import Alert from '../../../shared/components/ui/Alert.jsx';
import { useAuth } from '../../../auth/AuthContext';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { transcriptKeys } from '../queryKeys';
import { useTranscriptRealtimeInvalidation } from '../useTranscriptRealtimeInvalidation';
import { useI18n } from '../../../i18n/I18nProvider';

export default function TranscriptPage() {
  const { t } = useI18n();
  const { auth, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const role = String(auth?.user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const canPrintTranscript = isAdmin || hasPermission('transcript', 'print');

  useTranscriptRealtimeInvalidation();

  // Lookups (for labels only)
  // Grade/Shift data no longer displayed; timeline covers progression
  const [grades, setGrades] = useState([]); // grade levels list
  const [shifts, setShifts] = useState([]);
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
  const noTranscriptToastKeyRef = useRef('');

  const formatEnrollmentStatus = (raw) => {
    const v = String(raw || '').toLowerCase();
    if (!v) return '';
    const allowed = ['open', 'active', 'inactive', 'promoted', 'graduated', 'transferred', 'withdrawn', 'all'];
    if (allowed.includes(v)) return t(`students.enrollmentStatus.${v}`);
    return String(raw);
  };

  const formatStatusHint = (raw) => {
    const v = String(raw || '').toLowerCase();
    if (!v) return '';
    const allowed = ['active', 'inactive', 'promoted', 'graduated', 'transferred', 'withdrawn'];
    if (allowed.includes(v)) return t(`students.enrollmentStatus.${v}`);
    return String(raw);
  };

  // Controls
  const [mode, setMode] = useState('latest'); // full | latest (default latest per request)
  // Enrollment status tabs (same UX as Result/Exam/Student)
  const [enrollmentStatus, setEnrollmentStatus] = useState('active');
  const [cohortId, setCohortId] = useState('');
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [selectedLevels, setSelectedLevels] = useState([]); // grade ids
  const levelsRef = useRef(null);
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
    loadingSections,
    resetLower,
  } = useCascadingFilters();

  const effectiveSections = useMemo(() => {
    // GradeSection is not scoped per academic year in the current data model.
    // Academic year filtering is enforced via Enrollment queries (roster/transcripts), not here.
    return Array.isArray(sections) ? sections : [];
  }, [sections]);

  // Data per student
  const selectedStudentIds = useMemo(
    () => (selectedStudents || []).map((s) => String(s?._id || '')).filter(Boolean),
    [selectedStudents]
  );

  const isLatestMode = mode === 'latest';

  // Lightweight enrollment index (fast) used to render accurate skeleton counts for full/levels.
  const indexQueries = useQueries({
    queries: selectedStudentIds.map((studentId) => ({
      queryKey: transcriptKeys.student(studentId, 'index'),
      enabled: Boolean(studentId)
        && !isLatestMode
        && (mode !== 'levels' || selectedLevels.length > 0),
      queryFn: async () => getFullTranscript(studentId, { mode: 'index' }),
      staleTime: 60_000,
      placeholderData: (prev) => prev,
    })),
  });

  const indexQueryByStudentId = useMemo(() => {
    const map = {};
    for (let i = 0; i < selectedStudentIds.length; i += 1) {
      map[selectedStudentIds[i]] = indexQueries[i];
    }
    return map;
  }, [selectedStudentIds, indexQueries]);

  const indexByStudentId = useMemo(() => {
    const map = {};
    for (let i = 0; i < selectedStudentIds.length; i += 1) {
      const id = selectedStudentIds[i];
      const q = indexQueries[i];
      map[id] = q?.data?.data || q?.data || null;
    }
    return map;
  }, [selectedStudentIds, indexQueries]);

  // Latest mode stays as a single fast query per student.
  const latestTranscriptQueries = useQueries({
    queries: selectedStudentIds.map((studentId) => ({
      queryKey: transcriptKeys.student(studentId, 'latest'),
      enabled: Boolean(studentId) && isLatestMode,
      queryFn: async () => getFullTranscript(studentId, { mode: 'latest' }),
      placeholderData: (prev) => prev,
    })),
  });

  const latestTranscriptQueryById = useMemo(() => {
    const map = {};
    for (let i = 0; i < selectedStudentIds.length; i += 1) {
      map[selectedStudentIds[i]] = latestTranscriptQueries[i];
    }
    return map;
  }, [selectedStudentIds, latestTranscriptQueries]);

  const latestTranscripts = useMemo(() => {
    const map = {};
    for (let i = 0; i < selectedStudentIds.length; i += 1) {
      const id = selectedStudentIds[i];
      const q = latestTranscriptQueries[i];
      map[id] = q?.data || null;
    }
    return map;
  }, [selectedStudentIds, latestTranscriptQueries]);

  const getLevelNamesForSelected = () => {
    const selected = new Set((selectedLevels || []).map((x) => String(x)));
    return (grades || [])
      .filter((g) => selected.has(String(g._id || g.id)))
      .map((g) => String(g.gradeName || g.name || '').trim())
      .filter(Boolean);
  };

  const getTargetEnrollmentsFromIndex = (studentId) => {
    const idx = indexByStudentId[String(studentId)];
    const enrolls = Array.isArray(idx?.enrollments) ? idx.enrollments : [];
    if (!enrolls.length) return [];

    if (mode === 'levels' && selectedLevels.length === 0) return [];

    if (mode === 'levels' && selectedLevels.length > 0) {
      const allowedNames = new Set(getLevelNamesForSelected().map((x) => x.toLowerCase()));
      return enrolls.filter((en) => {
        const gradeName = String(en?.gradeSection?.grade || '').toLowerCase();
        return gradeName && allowedNames.has(gradeName);
      });
    }

    return enrolls;
  };

  const enrollmentTargets = useMemo(() => {
    if (isLatestMode) return [];
    const targets = [];
    for (const studentId of selectedStudentIds) {
      const list = getTargetEnrollmentsFromIndex(studentId);
      for (const en of list) {
        const enrollmentId = String(en?.enrollmentId || en?._id || '');
        if (!enrollmentId) continue;
        targets.push({ studentId, enrollmentId });
      }
    }
    return targets;
  }, [isLatestMode, selectedStudentIds, mode, selectedLevels, grades, indexByStudentId]);

  const enrollmentTranscriptQueries = useQueries({
    queries: enrollmentTargets.map(({ studentId, enrollmentId }) => ({
      queryKey: transcriptKeys.enrollment(studentId, enrollmentId),
      enabled: Boolean(studentId)
        && Boolean(enrollmentId)
        && !isLatestMode
        && (mode !== 'levels' || selectedLevels.length > 0),
      queryFn: async () => getFullTranscript(studentId, { mode: 'full', enrollmentId }),
      staleTime: 60_000,
      placeholderData: (prev) => prev,
    })),
  });

  const enrollmentDataByStudentAndEnrollment = useMemo(() => {
    const map = {};
    for (let i = 0; i < enrollmentTargets.length; i += 1) {
      const { studentId, enrollmentId } = enrollmentTargets[i];
      const q = enrollmentTranscriptQueries[i];
      if (!map[studentId]) map[studentId] = {};
      map[studentId][enrollmentId] = q?.data || null;
    }
    return map;
  }, [enrollmentTargets, enrollmentTranscriptQueries]);

  // Toast (English) when Levels selection has no transcript for some grades.
  useEffect(() => {
    if (mode !== 'levels') return;
    if (!selectedLevels.length) return;
    if (!selectedStudentIds.length) return;

    const selectedNames = getLevelNamesForSelected();
    if (!selectedNames.length) return;

    const msgs = [];
    for (const studentId of selectedStudentIds) {
      const idx = indexByStudentId[String(studentId)];
      const enrolls = Array.isArray(idx?.enrollments) ? idx.enrollments : [];
      if (!enrolls.length) continue;
      const have = new Set(enrolls.map((en) => String(en?.gradeSection?.grade || '').toLowerCase()).filter(Boolean));
      const missing = selectedNames.filter((nm) => !have.has(String(nm).toLowerCase()));
      for (const nm of missing) msgs.push(t('transcript.page.toasts.gradeNoTranscript', { grade: nm }));
    }
    const unique = [...new Set(msgs)];
    if (!unique.length) return;

    const key = unique.join('|');
    if (noTranscriptToastKeyRef.current === key) return;
    noTranscriptToastKeyRef.current = key;

    toast.error(unique.length === 1 ? unique[0] : unique.join(' '));
  }, [mode, selectedLevels, selectedStudentIds, grades, indexByStudentId]);

  // Load lookups once for labels + levels
  useEffect(() => {
    (async () => {
      try {
        const gRes = await getGrades?.();
        if (gRes) {
          const gData = Array.isArray(gRes?.data) ? gRes.data : (gRes?.data || gRes || []);
          setGrades(gData);
        }
        const sRes = await getShifts?.();
        if (sRes) {
          const sData = Array.isArray(sRes?.data) ? sRes.data : (sRes?.data || sRes || []);
          setShifts(sData);
        }
      } catch {
        toast.error(t('transcript.page.errors.loadLookupsFailed'));
      }
    })();
  }, []);

  // Load cohort timeline when cohort selected
  useEffect(() => {
    (async () => {
      if (!cohortId) { setTimeline([]); setActiveTimelineIndex(-1); return; }
      setTimelineLoading(true);
      const { data } = await getCohortTimeline(cohortId);
      setTimelineLoading(false);
      const next = data || [];
      setTimeline(next);

      // Auto-apply first timeline segment when a cohort is selected.
      if (Array.isArray(next) && next.length > 0) {
        const first = next[0];
        setActiveTimelineIndex(0);
        const ay = first?.academicYear?._id;
        const g = first?.grade?._id;
        const sh = first?.shift?._id;
        const gs = first?.gradeSection?._id;
        if (ay) setAcademicYearId(String(ay));
        if (g) setGradeId(String(g));
        if (sh) setShiftId(String(sh));
        if (gs) setGradeSectionId(String(gs));

        const hint = String(first?.statusHint || '').toLowerCase();
        if (hint && ['active', 'inactive', 'promoted', 'graduated', 'transferred', 'withdrawn'].includes(hint)) {
          setEnrollmentStatus(hint);
        }
      }
    })();
  }, [cohortId]);

  // Suggest students based on search once all required filters completed
  const suggTimer = useRef(null);
  const lastFilterKeyRef = useRef('');

  useEffect(() => {
    if (suggTimer.current) clearTimeout(suggTimer.current);
    suggTimer.current = setTimeout(async () => {
      try {
        // For roster suggestions, gradeSectionId is the authoritative "class" filter.
        const filtersComplete = Boolean(gradeSectionId);
        // Build a key representing current filter combo to allow re-auto-open when any changes
        const filterKey = [enrollmentStatus, academicYearId, gradeId, shiftId, gradeSectionId, cohortId, activeTimelineIndex].join('|');
        if (filterKey !== lastFilterKeyRef.current) {
          // allow auto-open again when any upstream filter changes (including timeline segment)
          hasAutoOpenedRef.current = false;
          lastFilterKeyRef.current = filterKey;
        }
        // Allow searching by name/ID even if filters not complete; but require filtersComplete for class auto list
        if (!filtersComplete && !search) { setSuggestions([]); setShowSuggestions(false); return; }
        const params = { page: 1, limit: 200 };

        // Core roster query
        if (gradeSectionId) {
          params.gradeSectionId = gradeSectionId;
          // When Academic Year is selected, roster must reflect enrollments in that year.
          if (academicYearId) params.academicYear = academicYearId;
          // If cohort is selected, keep roster aligned with cohort/timeline selection.
          if (cohortId) params.cohortId = cohortId;
        } else {
          // If no class selected yet, use broader filters (mainly for free-text search).
          if (academicYearId) params.academicYear = academicYearId;
          if (cohortId) params.cohortId = cohortId;
        }

        // 'all' means: do not constrain by status.
        if (enrollmentStatus && enrollmentStatus !== 'all') params.enrollmentStatus = enrollmentStatus;
        if (search) params.search = search;

        // After filters complete, we always fetch suggestions (even without search) to allow immediate class selection
        const res = await listStudents(params);
        const list = res?.data || [];
        setSuggestions(list);
        const shouldShow = list.length > 0 && (isPickerOpen || Boolean(search));
        setShowSuggestions(shouldShow);
        // Auto-open picker once per filter completion cycle (even if empty; user expects it to open).
        if (!hasAutoOpenedRef.current && filtersComplete && !isPickerOpen) {
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
  }, [search, enrollmentStatus, academicYearId, gradeId, shiftId, gradeSectionId, cohortId, activeTimelineIndex, isPickerOpen]);

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

  // Transcript data is now React Query-backed per selected student.

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

  const outlineBtn = '!bg-white !text-blue-700 !border-blue-400 hover:!bg-blue-50';
  const canExport = Boolean(
    canPrintTranscript
    && selectedStudentIds.length > 0
    && (mode !== 'levels' || selectedLevels.length > 0)
  );

  const getTranscriptEnrollmentsForDisplay = (dataObj) => {
    const enrolls = getFilteredEnrollments(dataObj);
    if (mode !== 'levels' || !selectedLevels.length) return enrolls;

    return (enrolls || []).filter((en) => {
      const directGrade = en.grade?._id || en.grade;
      const gsGradeObj = en.gradeSection?.grade?._id || en.gradeSection?.grade;
      const gsGradeIdField = en.gradeSection?.gradeId;
      const gsGradeNameField = en.gradeSection?.grade;
      const candidates = [directGrade, gsGradeObj, gsGradeIdField, gsGradeNameField]
        .filter(Boolean)
        .map((x) => String(x));
      const allowedNames = grades
        .filter((g) => selectedLevels.includes(String(g._id || g.id)))
        .map((g) => String(g.gradeName || g.name))
        .filter(Boolean);
      return candidates.some((c) => selectedLevels.includes(c) || allowedNames.includes(c));
    });
  };

  const buildTranscriptTablesExportPayload = async () => {
    if (!canExport) return null;

    const safeMode = String(mode || 'transcript').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
    const scopeTag = gradeSectionId ? 'class' : (selectedStudentIds.length > 1 ? 'multi' : 'student');
    const safeStatus = String(`${scopeTag}-${enrollmentStatus || 'status'}`)
      .replace(/[^a-z0-9_-]+/gi, '-')
      .toLowerCase();
    const safeDate = new Date().toISOString().slice(0, 10);

    const tables = [];
    const sheets = [];

    // Snapshot-only export: include what is currently visible (already loaded).
    // This keeps buttons fast and avoids extra loading.
    for (let sIdx = 0; sIdx < (selectedStudents || []).length; sIdx++) {
      const sel = (selectedStudents || [])[sIdx];
      const studentId = String(sel?._id || '');
      let enrollmentsForExport = [];

      if (isLatestMode) {
        const latestResp = latestTranscripts[studentId];
        const ok = latestResp?.ok && latestResp?.data;
        const dataObj = ok ? latestResp.data : null;
        enrollmentsForExport = getTranscriptEnrollmentsForDisplay(dataObj);
      } else {
        const metaEnrolls = getTargetEnrollmentsFromIndex(studentId);
        enrollmentsForExport = (metaEnrolls || []).map((meta) => {
          const enrollmentId = String(meta?.enrollmentId || meta?._id || '');
          if (!enrollmentId) return null;
          const resp = enrollmentDataByStudentAndEnrollment?.[studentId]?.[enrollmentId];
          if (!(resp?.ok && resp?.data)) return null;
          return resp.data?.enrollments?.[0] || null;
        }).filter(Boolean);
      }

      let isFirstEnrollmentForStudent = true;

      for (const en of (enrollmentsForExport || [])) {
        const examTypesSorted = [...(en.transcript?.examTypes || [])].sort((a, b) => {
          const ao = Number(a?.order || 0);
          const bo = Number(b?.order || 0);
          if (ao !== bo) return ao - bo;
          return String(a?.typeName || '').localeCompare(String(b?.typeName || ''));
        });

        const headers = [
          t('common.filters.subject'),
          ...examTypesSorted.map((et) => et.typeName),
          t('transcript.page.table.total'),
          t('results.page.table.average'),
        ];

        const transcriptRows = Array.isArray(en.transcript?.rows) ? en.transcript.rows : [];
        const rows = transcriptRows.map((row) => {
          const examCells = examTypesSorted.map((et) => {
            const cell = (row.exams || []).find((x) => String(x.examTypeId) === String(et._id));
            return Number(cell?.score || 0).toFixed(2);
          });
          return [
            row.subjectName || '',
            ...examCells,
            Number(row.total || 0).toFixed(2),
            Number(row.average || 0).toFixed(2),
          ];
        });

        // Overall row (matches UI)
        rows.push([
          t('transcript.page.table.overall'),
          ...examTypesSorted.map(() => ''),
          Number(en.transcript?.overall?.total || 0).toFixed(2),
          Number(en.transcript?.overall?.average || 0).toFixed(2),
        ]);

        const tableTitle = `${sel?.fullName || ''} (${sel?.studentId || ''})`;
        const tableSubtitle = [
          `${t('common.filters.academicYear')}: ${en.academicYear?.yearName || '-'}`,
          `${t('common.filters.grade')}: ${en.gradeSection?.grade || '-'}`,
          `${t('common.filters.section')}: ${en.gradeSection?.section || '-'}`,
          `${t('common.filters.shift')}: ${en.gradeSection?.shift || '-'}`,
          `${t('common.filters.status')}: ${formatEnrollmentStatus(en.status) || ''}`,
        ].join(' • ');

        const pageBreakBefore = isFirstEnrollmentForStudent && sIdx > 0;
        // Keep the full title in payload for Excel/Copy, but allow PDF to suppress repeats.
        tables.push({
          title: tableTitle,
          subtitle: tableSubtitle,
          headers,
          rows,
          pageBreakBefore,
          pdfHideTitle: !isFirstEnrollmentForStudent,
        });
        isFirstEnrollmentForStudent = false;

        // One Excel sheet per enrollment table (closest to "as-is")
        const baseSheetName = `${sel?.studentId || t('common.studentFallback')} ${en.academicYear?.yearName || ''}`.trim();
        sheets.push({
          sheetName: baseSheetName,
          title: tableTitle,
          subtitle: tableSubtitle,
          headers,
          rows,
        });
      }
    }

    if (!tables.length) {
      toast.error(t('transcript.page.toasts.nothingToExportYet'));
      return null;
    }

    return {
      filename: `transcript-${safeMode}-${safeStatus}-${safeDate}.pdf`,
      // Backwards-compatible single-table fields (not used when tables/sheets exist)
      sheetName: t('transcript.page.export.sheetName'),
      title: '',
      subtitle: '',
      headerImageSrc: headerImg,
      headers: [],
      rows: [],
      tables,
      sheets,
    };
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
    try {
      // Remove all transcript caches for this student (latest/index/per-enrollment).
      queryClient.removeQueries({ queryKey: transcriptKeys.studentBase(id) });
    } catch {
      // ignore
    }
  };

  const handlePrint = () => {
    if (!canPrintTranscript) {
      toast.error(t('transcript.page.errors.noPermissionPrint'));
      return;
    }
    setTimeout(() => window.print(), 0);
  };
  const handleReset = () => {
    setSearch('');
    setDropdownSearch('');
    setSelectedStudents([]);
    setSuggestions([]);
    setShowSuggestions(false);
    setIsPickerOpen(false);
    setMode('latest');
    setAcademicYearId('');
    resetLower('ay');
    setEnrollmentStatus('active');
    setCohortId('');
    setTimeline([]);
    setActiveTimelineIndex(-1);
    manualSelectionRef.current = false;
    hasAutoOpenedRef.current = false;
    setSelectedLevels([]);
    setLevelsOpen(false);

    try {
      queryClient.removeQueries({ queryKey: transcriptKeys.all });
    } catch {
      // ignore
    }
  };

  const StudentTranscriptSkeleton = () => (
    <div className="space-y-3">
      <div className="space-y-2">
        <Skeleton className="h-6 w-64 mx-auto" />
        <Skeleton className="h-4 w-40 mx-auto" />
      </div>
      <div className="rounded-(--nb-radius-md) border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="mt-3">
          <LoadingState
            variant="table"
            message={mode === 'latest'
              ? t('transcript.page.states.loadingLastTranscript')
              : (mode === 'levels'
                ? t('transcript.page.states.loadingTranscriptsLevels')
                : t('transcript.page.states.loadingFullTranscript'))}
            rows={6}
            columns={6}
          />
        </div>
      </div>
    </div>
  );

  const EnrollmentTableSkeleton = () => (
    <div className="rounded-(--nb-radius-md) border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="mt-3">
        <LoadingState
          variant="table"
          message={mode === 'levels'
            ? t('transcript.page.states.loadingTranscriptsLevels')
            : t('transcript.page.states.loadingFullTranscript')}
          rows={6}
          columns={6}
        />
      </div>
    </div>
  );

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
        <EnrollmentCohortToolbar
          enrollmentStatus={enrollmentStatus}
          onEnrollmentStatusChange={(v) => setEnrollmentStatus(v || 'active')}
          cohortId={cohortId}
          onCohortChange={(v) => {
            const next = v || '';
            setCohortId(next);
            setActiveTimelineIndex(-1);
          }}
          cohortPlaceholder={t('students.cohortOptional')}
          cohortSelectId="transcript-cohort"
          cohortSelectName="transcript-cohort"
          cohortSelectProps={{
            searchable: true,
            maxVisible: 5,
          }}
          className="mt-0"
        />

        <div className="mt-3">
          <FilterRow className="gap-3">
            <FilterItem grow minWidthClass="sm:min-w-40">
              <AcademicYearSelect
                id="transcript-ay"
                name="academicYearId"
                value={academicYearId}
                onChange={(v) => {
                  setAcademicYearId(v);
                  resetLower('ay');
                  setCohortId('');
                  setActiveTimelineIndex(-1);
                }}
                placeholder={t('common.filters.academicYear')}
                searchable
                maxVisible={5}
                searchPlaceholder={t('common.searchPlaceholders.academicYears')}
                className="w-full"
              />
            </FilterItem>

            <FilterItem minWidthClass="sm:min-w-44">
              <DropdownSelect
                value={gradeId}
                onChange={(v) => { setGradeId(v); resetLower('grade'); setActiveTimelineIndex(-1); }}
                placeholder={t('common.filters.level')}
                options={[...(grades || [])]
                  .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                  .map((g) => ({ value: g._id, label: g.gradeName }))}
              />
            </FilterItem>

            <FilterItem minWidthClass="sm:min-w-44">
              <FilterDropdownSelect
                value={shiftId}
                onChange={(v) => { setShiftId(v); resetLower('shift'); setActiveTimelineIndex(-1); }}
                placeholder={t('common.filters.shift')}
                options={(shifts || []).map((s) => ({ value: s._id, label: s.shiftName }))}
                maxVisible={5}
              />
            </FilterItem>

            <FilterItem minWidthClass="sm:min-w-56">
              <FilterDropdownSelect
                value={gradeSectionId}
                onChange={(v) => { setGradeSectionId(v); setActiveTimelineIndex(-1); }}
                placeholder={t('common.filters.section')}
                disabled={!gradeId || !shiftId || loadingSections}
                options={(effectiveSections || []).map((gs) => {
                  const gradeName = gs?.grade?.gradeName;
                  const sectionNum = gs?.section;
                  const shiftName = gs?.shift?.shiftName;
                  const tail = [shiftName].filter(Boolean).join(' - ');
                  const label = [
                    gradeName ? `${gradeName}` : null,
                    sectionNum ? `${t('common.sectionPrefix')} ${sectionNum}` : null,
                    tail ? `(${tail})` : null,
                  ].filter(Boolean).join(' - ');
                  return { value: gs._id, label: label || gs.sectionName || t('common.filters.section') };
                })}
                maxVisible={5}
                searchPlaceholder={t('common.searchPlaceholders.sections')}
              />
            </FilterItem>
          </FilterRow>
        </div>

        {cohortId ? (
          <Card className="p-3 mt-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">{t('transcript.page.timeline.title')}</div>
              {timelineLoading ? <div className="text-xs text-gray-500">{t('common.loading')}</div> : null}
            </div>
            {!timelineLoading && (!timeline || timeline.length === 0) ? (
              <div className="text-sm text-gray-500 mt-2">{t('transcript.page.timeline.noData')}</div>
            ) : null}
            {Array.isArray(timeline) && timeline.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {timeline.map((entry, idx) => {
                  const key = `${entry?.academicYear?._id}-${entry?.gradeSection?._id}-${idx}`;
                  const label = [
                    entry?.academicYear?.yearName,
                    entry?.grade?.gradeName,
                    entry?.shift?.shiftName,
                    entry?.gradeSection?.section ? `${t('common.sectionPrefix')} ${entry.gradeSection.section}` : null,
                    entry?.statusHint ? `(${formatStatusHint(entry.statusHint)})` : null,
                  ].filter(Boolean).join(' - ');
                  const isActive = activeTimelineIndex === idx;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setActiveTimelineIndex(idx);
                        const ay = entry?.academicYear?._id;
                        const g = entry?.grade?._id;
                        const sh = entry?.shift?._id;
                        const gs = entry?.gradeSection?._id;
                        if (ay) setAcademicYearId(String(ay));
                        if (g) setGradeId(String(g));
                        if (sh) setShiftId(String(sh));
                        if (gs) setGradeSectionId(String(gs));

                        const hint = String(entry?.statusHint || '').toLowerCase();
                        if (hint && ['active', 'inactive', 'promoted', 'graduated', 'transferred', 'withdrawn'].includes(hint)) {
                          setEnrollmentStatus(hint);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-md text-sm border ${isActive ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      title={label || t('transcript.page.timeline.itemFallback')}
                    >
                      {label || t('transcript.page.timeline.itemFallback')}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </Card>
        ) : null}

        <div className="mt-3 flex flex-row flex-wrap items-end w-full gap-3">
          <div className="flex-1 min-w-[320px]" ref={pickerRef}>
            <FormField label={t('transcript.page.studentPicker.searchLabel')} htmlFor="transcript-search">
              <div className="relative">
                <Input
                  id="transcript-search"
                  name="transcript-search"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={t('students.searchPlaceholder')}
                  className="pr-28"
                />
                <div className="absolute right-1 top-1.5 flex gap-1">
                  <ActionButton
                    variant="neutral"
                    onClick={() => {
                      setIsPickerOpen((v) => !v);
                      setShowSuggestions(true);
                    }}
                    title={t('transcript.page.studentPicker.openClassListTitle')}
                    className="text-xs"
                  >
                    {t('transcript.page.studentPicker.selectFromClass')}
                  </ActionButton>
                </div>

                {(isPickerOpen || (showSuggestions && suggestions.length > 0)) && (
                  <Card className="absolute left-0 right-0 top-full mt-1 z-50 max-h-72 overflow-auto">
                    <div className="sticky top-0 bg-white border-b px-2 py-1 flex items-center gap-2">
                      <Input
                        id="transcript-student-filter"
                        name="transcript-student-filter"
                        aria-label={t('common.aria.filterSuggestedStudents', { defaultValue: 'Filter suggested students' })}
                        value={dropdownSearch}
                        onChange={(e) => setDropdownSearch(e.target.value)}
                        placeholder={t('transcript.page.studentPicker.filterListPlaceholder')}
                        className="text-sm"
                      />
                    </div>
                    {(() => {
                      const q = dropdownSearch.toLowerCase();
                      const list = (suggestions || []).filter((s) => !q
                        || s.fullName?.toLowerCase().includes(q)
                        || String(s.studentId).toLowerCase().includes(q));
                      if (!list.length) return <div className="px-3 py-2 text-sm text-gray-500">{t('transcript.page.studentPicker.noStudentsFound')}</div>;
                      return list.map((s) => {
                        const checked = selectedStudents.some((x) => x._id === s._id);
                        return (
                          <label key={s._id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={checked}
                                onChange={() => (checked ? removeStudent(s._id) : addStudent(s))}
                                aria-label={t('transcript.page.studentPicker.selectStudentAria', { name: s.fullName })}
                              />
                              <span>{s.fullName} <span className="text-gray-500">({s.studentId})</span></span>
                            </div>
                            {s.gradeDisplay && <span className="text-xs text-gray-500">{s.gradeDisplay}</span>}
                          </label>
                        );
                      });
                    })()}
                  </Card>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedStudents.map((s) => (
                  <Chip
                    key={s._id}
                    onRemove={() => removeStudent(s._id)}
                    removeLabel={t('transcript.page.studentPicker.removeStudentAria', { name: s.fullName })}
                  >
                    {s.fullName} ({s.studentId})
                  </Chip>
                ))}
              </div>
            </FormField>
          </div>
        </div>

        <div className="mt-3 w-full flex items-center justify-between gap-2 flex-wrap">
          <div className="flex flex-row flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <Radio name="transcript-mode" checked={mode === 'full'} onChange={() => setMode('full')} />
              <span>{t('transcript.page.modes.full')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Radio name="transcript-mode" checked={mode === 'latest'} onChange={() => setMode('latest')} />
              <span>{t('transcript.page.modes.latest')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Radio name="transcript-mode" checked={mode === 'levels'} onChange={() => setMode('levels')} />
              <span>{t('transcript.page.modes.levels')}</span>
            </label>
            <div className="relative flex items-center gap-2" ref={levelsRef}>
              <button
                type="button"
                disabled={mode !== 'levels'}
                onClick={() => mode === 'levels' && setLevelsOpen((o) => !o)}
                className={`px-2 py-1 border rounded text-xs flex items-center gap-1 ${mode === 'levels' ? 'bg-gray-50 hover:bg-gray-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                {t('transcript.page.levels.levelsButton')} {selectedLevels.length ? <span className="text-indigo-600">({selectedLevels.length})</span> : null}
              </button>
              {levelsOpen && mode === 'levels' && (
                <Card className="absolute z-40 mt-1 w-48 max-h-64 overflow-auto">
                  <div className="sticky top-0 bg-white border-b px-2 py-1 text-xs font-medium">{t('transcript.page.levels.selectTitle')}</div>
                  {(!grades || grades.length === 0) && <div className="px-3 py-2 text-xs text-gray-500">{t('transcript.page.levels.noGrades')}</div>}
                  {grades && [...grades]
                    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                    .map((g) => {
                      const id = String(g._id || g.id);
                      const checked = selectedLevels.includes(id);
                      return (
                        <label key={id} className="flex items-center gap-2 px-3 py-1 text-xs hover:bg-gray-50 cursor-pointer">
                          <Checkbox checked={checked} onChange={() => setSelectedLevels((prev) => (checked ? prev.filter((x) => x !== id) : [...prev, id]))} />
                          <span>{g.gradeName || g.name || t('common.filters.grade')}</span>
                        </label>
                      );
                    })}
                  {selectedLevels.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedLevels([])}
                      className="m-2 mt-1 px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 w-[calc(100%-1rem)]"
                    >{t('common.actions.clear')}</button>
                  )}
                </Card>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 flex-nowrap overflow-x-auto w-full sm:w-auto">
            {canPrintTranscript ? (
              <ActionButton variant="neutral" className={outlineBtn} onClick={handlePrint} title={t('common.actions.print')} icon={<Printer size={16} />}>
                {t('common.actions.print')}
              </ActionButton>
            ) : null}

            <PdfDownloadButton getPayload={buildTranscriptTablesExportPayload} disabled={!canExport} className={outlineBtn} orientation="landscape" />
            <ExcelDownloadButton getPayload={buildTranscriptTablesExportPayload} disabled={!canExport} className={outlineBtn} />
            <CopyTableButton getPayload={buildTranscriptTablesExportPayload} disabled={!canExport} className={outlineBtn} />

            <ActionButton variant="neutral" className={outlineBtn} onClick={handleReset} title={t('common.filters.resetTitle')} icon={<RotateCcw size={16} />}>
              {t('common.actions.reset')}
            </ActionButton>
          </div>
        </div>
      </Card>

  <Card className="p-4 print:shadow-none print:p-0 print-container">
        {selectedStudents.length > 0 && (
          <div className="space-y-8 print-two" style={{ breakInside: 'auto' }}>
            {(() => {
              return selectedStudents.map((sel) => {
                const studentId = String(sel._id);

                // LATEST mode: single request per student.
                if (isLatestMode) {
                  const q = latestTranscriptQueryById[studentId];
                  const isBusy = Boolean(q?.isLoading || q?.isFetching);
                  const hasData = Boolean(q?.data);
                  if (isBusy && !hasData) {
                    return (
                      <div key={sel._id} className="space-y-3 student-block">
                        <div className="avoid-break"><StudentTranscriptSkeleton /></div>
                      </div>
                    );
                  }
                  const latestResp = latestTranscripts[studentId];
                  const ok = latestResp?.ok && latestResp?.data;
                  const dataObj = ok ? latestResp.data : null;
                  const filteredEnrolls = getTranscriptEnrollmentsForDisplay(dataObj);
                  return (
                    <div key={sel._id} className="space-y-3 student-block">
                      <div className="print:text-center avoid-break">
                        <h2 className="text-2xl font-semibold">{sel.fullName}</h2>
                        <p className="text-sm text-gray-500">{t('transcript.page.labels.studentId')}: {sel.studentId}</p>
                      </div>
                      {(!ok || filteredEnrolls.length === 0) && (
                        <Alert variant="neutral">{t('transcript.page.emptyStates.noTranscriptData')}</Alert>
                      )}
                      {ok && filteredEnrolls.map((en, idx) => (
                        <section key={en.enrollmentId || idx} className="p-3 avoid-break">
                          <div className="border-b pb-2 mb-2 text-sm flex flex-wrap gap-x-4 gap-y-1">
                            <span><span className="font-medium">{t('common.filters.academicYear')}:</span> {en.academicYear?.yearName || '-'}</span>
                            <span><span className="font-medium">{t('common.filters.grade')}:</span> {en.gradeSection?.grade || '-'}</span>
                            <span><span className="font-medium">{t('common.filters.section')}:</span> {en.gradeSection?.section || '-'}</span>
                            <span><span className="font-medium">{t('common.filters.shift')}:</span> {en.gradeSection?.shift || '-'}</span>
                            <span><span className="font-medium">{t('common.filters.status')}:</span> {formatEnrollmentStatus(en.status) || '-'}</span>
                          </div>
                          <div className="overflow-x-auto mt-3">
                            {(() => {
                              const examTypesSorted = [...(en.transcript?.examTypes || [])].sort((a, b) => {
                                const ao = Number(a?.order || 0);
                                const bo = Number(b?.order || 0);
                                if (ao !== bo) return ao - bo;
                                return String(a?.typeName || '').localeCompare(String(b?.typeName || ''));
                              });

                              const transcriptRows = en.transcript?.rows || [];
                              const rowsWithOverall = [...transcriptRows, { __type: 'overall' }];

                          const columns = [
                            {
                              key: 'subject',
                              label: t('common.filters.subject'),
                              thClassName: 'text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700',
                              tdClassName: 'px-4 py-3 border-x border-gray-700',
                            },
                            ...examTypesSorted.map((et) => ({
                              key: `et:${String(et._id)}`,
                              label: et.typeName,
                              align: 'right',
                              thClassName: 'text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700',
                              tdClassName: 'text-right px-4 py-3 border-x border-gray-700',
                              _etId: String(et._id),
                            })),
                            {
                              key: 'total',
                              label: t('transcript.page.table.total'),
                              align: 'right',
                              thClassName: 'text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700',
                              tdClassName: 'text-right px-4 py-3 border-x border-gray-700',
                            },
                            {
                              key: 'avg',
                              label: t('results.page.table.average'),
                              align: 'right',
                              thClassName: 'text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700',
                              tdClassName: 'text-right px-4 py-3 border-x border-gray-700',
                            },
                          ];

                              return (
                                <StandardTable
                                  isLoading={false}
                                  items={transcriptRows}
                                  emptyTitle={t('transcript.page.emptyStates.noTranscriptRows')}
                                  rows={rowsWithOverall}
                                  columns={columns}
                                  getRowKey={(row) => row?.__type === 'overall' ? 'overall' : String(row.subjectId)}
                                  renderCell={(row, col) => {
                                    if (row?.__type === 'overall') {
                                      if (col.key === 'subject') return <span className="block text-right">{t('transcript.page.table.overall')}</span>;
                                      if (String(col.key).startsWith('et:')) return '';
                                      if (col.key === 'total') return Number(en.transcript?.overall?.total || 0).toFixed(2);
                                      if (col.key === 'avg') return Number(en.transcript?.overall?.average || 0).toFixed(2);
                                      return '';
                                    }

                                    if (col.key === 'subject') return row.subjectName;

                                    if (String(col.key).startsWith('et:')) {
                                      const etId = col._etId;
                                      const cell = (row.exams || []).find(x => String(x.examTypeId) === String(etId));
                                      return Number(cell?.score || 0).toFixed(2);
                                    }

                                    if (col.key === 'total') return Number(row.total || 0).toFixed(2);
                                    if (col.key === 'avg') return Number(row.average || 0).toFixed(2);
                                    return '';
                                  }}
                                  tableProps={{
                                    theadClassName: 'bg-gray-800',
                                    useDefaultHeaderStyles: false,
                                    baseRowClassName: 'border-t border-gray-700 odd:bg-white even:bg-gray-50',
                                    rowClassName: (row) => row?.__type === 'overall' ? 'font-medium border-t-2 border-gray-700' : '',
                                  }}
                                />
                              );
                            })()}
                          </div>
                        </section>
                      ))}
                    </div>
                  );
                }

                // FULL / LEVELS mode: progressive per-enrollment requests.
                if (mode === 'levels' && selectedLevels.length === 0) {
                  return (
                    <div key={sel._id} className="space-y-3 student-block">
                      <div className="print:text-center avoid-break">
                        <h2 className="text-2xl font-semibold">{sel.fullName}</h2>
                        <p className="text-sm text-gray-500">{t('transcript.page.labels.studentId')}: {sel.studentId}</p>
                      </div>
                      <Alert variant="neutral">{t('transcript.page.emptyStates.selectGrades')}</Alert>
                    </div>
                  );
                }

                const idxQ = indexQueryByStudentId[studentId];
                const idx = indexByStudentId[studentId];
                const idxEnrolls = Array.isArray(idx?.enrollments) ? idx.enrollments : [];
                const targetMeta = idxEnrolls.length ? getTargetEnrollmentsFromIndex(studentId) : [];

                // If we don't have any index yet, render a reasonable skeleton count.
                if ((!idxEnrolls.length) && Boolean(idxQ?.isLoading || idxQ?.isFetching) && !idxQ?.data) {
                  const fallbackCount = mode === 'levels' && selectedLevels.length ? selectedLevels.length : 1;
                  return (
                    <div key={sel._id} className="space-y-3 student-block">
                      {Array.from({ length: Math.max(1, fallbackCount) }).map((_, i) => (
                        <div key={i} className="avoid-break">
                          <StudentTranscriptSkeleton />
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                  <div key={sel._id} className="space-y-3 student-block">
                    <div className="print:text-center avoid-break">
                      <h2 className="text-2xl font-semibold">{sel.fullName}</h2>
                      <p className="text-sm text-gray-500">{t('transcript.page.labels.studentId')}: {sel.studentId}</p>
                    </div>

                    {targetMeta.length === 0 ? (
                      <Alert variant="neutral">{t('transcript.page.emptyStates.noTranscriptData')}</Alert>
                    ) : (
                      targetMeta.map((meta, idx2) => {
                        const enrollmentId = String(meta?.enrollmentId || meta?._id || idx2);
                        const resp = enrollmentDataByStudentAndEnrollment?.[studentId]?.[enrollmentId];
                        const ok = resp?.ok && resp?.data;
                        const en = ok ? (resp.data?.enrollments?.[0] || null) : null;

                        if (!en) {
                          return (
                            <section key={enrollmentId} className="p-3 avoid-break">
                              <div className="border-b pb-2 mb-2 text-sm flex flex-wrap gap-x-4 gap-y-1">
                                <span><span className="font-medium">{t('common.filters.academicYear')}:</span> {meta?.academicYear?.yearName || '-'}</span>
                                <span><span className="font-medium">{t('common.filters.grade')}:</span> {meta?.gradeSection?.grade || '-'}</span>
                                <span><span className="font-medium">{t('common.filters.section')}:</span> {meta?.gradeSection?.section || '-'}</span>
                                <span><span className="font-medium">{t('common.filters.shift')}:</span> {meta?.gradeSection?.shift || '-'}</span>
                                <span><span className="font-medium">{t('common.filters.status')}:</span> {formatEnrollmentStatus(meta?.status) || '-'}</span>
                              </div>
                              <div className="mt-3">
                                <EnrollmentTableSkeleton />
                              </div>
                            </section>
                          );
                        }

                        return (
                          <section key={en.enrollmentId || enrollmentId} className="p-3 avoid-break">
                            <div className="border-b pb-2 mb-2 text-sm flex flex-wrap gap-x-4 gap-y-1">
                              <span><span className="font-medium">{t('common.filters.academicYear')}:</span> {en.academicYear?.yearName || '-'}</span>
                              <span><span className="font-medium">{t('common.filters.grade')}:</span> {en.gradeSection?.grade || '-'}</span>
                              <span><span className="font-medium">{t('common.filters.section')}:</span> {en.gradeSection?.section || '-'}</span>
                              <span><span className="font-medium">{t('common.filters.shift')}:</span> {en.gradeSection?.shift || '-'}</span>
                              <span><span className="font-medium">{t('common.filters.status')}:</span> {formatEnrollmentStatus(en.status) || '-'}</span>
                            </div>
                            <div className="overflow-x-auto mt-3">
                              {(() => {
                                const examTypesSorted = [...(en.transcript?.examTypes || [])].sort((a, b) => {
                                  const ao = Number(a?.order || 0);
                                  const bo = Number(b?.order || 0);
                                  if (ao !== bo) return ao - bo;
                                  return String(a?.typeName || '').localeCompare(String(b?.typeName || ''));
                                });

                                const transcriptRows = en.transcript?.rows || [];
                                const rowsWithOverall = [...transcriptRows, { __type: 'overall' }];

                                const columns = [
                                  {
                                    key: 'subject',
                                    label: t('common.filters.subject'),
                                    thClassName: 'text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700',
                                    tdClassName: 'px-4 py-3 border-x border-gray-700',
                                  },
                                  ...examTypesSorted.map((et) => ({
                                    key: `et:${String(et._id)}`,
                                    label: et.typeName,
                                    align: 'right',
                                    thClassName: 'text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700',
                                    tdClassName: 'text-right px-4 py-3 border-x border-gray-700',
                                    _etId: String(et._id),
                                  })),
                                  {
                                    key: 'total',
                                    label: t('transcript.page.table.total'),
                                    align: 'right',
                                    thClassName: 'text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700',
                                    tdClassName: 'text-right px-4 py-3 border-x border-gray-700',
                                  },
                                  {
                                    key: 'avg',
                                    label: t('results.page.table.average'),
                                    align: 'right',
                                    thClassName: 'text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700',
                                    tdClassName: 'text-right px-4 py-3 border-x border-gray-700',
                                  },
                                ];

                                return (
                                  <StandardTable
                                    isLoading={false}
                                    items={transcriptRows}
                                    emptyTitle={t('transcript.page.emptyStates.noTranscriptRows')}
                                    rows={rowsWithOverall}
                                    columns={columns}
                                    getRowKey={(row) => row?.__type === 'overall' ? 'overall' : String(row.subjectId)}
                                    renderCell={(row, col) => {
                                      if (row?.__type === 'overall') {
                                        if (col.key === 'subject') return <span className="block text-right">{t('transcript.page.table.overall')}</span>;
                                        if (String(col.key).startsWith('et:')) return '';
                                        if (col.key === 'total') return Number(en.transcript?.overall?.total || 0).toFixed(2);
                                        if (col.key === 'avg') return Number(en.transcript?.overall?.average || 0).toFixed(2);
                                        return '';
                                      }

                                      if (col.key === 'subject') return row.subjectName;

                                      if (String(col.key).startsWith('et:')) {
                                        const etId = col._etId;
                                        const cell = (row.exams || []).find(x => String(x.examTypeId) === String(etId));
                                        return Number(cell?.score || 0).toFixed(2);
                                      }

                                      if (col.key === 'total') return Number(row.total || 0).toFixed(2);
                                      if (col.key === 'avg') return Number(row.average || 0).toFixed(2);
                                      return '';
                                    }}
                                    tableProps={{
                                      theadClassName: 'bg-gray-800',
                                      useDefaultHeaderStyles: false,
                                      baseRowClassName: 'border-t border-gray-700 odd:bg-white even:bg-gray-50',
                                      rowClassName: (row) => row?.__type === 'overall' ? 'font-medium border-t-2 border-gray-700' : '',
                                    }}
                                  />
                                );
                              })()}
                            </div>
                          </section>
                        );
                      })
                    )}

                    {/* Removed extra summary footer under table per request */}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </Card>

      <PrintFooter left={t('common.generatedBy')} />
    </div>
  );
}
