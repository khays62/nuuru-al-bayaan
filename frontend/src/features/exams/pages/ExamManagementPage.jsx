import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import { RotateCcw, Check, Loader2, AlertCircle, Lock, FileDown, Upload } from 'lucide-react';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import { getExamGrid, saveExamScore, saveExamScoresBulk, getExamTemplateVersions } from '../api/exams';
import { getGradeSectionById, listGradeSections } from '../../grades/api/gradeSections';
import { getGrades, getShifts } from '../../lookups/api/lookups';
import { getCohortTimeline } from '../../cohorts/api/cohorts';
import AcademicYearSelect from '../../lookups/components/AcademicYearSelect';
import EnrollmentCohortToolbar from '../../../shared/components/filters/EnrollmentCohortToolbar.jsx';
import Card from '../../../shared/components/ui/Card.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import FilterDropdownSelect from '../../../shared/components/DataToolbar/FilterDropdownSelect.jsx';
import { useAuth } from '../../../auth/AuthContext';
import { useI18n } from '../../../i18n/useI18n';
import { getAssignments as getTeacherAssignments } from '../../teachers/api/teachersApi';
import { teacherKeys } from '../../teachers/queryKeys.js';
import { useExamsRealtimeInvalidation } from '../useExamsRealtimeInvalidation';
import ExamScoresExcelImportModal from '../components/ExamScoresExcelImportModal.jsx';

