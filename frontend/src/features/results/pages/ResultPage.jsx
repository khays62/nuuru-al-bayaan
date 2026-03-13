import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getAcademicYears, getGrades, getShifts } from '../../lookups/api/lookups';
import { getGradeSectionById, listGradeSections } from '../../grades/api/gradeSections';
import { getExamSummaryAbort, getExamTypes } from '../../exams/api/exams';
import { getCohortTimeline } from '../../cohorts/api/cohorts';
import { useCascadingFilters } from '../../../hooks/useCascadingFilters';
import { useDebounce } from '../../../hooks/useDebounce';
import { getAssignments as getTeacherAssignments } from '../../teachers/api/teachersApi';
import AcademicYearSelect from '../../lookups/components/AcademicYearSelect';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import { RotateCcw, Printer } from 'lucide-react';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import PrintHeader from '../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../shared/components/print/PrintFooter.jsx';
import EnrollmentCohortToolbar from '../../../shared/components/filters/EnrollmentCohortToolbar.jsx';
import PdfDownloadButton from '../../../shared/components/exports/downloadButtons/PdfDownloadButton.jsx';
import ExcelDownloadButton from '../../../shared/components/exports/downloadButtons/ExcelDownloadButton.jsx';
import CsvDownloadButton from '../../../shared/components/exports/downloadButtons/CsvDownloadButton.jsx';
import CopyTableButton from '../../../shared/components/exports/downloadButtons/CopyTableButton.jsx';
import headerImg from '../../../assets/nuuruBayaanHeader.png';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';
import { useAuth } from '../../../auth/AuthContext';
import { useI18n } from '../../../i18n/useI18n';
import { teacherKeys } from '../../teachers/queryKeys.js';
import { useResultsRealtimeInvalidation } from '../useResultsRealtimeInvalidation.js';
import Card from '../../../shared/components/ui/Card.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import FilterDropdownSelect from '../../../shared/components/DataToolbar/FilterDropdownSelect.jsx';

const EMPTY_SUMMARY = Object.freeze({ results: [], classAverage: 0 });

