import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import { RotateCcw, Check, Loader2, AlertCircle, Lock } from 'lucide-react';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import { getExamGrid, saveExamScore, getExamTemplateVersions } from '../api/exams';
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
import { getAssignments as getTeacherAssignments } from '../../teachers/api/teachersApi';
import { teacherKeys } from '../../teachers/queryKeys.js';
import { on as onEvent, off as offEvent, EVENTS } from '../../../utils/events';

export default function ExamManagementPage() {
    const { auth, hasPermission } = useAuth();
    const queryClient = useQueryClient();
    const role = String(auth?.user?.role || '').toLowerCase();
    const isTeacher = role === 'teacher';
    const isAdmin = role === 'admin';

    // Live refresh: keep exam grids synced across browsers/tabs.
    useEffect(() => {
        const handler = () => {
            try {
                queryClient.invalidateQueries({ queryKey: ['teacher', 'examGrid'] });
                queryClient.invalidateQueries({ queryKey: ['teacher', 'examTypes'] });
            } catch {
                // ignore
            }
        };
        onEvent(EVENTS.EXAMS_CHANGED, handler);
        onEvent(EVENTS.RESULTS_CHANGED, handler);
        return () => {
            offEvent(EVENTS.EXAMS_CHANGED, handler);
            offEvent(EVENTS.RESULTS_CHANGED, handler);
        };
    }, [queryClient]);
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
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'promoted', label: 'Promoted' },
            { value: 'graduated', label: 'Graduated' },
            { value: 'transferred', label: 'Transferred' },
            { value: 'withdrawn', label: 'Withdrawn' },
            { value: 'all', label: 'All' },
        ]),
        []
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
            if (!ok) throw new Error(error || 'Failed to load section subjects');
            return data;
        },
        placeholderData: (prev) => prev,
    });

    useEffect(() => {
        setSubjects([]);
        setSubjectId('');
        if (!gradeSectionId) return;
        const subs = Array.isArray(gradeSectionQuery.data?.subjects) ? gradeSectionQuery.data.subjects : [];
        setSubjects(subs);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gradeSectionId, gradeSectionQuery.data]);

    useEffect(() => {
        if (!gradeSectionId) return;
        if (!gradeSectionQuery.isError) return;
        toast.error(gradeSectionQuery.error?.message || 'Failed to load section subjects');
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

    const saveCell = async (studentId, examId, value, weight) => {
        if (!canInput) {
            if (!noInputToastShownRef.current) {
                noInputToastShownRef.current = true;
                toast.error('You do not have permission to input exam scores');
            }
            return;
        }
        if (isStudentLocked(studentId)) {
            const k = String(studentId);
            if (!lockedToastShownRef.current.has(k)) {
                lockedToastShownRef.current.add(k);
                const vs = formatLockedVersions(studentId);
                toast.error(`This student already has scores saved under ${vs || 'another template'}. Switch to that template to edit.`);
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
        const { ok, data } = await saveExamScore({ studentId, examId, subjectId, scoreObtained: n });
        setSavingCells(prev => { const next = new Set(prev); next.delete(key); return next; });
        if (!ok) {
            setErrorCells(prev => new Set(prev).add(key));
            toast.error(data?.message || 'Save failed');
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
                toast.error('You do not have permission to input exam scores');
            }
            return;
        }
        if (isStudentLocked(studentId)) {
            const k = String(studentId);
            if (!lockedToastShownRef.current.has(k)) {
                lockedToastShownRef.current.add(k);
                const vs = formatLockedVersions(studentId);
                toast.error(`This student already has scores saved under ${vs || 'another template'}. Switch to that template to edit.`);
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
    const saveButtonLabel = changedExistingCount > 0 ? 'Update' : 'Save';

    const handleSaveAll = async () => {
        if (!canInput) {
            toast.error('You do not have permission to input exam scores');
            return;
        }
        if (!hasUnsavedChanges) return;
        if (invalidKeys && invalidKeys.size > 0) {
            toast.error(`Fix ${invalidKeys.size} invalid entr${invalidKeys.size === 1 ? 'y' : 'ies'} before saving.`);
            return;
        }
        setSavingAll(true);
        try {
            const tasks = changedKeys.map((k) => {
                const parts = k.split('-');
                const studentId = parts[0];
                const examId = parts[1];
                const weight = maxScoreMap[examId] ?? 100;
                const value = localInputs[k];
                return saveCell(studentId, examId, value, weight);
            });
            await Promise.all(tasks);
            toast.success(changedExistingCount > 0 ? 'Updated scores successfully' : 'Saved scores successfully');
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
            if (!ok) throw new Error(error || 'Failed to load grid');
            return data || { students: [], columns: [], scores: [], lockedStudents: [], lockedStudentVersions: {}, templateVersion: '' };
        },
        placeholderData: (prev) => prev,
    });

    const loadingGrid = Boolean(examGridQuery.isLoading && examGridQuery.data == null);

    useEffect(() => {
        if (!examGridEnabled) {
            setGrid({ students: [], columns: [], scores: [], lockedStudents: [], lockedStudentVersions: {}, templateVersion: '' });
            setLocalInputs({});
            setSavingCells(new Set());
            setErrorCells(new Set());
            return;
        }

        if (examGridQuery.isError) {
            toast.error(examGridQuery.error?.message || 'Failed to load grid');
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
        if (lockedCount > 0) {
            toast.error(`${lockedCount} student(s) already have scores saved under another template (locked).`);
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
                        <div className="text-sm font-semibold text-gray-800">Cohort timeline</div>
                        {timelineLoading ? <div className="text-xs text-gray-500">Loading…</div> : null}
                    </div>
                    {!timelineLoading && (!timeline || timeline.length === 0) ? (
                        <div className="text-sm text-gray-500 mt-2">No timeline data found for this cohort.</div>
                    ) : null}
                    {Array.isArray(timeline) && timeline.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {timeline.map((t) => {
                                const key = `${t?.academicYear?._id}-${t?.gradeSection?._id}`;
                                const label = [
                                    t?.academicYear?.yearName,
                                    t?.grade?.gradeName,
                                    t?.shift?.shiftName,
                                    t?.gradeSection?.section ? `Sec ${t.gradeSection.section}` : null,
                                    t?.statusHint ? `(${t.statusHint})` : null,
                                ].filter(Boolean).join(' - ');
                                const isActive = String(academicYearId) === String(t?.academicYear?._id)
                                    && String(gradeSectionId) === String(t?.gradeSection?._id);
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => handleApplyTimelineItem(t)}
                                        className={`px-3 py-1.5 rounded-md text-sm border ${isActive ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        {label || 'Timeline item'}
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}
                </Card>
            ) : null}

            {/* Main filter row: AY → Grade → Shift → Section → Subject */}
            <Card className="p-4">
                <FilterRow align="end">
                    <FilterItem grow minWidthClass="min-w-40">
                        <AcademicYearSelect
                            id="exam-ay"
                            name="exam-ay"
                            aria-label="Academic Year"
                            value={academicYearId}
                            onChange={(v) => {
                                setAcademicYearId(v);
                                setGradeSectionId('');
                                setSubjectId('');
                            }}
                            searchable
                            maxVisible={5}
                            searchPlaceholder="Search academic years…"
                            placeholder="Academic Year"
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
                                placeholder="Grade"
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
                                placeholder="Shift"
                                options={(shifts || []).map((s) => ({ value: s._id, label: s.shiftName }))}
                                searchPlaceholder="Search shifts…"
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
                            placeholder="Section"
                            disabled={isTeacher ? teacherSectionsLoading : (!gradeId || !shiftId)}
                            options={((isTeacher ? teacherSections : sections) || []).map((gs) => {
                                const gradeName = gs?.grade?.gradeName;
                                const sectionNum = gs?.section;
                                const shiftName = gs?.shift?.shiftName;
                                const tail = [shiftName].filter(Boolean).join(' - ');
                                const label = [
                                    gradeName ? `${gradeName}` : null,
                                    sectionNum ? `Sec ${sectionNum}` : null,
                                    tail ? `(${tail})` : null,
                                ].filter(Boolean).join(' - ');
                                return { value: gs._id, label: label || gs.sectionName || 'Section' };
                            })}
                            searchPlaceholder="Search sections…"
                        />
                    </FilterItem>

                    <FilterItem grow minWidthClass="min-w-45">
                        <FilterDropdownSelect
                            id="exam-subject"
                            name="exam-subject"
                            value={subjectId}
                            onChange={setSubjectId}
                            disabled={!gradeSectionId || (isTeacher && (teacherAssignmentsLoading || teacherAllowedSubjectIds?.size === 0))}
                            placeholder={isTeacher && teacherAssignmentsLoading ? 'Loading…' : 'Subject'}
                            options={(() => {
                                const list = subjects || [];
                                if (!isTeacher || !teacherAllowedSubjectIds) return list.map((su) => ({ value: su._id, label: su.subjectName }));
                                if (teacherAllowedSubjectIds.size === 0) return [];
                                return list
                                    .filter((su) => teacherAllowedSubjectIds.has(String(su?._id)))
                                    .map((su) => ({ value: su._id, label: su.subjectName }));
                            })()}
                            searchPlaceholder="Search subjects…"
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
                                placeholder="Template"
                                options={(templateVersions || []).map((v) => ({
                                    value: String(v.templateVersion),
                                    label: `v${v.templateVersion}${v.isActive ? ' (default)' : ''}`
                                }))}
                                searchPlaceholder="Search templates…"
                            />
                        </FilterItem>
                    )}

                    <FilterItem className="sm:ml-auto">
                        <div className="flex items-center gap-2 flex-wrap">
                            <ActionButton
                                variant="primary"
                                onClick={handleReset}
                                title="Reset filters"
                                icon={<RotateCcw size={16} />}
                            >
                                Reset
                            </ActionButton>
                        </div>
                    </FilterItem>
                </FilterRow>
            </Card>

            <Card className="p-4 overflow-auto">
                {!academicYearId || !gradeSectionId ? (
                    <p className="text-sm text-gray-500">Select Academic Year, Grade, Shift and Section.</p>
                ) : !subjectId ? (
                    <p className="text-sm text-gray-500">Choose a Subject to load the grid.</p>
                ) : loadingGrid ? (
                    <p className="text-sm text-gray-500">Loading grid…</p>
                ) : grid.students.length === 0 ? (
                    <p className="text-sm text-gray-500">No students or data for this selection.</p>
                ) : (Array.isArray(grid?.lockedStudents) && grid.lockedStudents.length > 0) ? (
                    <div className="space-y-3">
                        <div className="text-sm text-gray-700">
                            {isTeacher
                                ? 'Some students are locked because they already have scores saved under another template.'
                                : 'Some students are locked because they already have scores under another template. Use the Template dropdown above to switch to the version shown in the error.'}
                        </div>
                        <StandardTable
                            isLoading={false}
                            error={null}
                            items={['__exam_grid__']}
                            isEmpty={false}
                            rows={[]}
                            columns={[]}
                            tableProps={{
                                theadClassName: 'bg-gray-800',
                                tbodyClassName: 'divide-y divide-gray-200',
                                useDefaultHeaderStyles: false,
                                renderHeader: () => (
                                    <tr>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Student</th>
                                        {[...grid.columns]
                                            .sort((a, b) => {
                                                const ao = Number(a?.order || 0);
                                                const bo = Number(b?.order || 0);
                                                if (ao !== bo) return ao - bo;
                                                return String(a?.typeName || '').localeCompare(String(b?.typeName || ''));
                                            })
                                            .map(col => (
                                                <th key={col.examId} className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="font-medium text-white">{col.typeName}</span>
                                                        <span className="text-xs text-gray-200">({maxScoreMap[col.examId] ?? '-'})</span>
                                                    </div>
                                                </th>
                                            ))}
                                        <th className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Total ({totalMax})</th>
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
                                                <tr key={st.studentId} className={`odd:bg-white even:bg-gray-50 hover:bg-gray-50 ${locked ? 'opacity-70' : ''}`}>
                                                    <td className="px-4 py-3 whitespace-nowrap text-gray-800 font-medium border-x border-gray-200">
                                                        <span>{st.fullName}</span>
                                                        {locked ? (
                                                            <span className="inline-flex items-center gap-1 ml-2 text-amber-600" title={`Locked${formatLockedVersions(st.studentId) ? ` (${formatLockedVersions(st.studentId)})` : ''}`}>
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
                                                                <td key={col.examId} className="px-2 py-2 border-x border-gray-200">
                                                                    <div className="relative inline-flex items-center">
                                                                        <input
                                                                            type="number"
                                                                            inputMode="decimal"
                                                                            min={0}
                                                                            max={weight}
                                                                            step="0.5"
                                                                            className={`w-24 pr-7 rounded-md px-2 py-1 text-left bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isInvalid ? 'border-2 border-red-500' : (hasError ? 'border border-red-500' : 'border border-gray-300')} ${locked ? 'cursor-not-allowed bg-gray-100' : ''}`}
                                                                            value={val}
                                                                            onChange={(e) => handleChange(st.studentId, col.examId, e.target.value, weight)}
                                                                            disabled={locked || !canInput}
                                                                            title={`Max: ${weight}`}
                                                                        />
                                                                        {/* Status overlay inside input (no layout shift) */}
                                                                        <span className="pointer-events-none absolute right-2 text-gray-400">
                                                                            {hasError ? (
                                                                                <AlertCircle size={16} className="text-red-500" title="Save failed" />
                                                                            ) : isSaving ? (
                                                                                (() => {
                                                                                    const started = savingStartTimesRef.current.get(key) || 0;
                                                                                    const show = Date.now() - started >= 250;
                                                                                    return show ? <Loader2 size={16} className="animate-spin" title="Saving…" /> : null;
                                                                                })()
                                                                            ) : (recentlySaved.has(key) ? (
                                                                                <Check size={16} className="text-emerald-600" title="Saved" />
                                                                            ) : null)}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    <td className="px-4 py-3 text-left font-semibold text-gray-900 border-x border-gray-200">{Number(rowTotal.toFixed(2))}</td>
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
                                title="Save all pending entries"
                                disabled={!canInput || !hasUnsavedChanges || savingAll}
                            >
                                {savingAll ? 'Saving…' : saveButtonLabel}
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
                            theadClassName: 'bg-gray-800',
                            tbodyClassName: 'divide-y divide-gray-200',
                            useDefaultHeaderStyles: false,
                            renderHeader: () => (
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Student</th>
                                    {[...grid.columns]
                                        .sort((a, b) => {
                                            const ao = Number(a?.order || 0);
                                            const bo = Number(b?.order || 0);
                                            if (ao !== bo) return ao - bo;
                                            return String(a?.typeName || '').localeCompare(String(b?.typeName || ''));
                                        })
                                        .map(col => (
                                            <th key={col.examId} className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="font-medium text-white">{col.typeName}</span>
                                                    <span className="text-xs text-gray-200">({maxScoreMap[col.examId] ?? '-'})</span>
                                                </div>
                                            </th>
                                        ))}
                                    <th className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Total ({totalMax})</th>
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
                                            <tr key={st.studentId} className={`odd:bg-white even:bg-gray-50 hover:bg-gray-50 ${locked ? 'opacity-70' : ''}`}>
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-800 font-medium border-x border-gray-200">{st.fullName}</td>
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
                                                            <td key={col.examId} className="px-2 py-2 border-x border-gray-200">
                                                                <div className="relative inline-flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        min={0}
                                                                        max={weight}
                                                                        step="0.5"
                                                                        className={`w-24 rounded-md px-2 py-1 text-left bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isInvalid ? 'border-2 border-red-500' : (hasError ? 'border border-red-500' : 'border border-gray-300')} ${locked ? 'cursor-not-allowed bg-gray-100' : ''}`}
                                                                        value={val}
                                                                        onChange={(e) => handleChange(st.studentId, col.examId, e.target.value)}
                                                                        disabled={locked || !canInput}
                                                                        title={`Max: ${weight}`}
                                                                    />
                                                                    {/* Per-cell saving text removed; saving is manual via button */}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                <td className="px-4 py-3 text-left font-semibold text-gray-900 border-x border-gray-200">{Number(rowTotal.toFixed(2))}</td>
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
                            title="Save all pending entries"
                            disabled={!canInput || !hasUnsavedChanges || savingAll}
                        >
                            {savingAll ? 'Saving…' : saveButtonLabel}
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