export default function ExamManagementPage() {
    const { t } = useI18n();
    const { auth, hasPermission } = useAuth();
    const role = String(auth?.user?.role || '').toLowerCase();
    const isTeacher = role === 'teacher';
    const isAdmin = role === 'admin';

    // EDCI: Realtime -> exam/result events -> invalidate queries -> UI updates.
    useExamsRealtimeInvalidation({ enabled: true });
    const canInput = isTeacher || isAdmin || hasPermission('exams', 'input');

    const noInputToastShownRef = useRef(false);

    // Scores-only page (Exam Settings lives in dedicated ExamSettingsPage)
    const [subjects, setSubjects] = useState([]);
    const [grades, setGrades] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [sections, setSections] = useState([]);

    const [academicYearId, setAcademicYearId] = useState('');
    const [gradeId, setGradeId] = useState('');
    const [shiftId, setShiftId] = useState('');
    const [gradeSectionId, setGradeSectionId] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [enrollmentStatus, setEnrollmentStatus] = useState('active');
    const [cohortId, setCohortId] = useState('');
    const [timeline, setTimeline] = useState([]);
    const [timelineLoading, setTimelineLoading] = useState(false);

    const teacherSectionsQuery = useQuery({
        queryKey: teacherKeys.gradeSections({ limit: 200 }),
        enabled: Boolean(isTeacher),
        queryFn: async () => {
            const res = await listGradeSections({ limit: 200 });
            return Array.isArray(res?.data) ? res.data : [];
        },
        placeholderData: (prev) => prev,
    });

    const teacherAssignmentsQuery = useQuery({
        queryKey: teacherKeys.assignments(String(auth?.user?.teacherRef || '')),
        enabled: Boolean(isTeacher && auth?.user?.teacherRef),
        queryFn: async ({ signal }) => {
            const res = await getTeacherAssignments(auth.user.teacherRef, {}, { signal });
            return Array.isArray(res?.data) ? res.data : [];
        },
        placeholderData: (prev) => prev,
    });

    const teacherSections = teacherSectionsQuery.data || [];
    const teacherSectionsLoading = teacherSectionsQuery.isLoading;
    const teacherAssignments = teacherAssignmentsQuery.data || [];
    const teacherAssignmentsLoading = teacherAssignmentsQuery.isLoading;

    const [templateVersions, setTemplateVersions] = useState([]);
    const [templateVersion, setTemplateVersion] = useState('');

    const [importOpen, setImportOpen] = useState(false);
    const [downloadingTemplate, setDownloadingTemplate] = useState(false);

    const activeTemplateVersion = useMemo(() => {
        const v = (templateVersions || []).find(x => Boolean(x?.isActive));
        const n = Number(v?.templateVersion);
        return Number.isFinite(n) && n > 0 ? String(n) : '';
    }, [templateVersions]);

    const [grid, setGrid] = useState({ students: [], columns: [], scores: [], lockedStudents: [], lockedStudentVersions: {}, templateVersion: '' });
    const [localInputs, setLocalInputs] = useState({});
    const [savingCells, setSavingCells] = useState(new Set());
    const [savingAll, setSavingAll] = useState(false);
    const [errorCells, setErrorCells] = useState(new Set());
    const [recentlySaved, setRecentlySaved] = useState(new Set());
    const savingStartTimesRef = useRef(new Map());
    const lockedToastShownRef = useRef(new Set());
    const lockedCountToastId = 'exam-grid-locked-count';
    const lockedStudentsSet = useMemo(() => {
        const ids = Array.isArray(grid?.lockedStudents) ? grid.lockedStudents : [];
        return new Set(ids.map(String));
    }, [grid?.lockedStudents]);

    const lockedStudentVersionsMap = useMemo(() => {
        const raw = grid?.lockedStudentVersions && typeof grid.lockedStudentVersions === 'object' ? grid.lockedStudentVersions : {};
        const out = {};
        for (const [k, v] of Object.entries(raw)) {
            out[String(k)] = Array.isArray(v) ? v.map(Number).filter(n => Number.isFinite(n) && n > 0) : [];
        }
        return out;
    }, [grid?.lockedStudentVersions]);

    const isStudentLocked = (studentId) => lockedStudentsSet.has(String(studentId));

    const formatLockedVersions = (studentId) => {
        const versions = lockedStudentVersionsMap[String(studentId)] || [];
        if (!versions.length) return '';
        return versions.map(v => `v${v}`).join(', ');
    };

    const enrollmentStatusOptions = useMemo(
        () => ([
            { value: 'active', label: t('students.enrollmentStatus.active') },
            { value: 'inactive', label: t('students.enrollmentStatus.inactive') },
            { value: 'promoted', label: t('students.enrollmentStatus.promoted') },
            { value: 'graduated', label: t('students.enrollmentStatus.graduated') },
            { value: 'transferred', label: t('students.enrollmentStatus.transferred') },
            { value: 'withdrawn', label: t('students.enrollmentStatus.withdrawn') },
            { value: 'all', label: t('students.enrollmentStatus.all') },
        ]),
        [t]
    );

    const applyingTimelineRef = useRef(false);

    useEffect(() => {
        if (!isTeacher) return;
        if (enrollmentStatus !== 'active') setEnrollmentStatus('active');
    }, [isTeacher, enrollmentStatus]);

    useEffect(() => {
        if (!isTeacher) return;
        if (cohortId) setCohortId('');
    }, [isTeacher, cohortId]);

    useEffect(() => {
        if (!isTeacher) return;
        if (activeTemplateVersion && templateVersion !== activeTemplateVersion) {
            setTemplateVersion(activeTemplateVersion);
        }
    }, [isTeacher, activeTemplateVersion, templateVersion]);

    useEffect(() => {
        if (!isTeacher) return;
        if (gradeId) setGradeId('');
        if (shiftId) setShiftId('');
    }, [isTeacher]);

    // teacherSections + teacherAssignments are now React Query-backed.

    useEffect(() => {
        if (!isTeacher) return;
        if (!gradeSectionId) return;
        const ok = (teacherSections || []).some((s) => String(s?._id) === String(gradeSectionId));
        if (!ok) setGradeSectionId('');
    }, [isTeacher, gradeSectionId, teacherSections]);

    useEffect(() => {
        (async () => {
            try {
                const [gs, ss] = await Promise.all([getGrades(), getShifts()]);
                setGrades(Array.isArray(gs) ? gs : (gs?.data || []));
                setShifts(Array.isArray(ss) ? ss : (ss?.data || []));
            } catch {
                setGrades([]);
                setShifts([]);
            }
        })();
    }, []);

    useEffect(() => {
        let ignore = false;
        (async () => {
            const res = await getExamTemplateVersions();
            if (!res?.ok) {
                if (!ignore) {
                    setTemplateVersions([]);
                    setTemplateVersion('');
                }
                return;
            }
            const versions = Array.isArray(res?.data?.versions) ? res.data.versions : [];
            const active = res?.data?.activeVersion;
            if (!ignore) {
                setTemplateVersions(versions);
                if (!templateVersion && active) setTemplateVersion(String(active));
            }
        })();
        return () => { ignore = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let ignore = false;
        (async () => {
            if (isTeacher) return;
            if (!gradeId || !shiftId) {
                setSections([]);
                setGradeSectionId('');
                return;
            }
            try {
                const res = await listGradeSections({ grade: gradeId, shift: shiftId, limit: 200 });
                const data = Array.isArray(res) ? res : (res?.data || []);
                if (!ignore) setSections(data);
            } catch {
                if (!ignore) setSections([]);
            }
        })();
        return () => { ignore = true; };
    }, [gradeId, shiftId]);

    useEffect(() => {
        if (applyingTimelineRef.current) return;
        setGradeSectionId('');
        setSubjectId('');
    }, [academicYearId, gradeId, shiftId]);

    const gradeSectionQuery = useQuery({
        queryKey: teacherKeys.gradeSectionById(gradeSectionId),
        enabled: Boolean(gradeSectionId),
        queryFn: async () => {
            const { ok, data, error } = await getGradeSectionById(gradeSectionId);
            if (!ok) throw new Error(error || t('exams.management.errors.loadSectionSubjectsFailed'));
            return data;
        },
        placeholderData: (prev) => prev,
    });

    useEffect(() => {
        // When switching to a new section, reset subject selection.
        setSubjects([]);
        setSubjectId('');
    }, [gradeSectionId]);

    useEffect(() => {
        if (!gradeSectionId) return;
        const subs = Array.isArray(gradeSectionQuery.data?.subjects) ? gradeSectionQuery.data.subjects : [];
        setSubjects(subs);
        // Keep current subject selection if it still exists after a realtime refetch.
        if (subjectId) {
            const exists = subs.some((s) => String(s?._id) === String(subjectId));
            if (!exists) setSubjectId('');
        }
    }, [gradeSectionId, gradeSectionQuery.data, subjectId]);

    useEffect(() => {
        if (!gradeSectionId) return;
        if (!gradeSectionQuery.isError) return;
        toast.error(gradeSectionQuery.error?.message || t('exams.management.errors.loadSectionSubjectsFailed'));
    }, [gradeSectionId, gradeSectionQuery.isError, gradeSectionQuery.error]);

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
        if (teacherAllowedSubjectIds.size === 0) {
            setSubjectId('');
            return;
        }
        if (!teacherAllowedSubjectIds.has(String(subjectId))) setSubjectId('');
    }, [isTeacher, subjectId, teacherAllowedSubjectIds]);

    const scoreMap = useMemo(() => {
        const m = new Map();
        for (const s of grid.scores) {
            m.set(`${s.student}-${s.exam}-${s.subject}`, s.scoreObtained);
        }
        return m;
    }, [grid.scores]);

    const maxScoreMap = useMemo(() => {
        const cols = grid.columns || [];
        const map = {};
        for (const c of cols) {
            const n = Number(c?.maxScore);
            map[c.examId] = Number.isFinite(n) && n > 0 ? n : 100;
        }
        return map;
    }, [grid.columns]);

    const totalMax = useMemo(() => {
        const cols = grid.columns || [];
        return cols.reduce((sum, c) => sum + (maxScoreMap?.[c.examId] ?? 0), 0);
    }, [grid.columns, maxScoreMap]);

    const getCellKey = (studentId, examId) => `${studentId}-${examId}-${subjectId}`;

    const getInputValue = (studentId, examId) => {
        const key = getCellKey(studentId, examId);
        if (Object.prototype.hasOwnProperty.call(localInputs, key)) return localInputs[key];
        const val = scoreMap.get(key);
        return val ?? '';
    };

    const invalidKeys = useMemo(() => {
        const res = new Set();
        const keys = Object.keys(localInputs || {});
        for (const k of keys) {
            const parts = k.split('-');
            const examId = parts[1];
            const weight = maxScoreMap[examId] ?? 100;
            const raw = localInputs[k];
            const n = Number(raw);
            if (!Number.isFinite(n)) { res.add(k); continue; }
            if (n < 0 || n > weight) res.add(k);
        }
        return res;
    }, [localInputs, maxScoreMap]);

    const saveCell = async (studentId, examId, value, weight, batchId = '') => {
        if (!canInput) {
            if (!noInputToastShownRef.current) {
                noInputToastShownRef.current = true;
                toast.error(t('exams.management.errors.noPermissionInputScores'));
            }
            return;
        }
        if (isStudentLocked(studentId)) {
            const k = String(studentId);
            if (!lockedToastShownRef.current.has(k)) {
                lockedToastShownRef.current.add(k);
                const vs = formatLockedVersions(studentId);
                const versionLabel = vs || t('exams.management.errors.anotherTemplate');
                toast.error(t('exams.management.errors.lockedStudent', { version: versionLabel }));
            }
            return;
        }
        const key = getCellKey(studentId, examId);
        const n = clamp(Number(value), 0, weight);
        if (n === undefined) return;
        savingStartTimesRef.current.set(key, Date.now());
        setSavingCells(prev => new Set(prev).add(key));
        setErrorCells(prev => { const next = new Set(prev); next.delete(key); return next; });
        setGrid(g => ({ ...g, scores: updateScoreArray(g.scores, { student: studentId, exam: examId, subject: subjectId, scoreObtained: n }) }));
        const { ok, data } = await saveExamScore({ studentId, examId, subjectId, scoreObtained: n, batchId });
        setSavingCells(prev => { const next = new Set(prev); next.delete(key); return next; });
        if (!ok) {
            setErrorCells(prev => new Set(prev).add(key));
            const msg = data?.code ? t(data.code, data.params || {}) : (data?.message || t('exams.management.errors.saveFailed'));
            toast.error(msg);
        } else {
            setLocalInputs(prev => ({ ...prev, [key]: String(n) }));
            setRecentlySaved(prev => {
                const next = new Set(prev);
                next.add(key);
                return next;
            });
            setTimeout(() => {
                setRecentlySaved(prev => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                });
            }, 1200);
        }
    };

    const handleChange = (studentId, examId, value) => {
        if (!canInput) {
            if (!noInputToastShownRef.current) {
                noInputToastShownRef.current = true;
                toast.error(t('exams.management.errors.noPermissionInputScores'));
            }
            return;
        }
        if (isStudentLocked(studentId)) {
            const k = String(studentId);
            if (!lockedToastShownRef.current.has(k)) {
                lockedToastShownRef.current.add(k);
                const vs = formatLockedVersions(studentId);
                const versionLabel = vs || t('exams.management.errors.anotherTemplate');
                toast.error(t('exams.management.errors.lockedStudent', { version: versionLabel }));
            }
            return;
        }
        const key = getCellKey(studentId, examId);
        // Manual save mode: only buffer locally; do not auto-save
        setLocalInputs(prev => ({ ...prev, [key]: value }));
    };

    const changedKeys = useMemo(() => {
        const keys = Object.keys(localInputs || {});
        const out = [];
        for (const k of keys) {
            const current = localInputs[k];
            const existing = scoreMap.get(k);
            if (String(current ?? '') !== String(existing ?? '')) out.push(k);
        }
        return out;
    }, [localInputs, scoreMap]);

    const hasUnsavedChanges = changedKeys.length > 0;
    const changedExistingCount = useMemo(() => {
        let count = 0;
        for (const k of changedKeys) {
            if (scoreMap.has(k)) count++;
        }
        return count;
    }, [changedKeys, scoreMap]);
    const saveButtonLabel = changedExistingCount > 0 ? t('common.actions.update') : t('common.actions.save');

    const handleSaveAll = async () => {
        if (!canInput) {
            toast.error(t('exams.management.errors.noPermissionInputScores'));
            return;
        }
        if (!hasUnsavedChanges) return;
        if (invalidKeys && invalidKeys.size > 0) {
            toast.error(t('exams.management.errors.fixInvalidEntries', { count: invalidKeys.size }));
            return;
        }
        setSavingAll(true);
        try {
            const payloadItems = changedKeys.map((k) => {
                const parts = k.split('-');
                const studentId = parts[0];
                const examId = parts[1];
                const weight = maxScoreMap[examId] ?? 100;
                const value = localInputs[k];
                return {
                    studentId,
                    examId,
                    scoreObtained: clamp(Number(value), 0, weight),
                };
            });
            const { ok, data } = await saveExamScoresBulk({
                subjectId,
                items: payloadItems,
                actionType: changedExistingCount > 0 ? 'edit' : 'add',
            });
            if (!ok) {
                const msg = data?.code ? t(data.code, data.params || {}) : (data?.message || t('exams.management.errors.saveFailed'));
                throw new Error(msg);
            }

            setGrid((prev) => ({
                ...prev,
                scores: payloadItems.reduce((acc, item) => updateScoreArray(acc, {
                    student: item.studentId,
                    exam: item.examId,
                    subject: subjectId,
                    scoreObtained: item.scoreObtained,
                }), Array.isArray(prev?.scores) ? prev.scores : []),
            }));
            setLocalInputs((prev) => ({ ...prev }));
            setErrorCells(new Set());
            toast.success(
                changedExistingCount > 0
                    ? t('exams.management.toasts.updatedScoresSuccessfully')
                    : t('exams.management.toasts.savedScoresSuccessfully')
            );
        } catch (error) {
            toast.error(error?.message || t('exams.management.errors.saveFailed'));
        } finally {
            setSavingAll(false);
        }
    };

    useEffect(() => {
        (async () => {
            if (!cohortId) { setTimeline([]); return; }
            setTimelineLoading(true);
            const { data } = await getCohortTimeline(cohortId);
            setTimelineLoading(false);
            setTimeline(data || []);
        })();
    }, [cohortId]);

    const examGridParams = useMemo(() => {
        return {
            academicYearId,
            gradeSectionId,
            subjectId,
            enrollmentStatus,
            cohortId,
            templateVersion,
        };
    }, [academicYearId, gradeSectionId, subjectId, enrollmentStatus, cohortId, templateVersion]);

    const examGridEnabled = Boolean(academicYearId && gradeSectionId && subjectId);
    const examGridQuery = useQuery({
        queryKey: teacherKeys.examGrid(examGridParams),
        enabled: examGridEnabled,
        queryFn: async ({ signal }) => {
            const { ok, data, error } = await getExamGrid(examGridParams, { signal });
            if (!ok) throw new Error(error || t('exams.management.errors.loadGridFailed'));
            return data || { students: [], columns: [], scores: [], lockedStudents: [], lockedStudentVersions: {}, templateVersion: '' };
        },
        placeholderData: (prev) => prev,
    });

    const loadingGrid = Boolean(examGridQuery.isLoading && examGridQuery.data == null);

    const canExcelActions = examGridEnabled && !loadingGrid && (grid.students?.length || 0) > 0 && (grid.columns?.length || 0) > 0;

    const safeFilePart = (s) => String(s || '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^\p{L}\p{N}_\-]+/gu, '')
        .slice(0, 50);

    const downloadExcelTemplate = async () => {
        if (!canInput) {
            toast.error(t('exams.management.errors.noPermissionInputScores'));
            return;
        }
        if (!canExcelActions) {
            toast.error(t('exams.management.import.errors.selectFiltersFirst'));
            return;
        }
        if (downloadingTemplate) return;
        setDownloadingTemplate(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const wb = new ExcelJS.Workbook();
            wb.creator = 'Nuuru Al-Bayaan';
            wb.created = new Date();

            const sectionList = (isTeacher ? teacherSections : sections) || [];
            const sectionObj = sectionList.find((gs) => String(gs?._id) === String(gradeSectionId)) || null;
            const gradeName = sectionObj?.grade?.gradeName || (grades || []).find((g) => String(g?._id) === String(gradeId))?.gradeName || '';
            const shiftName = sectionObj?.shift?.shiftName || (shifts || []).find((s) => String(s?._id) === String(shiftId))?.shiftName || '';
            const sectionNum = sectionObj?.section || '';
            const subjectName = (subjects || []).find((su) => String(su?._id) === String(subjectId))?.subjectName || '';

            const sortedCols = [...(grid.columns || [])].sort((a, b) => {
                const ao = Number(a?.order || 0);
                const bo = Number(b?.order || 0);
                if (ao !== bo) return ao - bo;
                return String(a?.typeName || '').localeCompare(String(b?.typeName || ''));
            });

            const ws = wb.addWorksheet('Scores');
            const headers = [
                'Student Mongo ID',
                'Student ID',
                'Student Name',
                ...sortedCols.map((c) => {
                    const max = maxScoreMap?.[c.examId] ?? c?.maxScore ?? '';
                    return `${String(c?.typeName || 'Exam')} (${String(max || '-')})`;
                }),
            ];
            ws.addRow(headers);
            const idsRow = [
                '',
                '',
                '',
                ...sortedCols.map((c) => String(c.examId)),
            ];
            ws.addRow(idsRow);

            // Styling + hiding
            ws.getRow(1).font = { bold: true };
            ws.getRow(2).hidden = true;
            ws.getColumn(1).hidden = true;
            ws.views = [{ state: 'frozen', ySplit: 1 }];

            for (const st of (grid.students || [])) {
                const scoreCells = sortedCols.map((c) => {
                    const key = `${st.studentId}-${c.examId}-${subjectId}`;
                    const existing = scoreMap.get(key);
                    return (existing === undefined || existing === null) ? '' : existing;
                });
                ws.addRow([
                    String(st.studentId || ''),
                    String(st.studentCode || ''),
                    String(st.fullName || ''),
                    ...scoreCells,
                ]);
            }

            const meta = wb.addWorksheet('_meta');
            meta.addRow(['academicYearId', String(academicYearId || '')]);
            meta.addRow(['gradeSectionId', String(gradeSectionId || '')]);
            meta.addRow(['subjectId', String(subjectId || '')]);
            meta.addRow(['gradeName', String(gradeName || '')]);
            meta.addRow(['shiftName', String(shiftName || '')]);
            meta.addRow(['section', String(sectionNum || '')]);
            meta.addRow(['subjectName', String(subjectName || '')]);
            meta.addRow(['templateVersion', String(templateVersion || '')]);
            meta.addRow(['enrollmentStatus', String(enrollmentStatus || '')]);
            meta.addRow(['cohortId', String(cohortId || '')]);
            meta.addRow(['generatedAt', new Date().toISOString()]);
            meta.state = 'veryHidden';

            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const parts = [
                'exam_scores',
                safeFilePart(gradeName) || safeFilePart(gradeId) || safeFilePart(gradeSectionId),
                safeFilePart(shiftName) || safeFilePart(shiftId),
                sectionNum ? `Sec${safeFilePart(sectionNum)}` : safeFilePart(gradeSectionId),
                safeFilePart(subjectName) || safeFilePart(subjectId),
            ].filter(Boolean);
            a.download = `${parts.join('_')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Template download failed', e);
            toast.error(e?.message || t('common.error', { defaultValue: 'Error' }));
        } finally {
            setDownloadingTemplate(false);
        }
    };

    useEffect(() => {
        if (!examGridEnabled) {
            toast.dismiss(lockedCountToastId);
            setGrid({ students: [], columns: [], scores: [], lockedStudents: [], lockedStudentVersions: {}, templateVersion: '' });
            setLocalInputs({});
            setSavingCells(new Set());
            setErrorCells(new Set());
            return;
        }

        if (examGridQuery.isError) {
            toast.error(examGridQuery.error?.message || t('exams.management.errors.loadGridFailed'));
            toast.dismiss(lockedCountToastId);
            setGrid({ students: [], columns: [], scores: [], lockedStudents: [], lockedStudentVersions: {}, templateVersion: '' });
            setLocalInputs({});
            setSavingCells(new Set());
            setErrorCells(new Set());
            return;
        }

        const next = examGridQuery.data || { students: [], columns: [], scores: [], lockedStudents: [], lockedStudentVersions: {}, templateVersion: '' };
        setGrid(next);
        if (!templateVersion && next?.templateVersion) {
            setTemplateVersion(String(next.templateVersion));
        }

        lockedToastShownRef.current = new Set();
        const lockedCount = Array.isArray(next?.lockedStudents) ? next.lockedStudents.length : 0;
        const selectedVersion = String(templateVersion || '').trim();
        const dataVersion = String(next?.templateVersion || '').trim();
        const matchesSelectedVersion = !selectedVersion || !dataVersion || selectedVersion === dataVersion;
        if (lockedCount > 0 && matchesSelectedVersion) {
            toast.error(t('exams.management.errors.lockedCount', { count: lockedCount }), { id: lockedCountToastId });
        } else {
            toast.dismiss(lockedCountToastId);
        }
        setLocalInputs({});
        setSavingCells(new Set());
        setErrorCells(new Set());
    }, [examGridEnabled, examGridQuery.data, examGridQuery.isError, examGridQuery.error, templateVersion]);

    const handleReset = () => {
        setAcademicYearId('');
        setGradeId('');
        setShiftId('');
        setGradeSectionId('');
        setSubjectId('');
        setEnrollmentStatus('active');
        setCohortId('');
        setTimeline([]);
        setSubjects([]);
        setTemplateVersion('');
        setGrid({ students: [], columns: [], scores: [], lockedStudents: [], lockedStudentVersions: {}, templateVersion: '' });
        setLocalInputs({});
        setSavingCells(new Set());
        setErrorCells(new Set());
    };

    const handleApplyTimelineItem = (item) => {
        if (!item) return;
        const ay = item?.academicYear?._id;
        const gs = item?.gradeSection?._id;
        const g = item?.grade?._id;
        const sh = item?.shift?._id;
        const statusHint = String(item?.statusHint || '').toLowerCase();
        if (!ay || !gs || !g || !sh) return;

        applyingTimelineRef.current = true;
        setAcademicYearId(String(ay));
        setGradeId(String(g));
        setShiftId(String(sh));
        setGradeSectionId(String(gs));
        setSubjectId('');
        if (!isTeacher && statusHint && ['active', 'inactive', 'promoted', 'graduated', 'transferred', 'withdrawn'].includes(statusHint)) {
            setEnrollmentStatus(statusHint);
        }
        setTimeout(() => { applyingTimelineRef.current = false; }, 0);
    };

    const formatStatusHint = (raw) => {
        const v = String(raw || '').toLowerCase();
        if (!v) return '';
        const allowed = ['open', 'active', 'inactive', 'promoted', 'graduated', 'transferred', 'withdrawn', 'all'];
        if (allowed.includes(v)) return t(`students.enrollmentStatus.${v}`);
        return String(raw);
    };

    return (
        <div className="space-y-6">
            {!isTeacher ? (
                <EnrollmentCohortToolbar
                    enrollmentStatus={enrollmentStatus}
                    onEnrollmentStatusChange={setEnrollmentStatus}
                    enrollmentStatusOptions={enrollmentStatusOptions}
                    cohortId={cohortId}
                    onCohortChange={setCohortId}
                    cohortSelectId="exam-cohort"
                    cohortSelectName="exam-cohort"
                    className="mt-0"
                />
            ) : null}

            {!isTeacher && cohortId ? (
                <Card className="p-3">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-(--nb-color-text)">{t('exams.management.timeline.title')}</div>
                        {timelineLoading ? <div className="text-xs text-(--nb-color-muted)">{t('common.loading')}</div> : null}
                    </div>
                    {!timelineLoading && (!timeline || timeline.length === 0) ? (
                        <div className="text-sm text-(--nb-color-muted) mt-2">{t('exams.management.timeline.noData')}</div>
                    ) : null}
                    {Array.isArray(timeline) && timeline.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {timeline.map((item) => {
                                const key = `${item?.academicYear?._id}-${item?.gradeSection?._id}`;
                                const statusLabel = formatStatusHint(item?.statusHint);
                                const label = [
                                    item?.academicYear?.yearName,
                                    item?.grade?.gradeName,
                                    item?.shift?.shiftName,
                                    item?.gradeSection?.section ? `${t('common.sectionPrefix')} ${item.gradeSection.section}` : null,
                                    statusLabel ? `(${statusLabel})` : null,
                                ].filter(Boolean).join(' - ');
                                const isActive = String(academicYearId) === String(item?.academicYear?._id)
                                    && String(gradeSectionId) === String(item?.gradeSection?._id);
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => handleApplyTimelineItem(item)}
                                        className={`px-3 py-1.5 rounded-md text-sm border ${isActive ? 'bg-(--nb-color-brand) text-white border-(--nb-color-brand)' : 'bg-(--nb-color-bg-card) text-(--nb-color-text) border-(--nb-color-border) hover:bg-(--nb-color-bg)'}`}
                                    >
                                            {label || t('exams.management.timeline.itemFallback')}
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}
                </Card>
            ) : null}

            {/* Main filter row: AY â†’ Grade â†’ Shift â†’ Section â†’ Subject */}
            <Card className="p-4">
                <FilterRow align="end">
                    <FilterItem grow minWidthClass="min-w-40">
                        <AcademicYearSelect
                            id="exam-ay"
                            name="exam-ay"
                            aria-label={t('common.filters.academicYear')}
                            value={academicYearId}
                            onChange={(v) => {
                                setAcademicYearId(v);
                                setGradeSectionId('');
                                setSubjectId('');
                            }}
                            searchable
                            maxVisible={5}
                            searchPlaceholder={t('common.searchPlaceholders.academicYears')}
                            placeholder={t('common.filters.academicYear')}
                        />
                    </FilterItem>

                    {!isTeacher && (
                        <FilterItem grow minWidthClass="min-w-35">
                            <DropdownSelect
                                id="exam-grade"
                                name="exam-grade"
                                value={gradeId}
                                onChange={(v) => {
                                    setGradeId(v);
                                    setGradeSectionId('');
                                    setSubjectId('');
                                }}
                                placeholder={t('common.filters.grade')}
                                options={[...(grades || [])]
                                    .sort((a, b) => {
                                        const at = a?.createdAt ? new Date(a.createdAt).getTime() : Number.POSITIVE_INFINITY;
                                        const bt = b?.createdAt ? new Date(b.createdAt).getTime() : Number.POSITIVE_INFINITY;
                                        return at - bt;
                                    })
                                    .map((g) => ({ value: g._id, label: g.gradeName }))}
                            />
                        </FilterItem>
                    )}

                    {!isTeacher && (
                        <FilterItem grow minWidthClass="min-w-35">
                            <FilterDropdownSelect
                                id="exam-shift"
                                name="exam-shift"
                                value={shiftId}
                                onChange={(v) => {
                                    setShiftId(v);
                                    setGradeSectionId('');
                                    setSubjectId('');
                                }}
                                placeholder={t('common.filters.shift')}
                                options={(shifts || []).map((s) => ({ value: s._id, label: s.shiftName }))}
                                searchPlaceholder={t('common.searchPlaceholders.shifts')}
                            />
                        </FilterItem>
                    )}

                    <FilterItem grow minWidthClass="min-w-45">
                        <FilterDropdownSelect
                            id="exam-section"
                            name="exam-section"
                            value={gradeSectionId}
                            onChange={(v) => {
                                setGradeSectionId(v);
                                setSubjectId('');
                            }}
                            placeholder={t('common.filters.section')}
                            disabled={isTeacher ? teacherSectionsLoading : (!gradeId || !shiftId)}
                            options={((isTeacher ? teacherSections : sections) || []).map((gs) => {
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
                            searchPlaceholder={t('common.searchPlaceholders.sections')}
                        />
                    </FilterItem>

                    <FilterItem grow minWidthClass="min-w-45">
                        <FilterDropdownSelect
                            id="exam-subject"
                            name="exam-subject"
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
                            searchPlaceholder={t('common.searchPlaceholders.subjects')}
                        />
                    </FilterItem>

                    {!isTeacher && (
                        <FilterItem grow minWidthClass="min-w-32">
                            <FilterDropdownSelect
                                id="exam-template-version"
                                name="exam-template-version"
                                value={templateVersion}
                                onChange={(v) => {
                                    setTemplateVersion(v);
                                    // clear local input buffers when switching templates
                                    setLocalInputs({});
                                    setSavingCells(new Set());
                                    setErrorCells(new Set());
                                }}
                                placeholder={t('exams.settings.placeholders.template')}
                                options={(templateVersions || []).map((v) => ({
                                    value: String(v.templateVersion),
                                    label: `v${v.templateVersion}${v.isActive ? t('exams.settings.labels.defaultSuffix') : ''}`
                                }))}
                                searchPlaceholder={t('exams.management.searchPlaceholders.templates')}
                            />
                        </FilterItem>
                    )}

                    <FilterItem className="sm:ml-auto">
                        <div className="flex items-center gap-2 flex-wrap">
                            <ActionButton
                                variant="outline"
                                onClick={downloadExcelTemplate}
                                disabled={!canExcelActions || downloadingTemplate || !canInput}
                                            title={t('exams.management.import.actions.downloadTemplate')}
                                icon={<FileDown size={16} />}
                            >
                                            {t('exams.management.import.actions.downloadTemplate')}
                            </ActionButton>

                            <ActionButton
                                variant="outline"
                                onClick={() => setImportOpen(true)}
                                disabled={!canExcelActions || !canInput}
                                title={t('exams.management.import.actions.importExcel')}
                                icon={<Upload size={16} />}
                            >
                                {t('exams.management.import.actions.importExcel')}
                            </ActionButton>

                            <ActionButton
                                variant="primary"
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

            <ExamScoresExcelImportModal
                isOpen={importOpen}
                onClose={() => setImportOpen(false)}
                canInput={canInput}
                gridParams={examGridParams}
                onImported={() => {
                    examGridQuery.refetch?.();
                    setLocalInputs({});
                    setSavingCells(new Set());
                    setErrorCells(new Set());
                }}
            />

            <Card className="p-4 overflow-auto">
                {!academicYearId || !gradeSectionId ? (
                    <p className="text-sm text-(--nb-color-muted)">{t('exams.management.emptyStates.selectFilters')}</p>
                ) : !subjectId ? (
                    <p className="text-sm text-(--nb-color-muted)">{t('exams.management.emptyStates.chooseSubject')}</p>
                ) : loadingGrid ? (
                    <p className="text-sm text-(--nb-color-muted)">{t('exams.management.emptyStates.loadingGrid')}</p>
                ) : grid.students.length === 0 ? (
                    <p className="text-sm text-(--nb-color-muted)">{t('exams.management.emptyStates.noStudents')}</p>
                ) : (Array.isArray(grid?.lockedStudents) && grid.lockedStudents.length > 0) ? (
                    <div className="space-y-3">
                        <div className="text-sm text-(--nb-color-text)">
                            {isTeacher
                                ? t('exams.management.locked.teacherHelp')
                                : t('exams.management.locked.adminHelp')}
                        </div>
                        <StandardTable
                            isLoading={false}
                            error={null}
                            items={['__exam_grid__']}
                            isEmpty={false}
                            rows={[]}
                            columns={[]}
                            tableProps={{
                                theadClassName: 'bg-(--nb-color-brand)',
                                tbodyClassName: 'divide-y divide-(--nb-color-border)',
                                useDefaultHeaderStyles: false,
                                renderHeader: () => (
                                    <tr>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)">{t('exams.management.table.student')}</th>
                                        {[...grid.columns]
                                            .sort((a, b) => {
                                                const ao = Number(a?.order || 0);
                                                const bo = Number(b?.order || 0);
                                                if (ao !== bo) return ao - bo;
                                                return String(a?.typeName || '').localeCompare(String(b?.typeName || ''));
                                            })
                                            .map(col => (
                                                <th key={col.examId} className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="font-medium text-white">{col.typeName}</span>
                                                        <span className="text-xs text-white/80">({maxScoreMap[col.examId] ?? '-'})</span>
                                                    </div>
                                                </th>
                                            ))}
                                        <th className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)">{t('exams.management.table.totalWithMax', { totalMax })}</th>
                                    </tr>
                                ),
                                renderBody: () => (
                                    <>
                                        {grid.students.map(st => {
                                            const locked = isStudentLocked(st.studentId);
                                            const rowTotal = grid.columns.reduce((sum, col) => {
                                                const raw = getInputValue(st.studentId, col.examId);
                                                const n = Number(raw);
                                                const weight = maxScoreMap[col.examId] ?? 100;
                                                const clamped = Number.isFinite(n) ? clamp(n, 0, weight) : 0;
                                                return sum + clamped;
                                            }, 0);
                                            return (
                                                <tr key={st.studentId} className={`odd:bg-(--nb-color-bg-card) even:bg-(--nb-color-bg) hover:bg-(--nb-color-bg) ${locked ? 'opacity-70' : ''}`}>
                                                    <td className="px-4 py-3 whitespace-nowrap text-(--nb-color-text) font-medium border-x border-(--nb-color-border)">
                                                        <span>{st.fullName}</span>
                                                        {locked ? (
                                                            <span
                                                                className="inline-flex items-center gap-1 ml-2 text-amber-600"
                                                                title={(() => {
                                                                    const vs = formatLockedVersions(st.studentId);
                                                                    return vs
                                                                        ? t('exams.management.locked.titleWithVersions', { versions: vs })
                                                                        : t('exams.management.locked.title');
                                                                })()}
                                                            >
                                                                <Lock size={14} />
                                                            </span>
                                                        ) : null}
                                                    </td>
                                                    {[...grid.columns]
                                                        .sort((a, b) => {
                                                            const ao = Number(a?.order || 0);
                                                            const bo = Number(b?.order || 0);
                                                            if (ao !== bo) return ao - bo;
                                                            return String(a?.typeName || '').localeCompare(String(b?.typeName || ''));
                                                        })
                                                        .map(col => {
                                                            const key = getCellKey(st.studentId, col.examId);
                                                            const weight = maxScoreMap[col.examId] ?? 100;
                                                            const val = getInputValue(st.studentId, col.examId);
                                                            const isSaving = savingCells.has(key);
                                                            const hasError = errorCells.has(key);
                                                            const isInvalid = invalidKeys.has(key);
                                                            return (
                                                                <td key={col.examId} className="px-2 py-2 border-x border-(--nb-color-border)">
                                                                    <div className="relative inline-flex items-center">
                                                                        <input
                                                                            type="number"
                                                                            inputMode="decimal"
                                                                            min={0}
                                                                            max={weight}
                                                                            step="0.5"
                                                                            className={`w-24 pr-7 rounded-md px-2 py-1 text-left bg-(--nb-color-bg-card) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nb-color-brand) ${isInvalid ? 'border-2 border-red-500' : (hasError ? 'border border-red-500' : 'border border-(--nb-color-border)')} ${locked ? 'cursor-not-allowed bg-(--nb-color-bg)' : ''}`}
                                                                            value={val}
                                                                            onChange={(e) => handleChange(st.studentId, col.examId, e.target.value, weight)}
                                                                            disabled={locked || !canInput}
                                                                            title={t('exams.management.cell.maxTitle', { max: weight })}
                                                                        />
                                                                        {/* Status overlay inside input (no layout shift) */}
                                                                        <span className="pointer-events-none absolute right-2 text-(--nb-color-muted)">
                                                                            {hasError ? (
                                                                                <AlertCircle size={16} className="text-red-500" title={t('exams.management.cell.saveFailed')} />
                                                                            ) : isSaving ? (
                                                                                (() => {
                                                                                    const started = savingStartTimesRef.current.get(key) || 0;
                                                                                    const show = Date.now() - started >= 250;
                                                                                    return show ? <Loader2 size={16} className="animate-spin" title={t('common.saving')} /> : null;
                                                                                })()
                                                                            ) : (recentlySaved.has(key) ? (
                                                                                <Check size={16} className="text-emerald-600" title={t('exams.management.cell.saved')} />
                                                                            ) : null)}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    <td className="px-4 py-3 text-left font-semibold text-(--nb-color-text) border-x border-(--nb-color-border)">{Number(rowTotal.toFixed(2))}</td>
                                                </tr>
                                            );
                                        })}
                                    </>
                                ),
                            }}
                        />
                        <div className="flex justify-end mt-3">
                            <ActionButton
                                variant="primary"
                                onClick={handleSaveAll}
                                title={t('exams.management.actions.saveAllTitle')}
                                disabled={!canInput || !hasUnsavedChanges || savingAll}
                            >
                                {savingAll ? t('common.saving') : saveButtonLabel}
                            </ActionButton>
                        </div>
                    </div>
                ) : (
                    <>
                    <StandardTable
                        isLoading={false}
                        error={null}
                        items={['__exam_grid__']}
                        isEmpty={false}
                        rows={[]}
                        columns={[]}
                        tableProps={{
                            theadClassName: 'bg-(--nb-color-brand)',
                            tbodyClassName: 'divide-y divide-(--nb-color-border)',
                            useDefaultHeaderStyles: false,
                            renderHeader: () => (
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)">{t('exams.management.table.student')}</th>
                                    {[...grid.columns]
                                        .sort((a, b) => {
                                            const ao = Number(a?.order || 0);
                                            const bo = Number(b?.order || 0);
                                            if (ao !== bo) return ao - bo;
                                            return String(a?.typeName || '').localeCompare(String(b?.typeName || ''));
                                        })
                                        .map(col => (
                                            <th key={col.examId} className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="font-medium text-white">{col.typeName}</span>
                                                    <span className="text-xs text-white/80">({maxScoreMap[col.examId] ?? '-'})</span>
                                                </div>
                                            </th>
                                        ))}
                                    <th className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)">{t('exams.management.table.totalWithMax', { totalMax })}</th>
                                </tr>
                            ),
                            renderBody: () => (
                                <>
                                    {grid.students.map(st => {
                                        const locked = isStudentLocked(st.studentId);
                                        const rowTotal = grid.columns.reduce((sum, col) => {
                                            const raw = getInputValue(st.studentId, col.examId);
                                            const n = Number(raw);
                                            const weight = maxScoreMap[col.examId] ?? 100;
                                            const clamped = Number.isFinite(n) ? clamp(n, 0, weight) : 0;
                                            return sum + clamped;
                                        }, 0);
                                        return (
                                            <tr key={st.studentId} className={`odd:bg-(--nb-color-bg-card) even:bg-(--nb-color-bg) hover:bg-(--nb-color-bg) ${locked ? 'opacity-70' : ''}`}>
                                                <td className="px-4 py-3 whitespace-nowrap text-(--nb-color-text) font-medium border-x border-(--nb-color-border)">{st.fullName}</td>
                                                {[...grid.columns]
                                                    .sort((a, b) => {
                                                        const ao = Number(a?.order || 0);
                                                        const bo = Number(b?.order || 0);
                                                        if (ao !== bo) return ao - bo;
                                                        return String(a?.typeName || '').localeCompare(String(b?.typeName || ''));
                                                    })
                                                    .map(col => {
                                                        const key = getCellKey(st.studentId, col.examId);
                                                        const weight = maxScoreMap[col.examId] ?? 100;
                                                        const val = getInputValue(st.studentId, col.examId);
                                                        const hasError = errorCells.has(key);
                                                        const isInvalid = invalidKeys.has(key);
                                                        return (
                                                            <td key={col.examId} className="px-2 py-2 border-x border-(--nb-color-border)">
                                                                <div className="relative inline-flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        min={0}
                                                                        max={weight}
                                                                        step="0.5"
                                                                        className={`w-24 rounded-md px-2 py-1 text-left bg-(--nb-color-bg-card) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nb-color-brand) ${isInvalid ? 'border-2 border-red-500' : (hasError ? 'border border-red-500' : 'border border-(--nb-color-border)')} ${locked ? 'cursor-not-allowed bg-(--nb-color-bg)' : ''}`}
                                                                        value={val}
                                                                        onChange={(e) => handleChange(st.studentId, col.examId, e.target.value)}
                                                                        disabled={locked || !canInput}
                                                                        title={t('exams.management.cell.maxTitle', { max: weight })}
                                                                    />
                                                                    {/* Per-cell saving text removed; saving is manual via button */}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                <td className="px-4 py-3 text-left font-semibold text-(--nb-color-text) border-x border-(--nb-color-border)">{Number(rowTotal.toFixed(2))}</td>
                                            </tr>
                                        );
                                    })}
                                </>
                            ),
                        }}
                    />
                    <div className="flex justify-end mt-3">
                        <ActionButton
                            variant="primary"
                            onClick={handleSaveAll}
                            title={t('exams.management.actions.saveAllTitle')}
                            disabled={!canInput || !hasUnsavedChanges || savingAll}
                        >
                            {savingAll ? t('common.saving') : saveButtonLabel}
                        </ActionButton>
                    </div>
                    </>
                )}
            </Card>
        </div>
    );
}

function updateScoreArray(arr, { student, exam, subject, scoreObtained }) {
    const safeArr = Array.isArray(arr) ? arr : [];
    const idx = safeArr.findIndex(x => String(x.student) === String(student) && String(x.exam) === String(exam) && String(x.subject) === String(subject));
    if (scoreObtained === undefined) {
        if (idx >= 0) return [...safeArr.slice(0, idx), ...safeArr.slice(idx + 1)];
        return safeArr;
    }
    if (idx >= 0) {
        const next = safeArr.slice();
        next[idx] = { ...next[idx], scoreObtained };
        return next;
    }
    return [...safeArr, { student, exam, subject, scoreObtained }];
}

function clamp(n, min, max) {
    if (!Number.isFinite(n)) return undefined;
    return Math.max(min, Math.min(max, n));
}