export default function ResultPage() {
    const { t } = useI18n();
    const { auth, hasPermission } = useAuth();
    const role = String(auth?.user?.role || '').toLowerCase();
    const isTeacher = role === 'teacher';
    const isAdmin = role === 'admin';

    useResultsRealtimeInvalidation();

    // Requirement: teachers should be able to Print/Download results like admins.
    const canPrintResults = isAdmin || isTeacher || hasPermission('results', 'print');
    const canDownloadResults = isAdmin || isTeacher || hasPermission('results', 'download');

    // Persist filters in sessionStorage (not URL)
    const SESSION_KEY = 'results:filters:v1';
    const saved = (() => {
        try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}'); } catch { return {}; }
    })();
    const [resolvedTemplateVersion, setResolvedTemplateVersion] = useState('');

    // initialize from session storage if present (via cascading hook)
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
    } = useCascadingFilters({
        academicYearId: saved.ay || '',
        gradeId: saved.g || '',
        shiftId: saved.sh || '',
        gradeSectionId: saved.gs || '',
    });
    const [subjectId, setSubjectId] = useState(saved.sub || '');
    const [examTypeId, setExamTypeId] = useState(saved.et || '');
    const [enrollmentStatus, setEnrollmentStatus] = useState(saved.es || 'active');
    const [cohortId, setCohortId] = useState(saved.coh || '');
    const [timeline, setTimeline] = useState([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const applyingTimelineRef = useRef(false);
    const lastNoMarksToastKeyRef = useRef('');

    const teacherSectionsQuery = useQuery({
        queryKey: teacherKeys.gradeSections({ limit: 200 }),
        enabled: Boolean(isTeacher),
        queryFn: async () => {
            const res = await listGradeSections({ limit: 200 });
            return Array.isArray(res?.data) ? res.data : [];
        },
        placeholderData: (prev) => prev,
    });

    const assignmentsQuery = useQuery({
        queryKey: teacherKeys.assignments(String(auth?.user?.teacherRef || '')),
        enabled: Boolean(isTeacher && auth?.user?.teacherRef),
        queryFn: async ({ signal }) => {
            const res = await getTeacherAssignments(auth.user.teacherRef, {}, { signal });
            return Array.isArray(res?.data) ? res.data : [];
        },
        placeholderData: (prev) => prev,
    });

    const teacherSections = useMemo(() => teacherSectionsQuery.data ?? [], [teacherSectionsQuery.data]);
    const teacherSectionsLoading = teacherSectionsQuery.isLoading;
    const teacherAssignments = useMemo(() => assignmentsQuery.data ?? [], [assignmentsQuery.data]);
    const teacherAssignmentsLoading = assignmentsQuery.isLoading;

    useEffect(() => {
        if (!isTeacher) return;
        if (enrollmentStatus !== 'active') setEnrollmentStatus('active');
    }, [isTeacher, enrollmentStatus]);

    useEffect(() => {
        if (!isTeacher) return;
        // Teacher should not use cohort filter
        if (cohortId) setCohortId('');
    }, [isTeacher, cohortId]);

    // teacherSections + teacherAssignments are now React Query-backed.

    useEffect(() => {
        if (!isTeacher) return;
        // Teachers don't filter by grade/shift; keep the UI scoped to assigned sections.
        setGradeId('');
        setShiftId('');
    }, [isTeacher, setGradeId, setShiftId]);

    useEffect(() => {
        if (!isTeacher) return;
        if (!gradeSectionId) return;
        const ok = (teacherSections || []).some((s) => String(s?._id) === String(gradeSectionId));
        if (!ok) setGradeSectionId('');
    }, [isTeacher, gradeSectionId, teacherSections, setGradeSectionId]);

    const teacherAllowedSubjectIds = useMemo(() => {
        if (!isTeacher) return null;
        if (!gradeSectionId) return new Set();
        const set = new Set();
        for (const a of (teacherAssignments || [])) {
            if (String(a?.gradeSection?._id) !== String(gradeSectionId)) continue;
            if (a?.subject?._id) set.add(String(a.subject._id));
        }
        return set;
    }, [isTeacher, gradeSectionId, teacherAssignments]);

    useEffect(() => {
        if (!isTeacher) return;
        if (!subjectId) return;
        if (!teacherAllowedSubjectIds) return;
        if (teacherAllowedSubjectIds.size === 0) { setSubjectId(''); return; }
        if (!teacherAllowedSubjectIds.has(String(subjectId))) setSubjectId('');
    }, [isTeacher, subjectId, teacherAllowedSubjectIds]);

    // Modes: subject | overall | examType | top | bottom (first four requested)
    const [mode, setMode] = useState(saved.mode || 'subject');
    const [topN, setTopN] = useState(Number(saved.top || 0));
    const [bottomN, setBottomN] = useState(Number(saved.bot || 0));

    // loading + summary are now React Query-backed.

    // Transcript modal removed from Results; use dedicated Transcript page instead

    const yearsQuery = useQuery({
        queryKey: ['academicYears'],
        queryFn: async () => {
            const ys = await getAcademicYears();
            return Array.isArray(ys) ? ys : (ys?.data || []);
        },
        placeholderData: (prev) => prev,
    });

    const gradesQuery = useQuery({
        queryKey: ['grades'],
        queryFn: async () => {
            const gs = await getGrades();
            return Array.isArray(gs) ? gs : (gs?.data || []);
        },
        placeholderData: (prev) => prev,
    });

    const shiftsQuery = useQuery({
        queryKey: ['shifts'],
        queryFn: async () => {
            const ss = await getShifts();
            return Array.isArray(ss) ? ss : (ss?.data || []);
        },
        placeholderData: (prev) => prev,
    });

    const years = yearsQuery.data || [];
    const grades = gradesQuery.data || [];
    const shifts = shiftsQuery.data || [];

    const gradeSectionQuery = useQuery({
        queryKey: teacherKeys.gradeSectionById(gradeSectionId),
        enabled: Boolean(gradeSectionId),
        queryFn: async () => {
            const { ok, data, error } = await getGradeSectionById(gradeSectionId);
            if (!ok) throw new Error(error || t('results.page.errors.loadSubjectsFailed'));
            return data;
        },
        placeholderData: (prev) => prev,
    });

    const subjects = Array.isArray(gradeSectionQuery.data?.subjects) ? gradeSectionQuery.data.subjects : [];

    const selectedSectionForLabels = useMemo(() => {
        const byId = gradeSectionQuery.data;
        if (byId && String(byId?._id) === String(gradeSectionId)) return byId;
        return (sections || []).find(s => String(s._id) === String(gradeSectionId)) || null;
    }, [gradeSectionId, gradeSectionQuery.data, sections]);

    const examTypesQuery = useQuery({
        queryKey: teacherKeys.examTypes({ academicYearId, gradeSectionId, templateVersion: resolvedTemplateVersion }),
        enabled: Boolean(academicYearId && gradeSectionId),
        queryFn: async () => {
            const et = resolvedTemplateVersion
                ? await getExamTypes({ templateVersion: resolvedTemplateVersion })
                : await getExamTypes({ academicYearId, gradeSectionId });
            return Array.isArray(et) ? et : (et?.data || []);
        },
        placeholderData: (prev) => prev,
    });

    const examTypes = useMemo(() => examTypesQuery.data ?? [], [examTypesQuery.data]);

    // Persist filters to sessionStorage
    useEffect(() => {
        const payload = { ay: academicYearId, g: gradeId, sh: shiftId, gs: gradeSectionId, sub: subjectId, et: examTypeId, mode, top: topN, bot: bottomN, es: enrollmentStatus, coh: cohortId };
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload)); } catch (err) { void err; }
    }, [academicYearId, gradeId, shiftId, gradeSectionId, subjectId, examTypeId, mode, topN, bottomN, enrollmentStatus, cohortId]);

    // Load cohort timeline whenever cohort changes
    useEffect(() => {
        (async () => {
            if (!cohortId) { setTimeline([]); return; }
            setTimelineLoading(true);
            const { data } = await getCohortTimeline(cohortId);
            setTimelineLoading(false);
            setTimeline(data || []);
        })();
    }, [cohortId]);

    // Sections for selection
    // handled by useCascadingFilters

    // Subjects are React Query-backed; keep existing behavior of clearing subjectId when section changes.
    useEffect(() => {
        setSubjectId('');
    }, [gradeSectionId]);

    // Auto-fetch summary with debounce
    const handleReset = () => {
        try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
        setAcademicYearId('');
        setGradeId('');
        setShiftId('');
        setGradeSectionId('');
        setSubjectId('');
        setExamTypeId('');
        setMode('subject');
        setTopN(0);
        setBottomN(0);
        setEnrollmentStatus('active');
        setCohortId('');
        setTimeline([]);
    };
    const dAcademicYearId = useDebounce(academicYearId, 350);
    const dGradeSectionId = useDebounce(gradeSectionId, 350);
    const dSubjectId = useDebounce(subjectId, 350);
    const dExamTypeId = useDebounce(examTypeId, 350);
    const dMode = useDebounce(mode, 200);
    const dTopN = useDebounce(topN, 250);
    const dBottomN = useDebounce(bottomN, 250);
    const dEnrollmentStatus = useDebounce(enrollmentStatus, 250);
    const dCohortId = useDebounce(cohortId, 250);

    const summaryParams = useMemo(() => {
        const params = { academicYearId: dAcademicYearId, gradeSectionId: dGradeSectionId };
        if (dEnrollmentStatus) params.enrollmentStatus = dEnrollmentStatus;
        if (dCohortId) params.cohortId = dCohortId;
        if (dMode) params.mode = (dMode === 'examType' ? 'examType' : dMode);
        if (dMode === 'subject' && dSubjectId) params.subjectId = dSubjectId;
        if (dMode === 'examType' && dExamTypeId) params.examTypeId = dExamTypeId;
        if (dMode === 'top' && dTopN) params.topN = String(dTopN);
        if (dMode === 'bottom' && dBottomN) params.bottomN = String(dBottomN);
        return params;
    }, [dAcademicYearId, dGradeSectionId, dEnrollmentStatus, dCohortId, dMode, dSubjectId, dExamTypeId, dTopN, dBottomN]);

    const summaryEnabled = Boolean(
        summaryParams?.academicYearId &&
        summaryParams?.gradeSectionId &&
        !(dMode === 'subject' && !dSubjectId) &&
        !(dMode === 'examType' && !dExamTypeId) &&
        !((dMode === 'top' && (!dTopN || dTopN <= 0)) || (dMode === 'bottom' && (!dBottomN || dBottomN <= 0)))
    );

    const summaryQuery = useQuery({
        queryKey: teacherKeys.examSummary(summaryParams),
        enabled: summaryEnabled,
        queryFn: async ({ signal }) => {
            const { ok, data, error } = await getExamSummaryAbort(summaryParams, { signal });
            if (!ok) throw new Error(error || t('results.page.errors.loadSummaryFailed'));
            return data || { results: [], classAverage: 0 };
        },
        placeholderData: (prev) => prev,
    });

    const loading = Boolean(summaryQuery.isLoading && summaryQuery.data == null);
    const summary = useMemo(() => summaryQuery.data ?? EMPTY_SUMMARY, [summaryQuery.data]);
    const summaryErrorMessage = summaryQuery.error?.message;

    useEffect(() => {
        if (!summaryEnabled) return;
        if (!summaryQuery.isError) return;
        const msg = summaryErrorMessage || t('results.page.errors.loadSummaryFailed');
        if (String(msg).toLowerCase() !== 'aborted') toast.error(msg);
    }, [summaryEnabled, summaryQuery.isError, summaryErrorMessage, t]);

    useEffect(() => {
        const tv = summary?.templateVersion;
        if (tv && String(tv) !== String(resolvedTemplateVersion)) setResolvedTemplateVersion(String(tv));
    }, [summary, resolvedTemplateVersion]);

    useEffect(() => {
        if (!summaryEnabled) return;
        // Avoid toasting while loading a new key or while placeholder data is shown.
        if (summaryQuery.isFetching) return;
        if (summaryQuery.isPlaceholderData) return;
        if (!summaryQuery.isSuccess) return;
        const key = [
            summaryParams?.academicYearId,
            summaryParams?.gradeSectionId,
            summaryParams?.mode,
            summaryParams?.subjectId,
            summaryParams?.examTypeId,
            summaryParams?.enrollmentStatus,
            summaryParams?.cohortId,
            String(summaryParams?.topN || 0),
            String(summaryParams?.bottomN || 0),
        ].join('|');
        const hasNoMarks = Array.isArray(summary?.results) && summary.results.length === 0;
        if (hasNoMarks && lastNoMarksToastKeyRef.current !== key) {
            lastNoMarksToastKeyRef.current = key;
            toast.error(t('results.page.toasts.noMarksForSelection'));
        }
    }, [summary, summaryEnabled, summaryParams, summaryQuery.isFetching, summaryQuery.isPlaceholderData, summaryQuery.isSuccess, t]);

    const results = useMemo(() => summary?.results || [], [summary]);
    const subjectCols = useMemo(() => summary?.subjects || [], [summary]);
    const visibleSubjectCols = useMemo(() => {
        if (!isTeacher) return subjectCols;
        const allowed = teacherAllowedSubjectIds;
        if (!allowed || allowed.size === 0) return [];
        return (subjectCols || []).filter(sc => allowed.has(String(sc?._id)));
    }, [isTeacher, subjectCols, teacherAllowedSubjectIds]);

    const overallExamTypeCols = useMemo(() => {
        const list = Array.isArray(examTypes) ? [...examTypes] : [];
        list.sort((a, b) => (Number(a?.order || 0) - Number(b?.order || 0)) || String(a?.typeName || '').localeCompare(String(b?.typeName || '')));
        return list;
    }, [examTypes]);

    // Requirement: keep Overall as it was before (per-subject totals),
    // and use the template-column breakdown only when mode=subject and a subject is selected.
    const showSubjectTemplateCols = mode === 'subject' && Boolean(subjectId) && overallExamTypeCols.length > 0;

    // Ensure teacher stays within allowed modes
    useEffect(() => {
        if (!isTeacher) return;
        const allowed = new Set(['subject', 'examType']);
        if (!allowed.has(String(mode))) setMode('subject');
    }, [isTeacher, mode]);

    // Add utility to format number to 2 decimals
    const fmt2 = (n) => Number((n ?? 0).toFixed?.(2));

    const handlePrint = () => {
        if (!canPrintResults) {
            toast.error(t('results.page.errors.noPermissionPrint'));
            return;
        }
        // Give the browser a tick to apply any pending layout before printing.
        setTimeout(() => window.print(), 0);
    };

    const formatEnrollmentStatus = (raw) => {
        const v = String(raw || '').toLowerCase();
        if (!v) return '';
        const allowed = ['open', 'active', 'inactive', 'promoted', 'graduated', 'transferred', 'withdrawn', 'all'];
        if (allowed.includes(v)) return t(`students.enrollmentStatus.${v}`);
        return String(raw);
    };

    const getModeLabel = (m) => {
        const v = String(m || '').toLowerCase();
        const allowed = ['subject', 'overall', 'examtype', 'top', 'bottom', 'trend', 'difficulty'];
        if (!v) return '';
        if (!allowed.includes(v)) return String(m);
        if (v === 'examtype') return t('results.page.modes.examType');
        return t(`results.page.modes.${v}`);
    };

    const canExport = Boolean(
        !loading &&
        academicYearId &&
        gradeSectionId &&
        results.length > 0 &&
        mode !== 'trend' &&
        mode !== 'difficulty'
    );

    const buildExportPayload = async ({ forPdf = false, forExcel = false } = {}) => {
        if (!canExport) return null;

        const selSec = selectedSectionForLabels;
        const ayName = (years || []).find(y => String(y._id) === String(academicYearId))?.yearName || selSec?.academicYear?.yearName || '';
        const gName = (grades || []).find(g => String(g._id) === String(gradeId))?.gradeName || selSec?.grade?.gradeName || '';
        const shName = (shifts || []).find(s => String(s._id) === String(shiftId))?.shiftName || selSec?.shift?.shiftName || '';
        const secName = selSec?.section || '';

        const minimalMeta = Boolean(forPdf || forExcel);
        const enrollmentLabel = formatEnrollmentStatus(enrollmentStatus);
        const modeLabel = getModeLabel(mode);
        const subtitleParts = [
            ayName ? `${t('common.filters.academicYear')}: ${ayName}` : null,
            gName ? `${t('common.filters.grade')}: ${gName}` : null,
            secName ? `${t('common.filters.section')}: ${secName}` : null,
            shName ? `${t('common.filters.shift')}: ${shName}` : null,
            // PDF + Excel: omit Enrollment/Cohort/Mode (requested)
            !minimalMeta && enrollmentLabel ? `${t('results.page.export.enrollment')}: ${enrollmentLabel}` : null,
            !minimalMeta && cohortId ? `${t('common.filters.cohort')}: ${t('common.selected')}` : null,
            !minimalMeta && modeLabel ? `${t('results.page.filters.mode')}: ${modeLabel}` : null,
        ].filter(Boolean);

        const headers = showSubjectTemplateCols
            ? [
                t('results.page.table.rank'),
                t('results.page.table.student'),
                ...overallExamTypeCols.map(et => et.typeName),
                t('results.page.table.totalWithMax', { max: 100 }),
                t('results.page.table.average'),
            ]
            : [
                t('results.page.table.rank'),
                t('results.page.table.student'),
                ...visibleSubjectCols.map(s => s.subjectName),
                t('results.page.table.totalWithMax', { max: 100 }),
                t('results.page.table.average'),
            ];

        const rows = results.map((r) => {
            if (showSubjectTemplateCols) {
                const typeVals = overallExamTypeCols.map((et) => fmt2(r?.examTypeTotals?.[String(et._id)] ?? 0));
                return [
                    r.rank,
                    r.fullName || '',
                    ...typeVals,
                    fmt2(r.total ?? 0),
                    fmt2(r.average ?? 0),
                ];
            }
            const subjectVals = visibleSubjectCols.map((sc) => {
                const found = (r.subjectScores || []).find(s => String(s.subjectId) === String(sc._id));
                return fmt2(found?.total ?? 0);
            });
            return [
                r.rank,
                r.fullName || '',
                ...subjectVals,
                fmt2(r.total ?? 0),
                fmt2(r.average ?? 0),
            ];
        });

        return {
            filename: 'results.pdf',
            sheetName: t('results.page.export.sheetName'),
            title: minimalMeta ? '' : t('results.page.export.title'),
            subtitle: subtitleParts.join(' - '),
            headerImageSrc: headerImg,
            headers,
            rows,
        };
    };

    const getExportPayload = () => buildExportPayload({ forPdf: false });
    const getPdfPayload = () => buildExportPayload({ forPdf: true });
    const getExcelPayload = () => buildExportPayload({ forExcel: true });

    // openTranscript removed

    // (Transfer logs UI omitted on this page)

    return (
            <div className="space-y-6 with-print-header with-print-footer">
                {/* Print header/footer */}
                <PrintHeader />
                <PrintFooter left={t('common.generatedBy')} />

            {!isTeacher && (
                <div className="no-print">
                    <EnrollmentCohortToolbar
                        enrollmentStatus={enrollmentStatus}
                        onEnrollmentStatusChange={setEnrollmentStatus}
                        cohortId={cohortId}
                        onCohortChange={setCohortId}
                        cohortPlaceholder={t('students.cohortOptional')}
                        cohortSelectId="results-cohort"
                        cohortSelectName="results-cohort"
                        cohortSelectProps={{
                            searchable: true,
                            maxVisible: 5,
                        }}
                    />
                </div>
            )}

            <Card className="p-4 no-print">
                <FilterRow className="gap-3">
                    <FilterItem grow minWidthClass="sm:min-w-40">
                        <AcademicYearSelect
                            value={academicYearId}
                            onChange={(v)=>{ setAcademicYearId(v); if (!applyingTimelineRef.current) { resetLower('ay'); setCohortId(''); setTimeline([]); } else { applyingTimelineRef.current = false; } }}
                            placeholder={t('common.filters.academicYear')}
                            searchable
                            maxVisible={5}
                            searchPlaceholder={t('common.searchPlaceholders.academicYears')}
                            className="w-full"
                        />
                    </FilterItem>
                {!isTeacher && (
                    <FilterItem minWidthClass="sm:min-w-44">
                            <DropdownSelect
                            value={gradeId}
                            onChange={(v)=>{ setGradeId(v); if (!applyingTimelineRef.current) { resetLower('grade'); } else { applyingTimelineRef.current = false; } }}
                            placeholder={t('common.filters.grade')}
                            options={[...(grades || [])]
                                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                                .map((g) => ({ value: g._id, label: g.gradeName }))}
                        />
                    </FilterItem>
                )}

                {!isTeacher && (
                    <FilterItem minWidthClass="sm:min-w-44">
                            <FilterDropdownSelect
                            value={shiftId}
                            onChange={(v)=>{ setShiftId(v); if (!applyingTimelineRef.current) { resetLower('shift'); } else { applyingTimelineRef.current = false; } }}
                            placeholder={t('common.filters.shift')}
                            options={(shifts || []).map((s) => ({ value: s._id, label: s.shiftName }))}
                                maxVisible={5}
                        />
                    </FilterItem>
                )}

                <FilterItem minWidthClass="sm:min-w-56">
                        <FilterDropdownSelect
                        value={gradeSectionId}
                        onChange={setGradeSectionId}
                        placeholder={t('common.filters.section')}
                        disabled={isTeacher ? teacherSectionsLoading : (!gradeId || !shiftId)}
                        options={(isTeacher ? teacherSections : sections || []).map((gs) => {
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

                <FilterItem minWidthClass="sm:min-w-44">
                    <DropdownSelect
                        value={mode}
                        onChange={(v) => setMode(v || 'subject')}
                        placeholder={t('results.page.filters.mode')}
                        options={(
                            isTeacher
                                ? [
                                    { value: 'subject', label: t('results.page.modes.subject') },
                                    { value: 'examType', label: t('results.page.modes.examType') },
                                  ]
                                : [
                                    { value: 'subject', label: t('results.page.modes.subject') },
                                    { value: 'overall', label: t('results.page.modes.overall') },
                                    { value: 'examType', label: t('results.page.modes.examType') },
                                    { value: 'top', label: t('results.page.modes.top') },
                                    { value: 'bottom', label: t('results.page.modes.bottom') },
                                    { value: 'trend', label: t('results.page.modes.trend') },
                                    { value: 'difficulty', label: t('results.page.modes.difficulty') },
                                  ]
                        )}
                    />
                </FilterItem>
                {mode === 'subject' && (
                    <FilterItem minWidthClass="sm:min-w-56">
							<FilterDropdownSelect
                            value={subjectId}
                            onChange={setSubjectId}
                            disabled={!gradeSectionId || (isTeacher && (teacherAssignmentsLoading || teacherAllowedSubjectIds?.size === 0))}
                            placeholder={isTeacher && teacherAssignmentsLoading ? t('common.loading') : t('common.filters.subject')}
                            options={(() => {
                                const list = subjects || [];
                                if (!isTeacher || !teacherAllowedSubjectIds) return list.map((su) => ({ value: su._id, label: su.subjectName }));
                                if (teacherAllowedSubjectIds.size === 0) return [];
                                return list
                                    .filter((su) => teacherAllowedSubjectIds.has(String(su?._id)))
                                    .map((su) => ({ value: su._id, label: su.subjectName }));
                            })()}
							maxVisible={5}
    						searchPlaceholder={t('common.searchPlaceholders.subjects')}
                        />
                    </FilterItem>
                )}
                {mode === 'examType' && (
                    <FilterItem minWidthClass="sm:min-w-56">
							<FilterDropdownSelect
                            value={examTypeId}
                            onChange={setExamTypeId}
                            disabled={!gradeSectionId}
                            placeholder={t('results.page.filters.examType')}
                            options={(examTypes || []).map((et) => ({ value: et._id, label: et.typeName }))}
							maxVisible={5}
						searchPlaceholder={t('results.page.searchPlaceholders.examTypes')}
                        />
                    </FilterItem>
                )}
                {(mode === 'top' || mode === 'bottom') && (
                    <FilterItem>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-(--nb-color-muted)">{t('results.page.filters.nLabel')}</label>
                            <Input className="w-20" type="number" min={1} max={100} value={mode==='top'?topN:bottomN} onChange={e=> (mode==='top'? setTopN(Number(e.target.value)||0): setBottomN(Number(e.target.value)||0))} />
                            {/* Number input styled separately for consistency */}
                        </div>
                    </FilterItem>
                )}
                <FilterItem className="sm:ml-auto">
                    <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
                    {canPrintResults ? (
                        <ActionButton
                            variant="outline"
                            onClick={handlePrint}
                            title={t('common.actions.print')}
                            icon={<Printer size={16} />}
                        >
                            {t('common.actions.print')}
                        </ActionButton>
                    ) : null}

                    {canDownloadResults ? (
                        <>
                            <PdfDownloadButton getPayload={getPdfPayload} disabled={!canExport} variant="outline" />
                            <ExcelDownloadButton getPayload={getExcelPayload} disabled={!canExport} variant="outline" />
                            <CsvDownloadButton getPayload={getExportPayload} disabled={!canExport} variant="outline" />
                            <CopyTableButton getPayload={getExportPayload} disabled={!canExport} variant="outline" />
                        </>
                    ) : null}

                    <ActionButton
                        variant="outline"
                        onClick={handleReset}
                        title={t('common.filters.resetTitle')}
                        icon={<RotateCcw size={16} />}
                    >
                        {t('common.actions.reset')}
                    </ActionButton>
                    </div>
                </FilterItem>
				</FilterRow>
            </Card>

            {cohortId && timeline.length > 0 && (
                <Card className="p-3 flex flex-row flex-wrap gap-2 items-center no-print">
                    <div className="text-sm font-medium text-(--nb-color-muted) mr-2">{t('results.page.timeline.title')}</div>
                    {timelineLoading && <div className="text-xs text-(--nb-color-muted)">{t('common.loading')}</div>}
                    {!timelineLoading && timeline.map(entry => {
                        const active = academicYearId === String(entry.academicYear._id) && gradeSectionId === String(entry.gradeSection._id);
                        return (
                            <button
                                key={String(entry.academicYear._id)+String(entry.gradeSection._id)}
                                type="button"
                                onClick={() => {
                                    applyingTimelineRef.current = true;
                                    setAcademicYearId(String(entry.academicYear._id));
                                    setGradeId(String(entry.grade._id));
                                    setShiftId(String(entry.shift._id));
                                    setGradeSectionId(String(entry.gradeSection._id));
                                    setSubjectId('');
                                    if (entry?.statusHint) setEnrollmentStatus(String(entry.statusHint));
                                    queueMicrotask(() => { applyingTimelineRef.current = false; });
                                }}
                                className={`text-xs px-2 py-1 rounded border ${active ? 'bg-(--nb-color-brand) text-white border-(--nb-color-brand)' : 'bg-(--nb-color-bg-card) hover:bg-(--nb-color-bg) text-(--nb-color-text) border-(--nb-color-border)'}`}
                            >
                                {entry.academicYear.yearName} / {entry.grade.gradeName}{entry.gradeSection.section ? ` ${t('common.sectionPrefix')} ${entry.gradeSection.section}` : ''}
                            </button>
                        );
                    })}
                </Card>
            )}

            <Card className="p-4 overflow-auto results-print">
                {(!academicYearId || !gradeSectionId) ? (
                    <p className="text-sm text-(--nb-color-muted)">{t('results.page.emptyStates.selectFilters')}</p>
                ) : (mode === 'subject' && !subjectId) ? (
                    <p className="text-sm text-(--nb-color-muted)">{t('results.page.emptyStates.chooseSubject')}</p>
                ) : (mode === 'examType' && !examTypeId) ? (
                    <p className="text-sm text-(--nb-color-muted)">{t('results.page.emptyStates.chooseExamType')}</p>
                ) : loading ? (
                    <p className="text-sm text-(--nb-color-muted)">{t('teachers.dashboard.results.loading')}</p>
                                ) : (mode === 'trend') ? (
                                        <>
                                            {/* Removed duplicate Print action (toolbar already provides it) */}
                                            {academicYearId && gradeSectionId && (
                                                <div className="border-b pb-2 mb-2 text-sm flex flex-wrap gap-x-4 gap-y-1">
                                                    {(() => {
                                                        const selSec = selectedSectionForLabels;
                                                        const ayName = (years||[]).find(y => String(y._id)===String(academicYearId))?.yearName || selSec?.academicYear?.yearName || '-';
                                                        const gName = (grades||[]).find(g => String(g._id)===String(gradeId))?.gradeName || selSec?.grade?.gradeName || '-';
                                                        const shName = (shifts||[]).find(s => String(s._id)===String(shiftId))?.shiftName || selSec?.shift?.shiftName || '-';
                                                        const secName = selSec?.section || '-';
                                                        return (
                                                            <>
                                                                <span><span className="font-medium">{t('common.filters.academicYear')}:</span> {ayName}</span>
                                                                <span><span className="font-medium">{t('common.filters.grade')}:</span> {gName}</span>
                                                                <span><span className="font-medium">{t('common.filters.section')}:</span> {secName}</span>
                                                                <span><span className="font-medium">{t('common.filters.shift')}:</span> {shName}</span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                            <StandardTable
                                                isLoading={false}
                                                items={results}
                                                emptyTitle={t('results.page.emptyStates.noResults')}
                                                rows={[...results, { __type: 'summary' }]}
                                                columns={[
                                                    { key: 'rank', label: t('results.page.table.rank'), thClassName: 'text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)', tdClassName: 'px-4 py-3 text-right border-x border-(--nb-color-border)' },
                                                    { key: 'student', label: t('results.page.table.student'), thClassName: 'text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)', tdClassName: 'px-4 py-3 whitespace-nowrap border-x border-(--nb-color-border)' },
                                                    { key: 'mid', label: t('results.page.table.midTerm'), align: 'right', thClassName: 'text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)', tdClassName: 'px-4 py-3 text-right border-x border-(--nb-color-border)' },
                                                    { key: 'final', label: t('results.page.table.final'), align: 'right', thClassName: 'text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)', tdClassName: 'px-4 py-3 text-right border-x border-(--nb-color-border)' },
                                                    { key: 'delta', label: t('results.page.table.delta'), align: 'right', thClassName: 'text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)', tdClassName: 'px-4 py-3 text-right font-semibold border-x border-(--nb-color-border)' },
                                                ]}
                                                getRowKey={(r, idx) => r?.__type === 'summary' ? `summary-${idx}` : r.studentId}
                                                renderCell={(r, col) => {
                                                    if (r?.__type === 'summary') {
                                                        if (col.key === 'student') return <span className="font-medium">{t('results.page.table.classAvgDelta')}</span>;
                                                        if (col.key === 'delta') return Number((summary.classAverage ?? 0).toFixed?.(2));
                                                        return '';
                                                    }
                                                    switch (col.key) {
                                                        case 'rank': return r.rank;
                                                        case 'student': return r.fullName;
                                                        case 'mid': return Number((r.mid ?? 0).toFixed?.(2));
                                                        case 'final': return Number((r.final ?? 0).toFixed?.(2));
                                                        case 'delta': return Number((r.delta ?? 0).toFixed?.(2));
                                                        default: return '';
                                                    }
                                                }}
                                                tableProps={{
                                                    theadClassName: 'bg-(--nb-color-brand)',
                                                    useDefaultHeaderStyles: false,
                                                    baseRowClassName: 'border-t border-(--nb-color-border) odd:bg-(--nb-color-bg-card) even:bg-(--nb-color-bg)',
                                                    rowClassName: (r) => r?.__type === 'summary' ? 'font-medium border-t-2 border-(--nb-color-border)' : '',
                                                }}
                                            />
                                        </>
                                ) : (mode === 'difficulty') ? (
                                        <>
                                            {/* Removed duplicate Print action (toolbar already provides it) */}
                                            {academicYearId && gradeSectionId && (
                                                <div className="border-b pb-2 mb-2 text-sm flex flex-wrap gap-x-4 gap-y-1">
                                                    {(() => {
                                                        const selSec = selectedSectionForLabels;
                                                        const ayName = (years||[]).find(y => String(y._id)===String(academicYearId))?.yearName || selSec?.academicYear?.yearName || '-';
                                                        const gName = (grades||[]).find(g => String(g._id)===String(gradeId))?.gradeName || selSec?.grade?.gradeName || '-';
                                                        const shName = (shifts||[]).find(s => String(s._id)===String(shiftId))?.shiftName || selSec?.shift?.shiftName || '-';
                                                        const secName = selSec?.section || '-';
                                                        return (
                                                            <>
                                                                <span><span className="font-medium">{t('common.filters.academicYear', { defaultValue: 'Academic Year' })}:</span> {ayName}</span>
                                                                <span><span className="font-medium">{t('common.filters.grade', { defaultValue: 'Grade' })}:</span> {gName}</span>
                                                                <span><span className="font-medium">{t('common.filters.section', { defaultValue: 'Section' })}:</span> {secName}</span>
                                                                <span><span className="font-medium">{t('common.filters.shift', { defaultValue: 'Shift' })}:</span> {shName}</span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                            <StandardTable
                                                isLoading={false}
                                                items={summary?.subjects || []}
                                                emptyTitle={t('results.page.emptyStates.noResults')}
                                                rows={[...(summary?.subjects || []), { __type: 'summary' }]}
                                                columns={[
                                                    { key: 'subject', label: t('common.filters.subject'), thClassName: 'text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)', tdClassName: 'px-4 py-3 whitespace-nowrap border-x border-(--nb-color-border)' },
                                                    { key: 'avg', label: t('results.page.table.avg'), align: 'right', thClassName: 'text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)', tdClassName: 'px-4 py-3 text-right border-x border-(--nb-color-border)' },
                                                    { key: 'students', label: t('results.page.table.students'), align: 'right', thClassName: 'text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)', tdClassName: 'px-4 py-3 text-right text-(--nb-color-text) border-x border-(--nb-color-border)' },
                                                ]}
                                                getRowKey={(r, idx) => r?.__type === 'summary' ? `summary-${idx}` : String(r._id)}
                                                renderCell={(r, col) => {
                                                    if (r?.__type === 'summary') {
                                                        if (col.key === 'subject') return <span className="font-medium text-(--nb-color-text)">{t('results.page.table.classAvgSubjects')}</span>;
                                                        if (col.key === 'avg') return Number((summary.classAverage ?? 0).toFixed?.(2));
                                                        if (col.key === 'students') return '-';
                                                        return '';
                                                    }
                                                    switch (col.key) {
                                                        case 'subject': return r.subjectName;
                                                        case 'avg': return Number((r.average ?? 0).toFixed?.(2));
                                                        case 'students': return r.count ?? '-';
                                                        default: return '';
                                                    }
                                                }}
                                                tableProps={{
                                                    theadClassName: 'bg-(--nb-color-brand)',
                                                    useDefaultHeaderStyles: false,
                                                    baseRowClassName: 'border-t border-(--nb-color-border) odd:bg-(--nb-color-bg-card) even:bg-(--nb-color-bg)',
                                                    rowClassName: (r) => r?.__type === 'summary' ? 'font-medium border-t-2 border-(--nb-color-border)' : '',
                                                }}
                                            />
                                        </>
                                ) : (results.length === 0) ? (
                    <p className="text-sm text-(--nb-color-muted)">{t('results.page.emptyStates.noResults')}</p>
                ) : (
                    <>
                    {/* Removed duplicate CSV/Print actions (toolbar already provides them) */}
                                        {/* Info block like Transcript (AY/Grade/Section/Shift) */}
                                        {academicYearId && gradeSectionId && (
                                            <div className="border-b pb-2 mb-2 text-sm flex flex-wrap gap-x-4 gap-y-1">
                                                {(() => {
                                                    const selSec = selectedSectionForLabels;
                                                    const ayName = (years||[]).find(y => String(y._id)===String(academicYearId))?.yearName || selSec?.academicYear?.yearName || '-';
                                                    const gName = (grades||[]).find(g => String(g._id)===String(gradeId))?.gradeName || selSec?.grade?.gradeName || '-';
                                                    const shName = (shifts||[]).find(s => String(s._id)===String(shiftId))?.shiftName || selSec?.shift?.shiftName || '-';
                                                    const secName = selSec?.section || '-';
                                                    return (
                                                        <>
                                                                <span><span className="font-medium">{t('common.filters.academicYear')}:</span> {ayName}</span>
                                                                <span><span className="font-medium">{t('common.filters.grade')}:</span> {gName}</span>
                                                                <span><span className="font-medium">{t('common.filters.section')}:</span> {secName}</span>
                                                                <span><span className="font-medium">{t('common.filters.shift')}:</span> {shName}</span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                        <StandardTable
                                            isLoading={false}
                                            items={results}
                                            emptyTitle={t('results.page.emptyStates.noResults')}
                                            rows={[...results, { __type: 'summary' }]}
                                            columns={(() => {
                                                const base = [
                                                    { key: 'rank', label: t('results.page.table.rank'), align: 'right', thClassName: 'text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)', tdClassName: 'px-4 py-3 text-right border-x border-(--nb-color-border)' },
                                                    { key: 'student', label: t('results.page.table.student'), thClassName: 'text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)', tdClassName: 'px-4 py-3 whitespace-nowrap border-x border-(--nb-color-border)' },
                                                ];

                                                const dynamic = showSubjectTemplateCols
                                                    ? overallExamTypeCols.map(et => ({
                                                        key: `et:${String(et._id)}`,
                                                        label: et.typeName,
                                                        align: 'right',
                                                        thClassName: 'text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)',
                                                        tdClassName: 'px-4 py-3 text-right border-x border-(--nb-color-border)',
                                                        _etId: String(et._id),
                                                    }))
                                                    : visibleSubjectCols.map(sc => ({
                                                        key: `sub:${String(sc._id)}`,
                                                        label: sc.subjectName,
                                                        align: 'right',
                                                        thClassName: 'text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)',
                                                        tdClassName: 'px-4 py-3 text-right border-x border-(--nb-color-border)',
                                                        _subId: String(sc._id),
                                                    }));

                                                const tail = [
                                                    { key: 'total', label: t('results.page.table.totalWithMax', { max: 100 }), align: 'right', thClassName: 'text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)', tdClassName: 'px-4 py-3 text-right font-semibold border-x border-(--nb-color-border)' },
                                                    { key: 'avg', label: t('results.page.table.average'), align: 'right', thClassName: 'text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)', tdClassName: 'px-4 py-3 text-right border-x border-(--nb-color-border)' },
                                                ];

                                                return [...base, ...dynamic, ...tail];
                                            })()}
                                            getRowKey={(r, idx) => r?.__type === 'summary' ? `summary-${idx}` : r.studentId}
                                            renderCell={(r, col) => {
                                                if (r?.__type === 'summary') {
                                                    if (col.key === 'student') return <span className="block text-right text-(--nb-color-text)">{t('results.page.table.classAverage')}</span>;

                                                    if (String(col.key).startsWith('et:')) {
                                                        const etId = col._etId;
                                                        let sumV = 0; let countV = 0;
                                                        for (const rr of results) {
                                                            const v = rr?.examTypeTotals?.[String(etId)];
                                                            if (typeof v === 'number') { sumV += v; countV += 1; }
                                                        }
                                                        const avgV = countV ? fmt2(sumV / countV) : 0;
                                                        return avgV;
                                                    }

                                                    if (String(col.key).startsWith('sub:')) {
                                                        const subId = col._subId;
                                                        let sumV = 0; let countV = 0;
                                                        for (const rr of results) {
                                                            const found = (rr.subjectScores || []).find(s => String(s.subjectId) === String(subId));
                                                            if (typeof found?.total === 'number') { sumV += found.total; countV += 1; }
                                                        }
                                                        const avgV = countV ? fmt2(sumV / countV) : 0;
                                                        return avgV;
                                                    }

                                                    if (col.key === 'total') return fmt2(summary.classAverage ?? 0);
                                                    if (col.key === 'avg') return '-';
                                                    return '';
                                                }

                                                if (col.key === 'rank') return r.rank;
                                                if (col.key === 'student') return r.fullName;

                                                if (String(col.key).startsWith('et:')) {
                                                    const etId = col._etId;
                                                    return fmt2(r?.examTypeTotals?.[String(etId)] ?? 0);
                                                }

                                                if (String(col.key).startsWith('sub:')) {
                                                    const subId = col._subId;
                                                    const found = (r.subjectScores || []).find(s => String(s.subjectId) === String(subId));
                                                    return Number((found?.total ?? 0).toFixed?.(2) || (found?.total ?? 0));
                                                }

                                                if (col.key === 'total') return Number(r.total?.toFixed?.(2) ?? r.total);
                                                if (col.key === 'avg') return Number((r.average ?? 0).toFixed?.(2));
                                                return '';
                                            }}
                                            tableProps={{
                                                theadClassName: 'bg-(--nb-color-brand)',
                                                useDefaultHeaderStyles: false,
                                                baseRowClassName: 'border-t border-(--nb-color-border) odd:bg-(--nb-color-bg-card) even:bg-(--nb-color-bg)',
                                                rowClassName: (r) => r?.__type === 'summary' ? 'font-medium border-t-2 border-(--nb-color-border)' : '',
                                            }}
                                        />
                    </>
                )}
            </Card>
            
        </div>
    );
}

// Exam types are fetched per-class context.
