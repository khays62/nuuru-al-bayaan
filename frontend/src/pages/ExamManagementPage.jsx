import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ActionButton from '../components/common/ActionButton';
import { RotateCcw } from 'lucide-react';
import TableShell from '../components/common/table/TableShell';
import { getExamGrid, saveExamScore, getGradeSectionById } from '../api';
import { getCohortTimeline } from '../api';
import AcademicYearSelect from '../components/lookups/AcademicYearSelect';
import GradeSelect from '../components/lookups/GradeSelect';
import ShiftSelect from '../components/lookups/ShiftSelect';
import GradeSectionSelect from '../components/lookups/GradeSectionSelect';
import CohortSelect from '../components/lookups/CohortSelect';
import EnrollmentStatusSelect from '../components/lookups/EnrollmentStatusSelect';
import { useAuth } from "../contexts/AuthContext";

export default function ExamManagementPage() {
    const { auth, hasPermission } = useAuth();

    // const canViewExam = hasPermission("exams","view")


    const [subjects, setSubjects] = useState([]); // subjects assigned to the selected section only
    const canViewGrid = hasPermission("exams", "view");
    const canEditScores = hasPermission("exams", "edit")
    const [academicYearId, setAcademicYearId] = useState('');
    const [gradeId, setGradeId] = useState('');
    const [shiftId, setShiftId] = useState('');
    const [gradeSectionId, setGradeSectionId] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [enrollmentStatus, setEnrollmentStatus] = useState('active');
    const [cohortId, setCohortId] = useState('');
    const [timeline, setTimeline] = useState([]);
    const [timelineLoading, setTimelineLoading] = useState(false);

    const [grid, setGrid] = useState({ students: [], columns: [], scores: [] });
    const [loadingGrid, setLoadingGrid] = useState(false);
    const [localInputs, setLocalInputs] = useState({}); // key: studentId-examId-subjectId -> string
    const [savingCells, setSavingCells] = useState(new Set()); // keys being saved
    const [errorCells, setErrorCells] = useState(new Set()); // keys with last error
    const debounceTimers = useRef(new Map()); // key -> timer

    // Flag to differentiate user manual changes vs timeline-driven changes
    const applyingTimelineRef = useRef(false);

    // Lookups are handled by reusable select components.
    // GradeSectionSelect will fetch sections based on AY/Grade/Shift.
    useEffect(() => {
        // Clear downstream selections ONLY if change not triggered by timeline button
        if (applyingTimelineRef.current) return;
        setGradeSectionId('');
        setSubjectId('');
    }, [academicYearId, gradeId, shiftId]);

    // When section changes, load only its assigned subjects
    useEffect(() => {
        (async () => {
            setSubjects([]);
            setSubjectId('');
            if (!gradeSectionId) return;
            const { ok, data, error } = await getGradeSectionById(gradeSectionId);
            if (!ok) {
                toast.error(error || 'Failed to load section subjects');
                return;
            }
            const subs = Array.isArray(data?.subjects) ? data.subjects : [];
            setSubjects(subs);
        })();
    }, [gradeSectionId]);

    const scoreMap = useMemo(() => {
        const m = new Map();
        for (const s of grid.scores) {
            m.set(`${s.student}-${s.exam}-${s.subject}`, s.scoreObtained);
        }
        return m;
    }, [grid.scores]);

    // Compute per-exam weights so all columns sum to 100 without DB changes
    const weightMap = useMemo(() => {
        const cols = grid.columns || [];
        if (cols.length === 0) return {};
        const names = cols.map(c => (c.typeName || '').toLowerCase());
        const map = {};
        if (cols.length === 2) {
            const midIdx = names.findIndex(n => n.includes('mid'));
            const finalIdx = names.findIndex(n => n.includes('final'));
            if (midIdx !== -1 && finalIdx !== -1) {
                // Enforce 40/60 weighting (Mid-Term 40, Final 60)
                map[cols[midIdx].examId] = 40;
                map[cols[finalIdx].examId] = 60;
                return map;
            }
        }
        const base = Math.floor(100 / cols.length);
        let remainder = 100 - base * cols.length;
        for (const c of cols) {
            map[c.examId] = base + (remainder > 0 ? 1 : 0);
            if (remainder > 0) remainder -= 1;
        }
        return map;
    }, [grid.columns]);

    const getCellKey = (studentId, examId) => `${studentId}-${examId}-${subjectId}`;

    const getInputValue = (studentId, examId) => {
        const key = getCellKey(studentId, examId);
        if (Object.prototype.hasOwnProperty.call(localInputs, key)) return localInputs[key];
        const val = scoreMap.get(key);
        return val ?? '';
    };

    // Debounced change handler
    const handleChange = (studentId, examId, value, weight) => {
        const key = getCellKey(studentId, examId);
        setLocalInputs(prev => ({ ...prev, [key]: value }));
        const timers = debounceTimers.current;
        if (timers.has(key)) clearTimeout(timers.get(key));
        const t = setTimeout(() => {
            timers.delete(key);
            saveCell(studentId, examId, value, weight);
        }, 600);
        timers.set(key, t);
    };

    const flushDebounce = (key) => {
        const timers = debounceTimers.current;
        if (timers.has(key)) {
            clearTimeout(timers.get(key));
            timers.delete(key);
        }
        const parts = key.split('-');
        const studentId = parts[0];
        const examId = parts[1];
        const weight = weightMap[examId] ?? 100;
        const value = Object.prototype.hasOwnProperty.call(localInputs, key) ? localInputs[key] : scoreMap.get(key);
        saveCell(studentId, examId, value, weight);
    };

    const saveCell = async (studentId, examId, value, weight) => {
        const key = getCellKey(studentId, examId);
        const n = clamp(Number(value), 0, weight);
        if (n === undefined) return; // ignore invalid/empty
        // optimistic update
        setSavingCells(prev => new Set(prev).add(key));
        setErrorCells(prev => { const next = new Set(prev); next.delete(key); return next; });
        setGrid(g => ({ ...g, scores: updateScoreArray(g.scores, { student: studentId, exam: examId, subject: subjectId, scoreObtained: n }) }));
        const { ok, data } = await saveExamScore({ studentId, examId, subjectId, scoreObtained: n });
        setSavingCells(prev => { const next = new Set(prev); next.delete(key); return next; });
        if (!ok) {
            setErrorCells(prev => new Set(prev).add(key));
            toast.error(data?.message || 'Save failed');
        } else {
            // normalize localInputs to saved number string to avoid drift
            setLocalInputs(prev => ({ ...prev, [key]: String(n) }));
        }
    };

    // Auto-fetch grid whenever all required filters are selected
    // Load timeline when cohort selected
    useEffect(() => {
        (async () => {
            if (!cohortId) { setTimeline([]); return; }
            setTimelineLoading(true);
            const { data } = await getCohortTimeline(cohortId);
            setTimelineLoading(false);
            setTimeline(data || []);
        })();
    }, [cohortId]);

    useEffect(() => {
        (async () => {
            if (!academicYearId || !gradeSectionId || !subjectId) {
                setGrid({ students: [], columns: [], scores: [] });
                setLocalInputs({});
                setSavingCells(new Set());
                setErrorCells(new Set());
                return;
            }
            setLoadingGrid(true);
            const { ok, data, error } = await getExamGrid({ academicYearId, gradeSectionId, subjectId, enrollmentStatus, cohortId });
            setLoadingGrid(false);
            if (!ok) {
                toast.error(error || 'Failed to load grid');
                setGrid({ students: [], columns: [], scores: [] });
                setLocalInputs({});
                return;
            }
            setGrid(data || { students: [], columns: [], scores: [] });
            setLocalInputs({});
            setSavingCells(new Set());
            setErrorCells(new Set());
        })();
    }, [academicYearId, gradeSectionId, subjectId, enrollmentStatus, cohortId]);

    // removed legacy onChangeScore (now handled by debounced handleChange/flushDebounce)
    const handleReset = () => {
        setAcademicYearId('');
        setGradeId('');
        setShiftId('');
        setGradeSectionId('');
        setSubjectId('');
        setEnrollmentStatus('active');
        setCohortId('');
        setTimeline([]); // clear cohort timeline
        setSubjects([]);
        setGrid({ students: [], columns: [], scores: [] });
        setLocalInputs({});
        setSavingCells(new Set());
        setErrorCells(new Set());
    };



    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Exam Management & Score Entry</h1>
                <p className="mt-1 text-sm text-gray-600">Select filters; the grid loads automatically when a subject is chosen. Enter scores inline (0..100).</p>
            </div>

            {canViewGrid && (
  <><>
                    {/* Filters */}
                    <div className="bg-white p-4 rounded-lg shadow flex flex-row flex-wrap gap-3 items-end">
                        <AcademicYearSelect
                            id="exam-ay"
                            name="exam-ay"
                            aria-label="Academic Year"
                            value={academicYearId}
                            onChange={(v) => {
                                setAcademicYearId(v);
                                setGradeSectionId('');
                                setSubjectId('');
                                setCohortId('');
                                setTimeline([]);
                            } }
                            className="flex-1 min-w-[140px]"
                            placeholder="Academic Year" />

                        <CohortSelect
                            value={cohortId}
                            onChange={(v) => setCohortId(v)}
                            mode="context"
                            academicYear={academicYearId}
                            disabled={!academicYearId}
                            className="flex-1 min-w-[140px] border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Cohort" />

                        <EnrollmentStatusSelect
                            value={enrollmentStatus}
                            onChange={(v) => setEnrollmentStatus(v)}
                            className="flex-1 min-w-[160px] border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enrollment Status" />

                        <GradeSelect
                            id="exam-grade"
                            name="exam-grade"
                            aria-label="Grade"
                            value={gradeId}
                            onChange={(v) => setGradeId(v)}
                            className="flex-1 min-w-[120px]"
                            placeholder="Grade" />

                        <ShiftSelect
                            id="exam-shift"
                            name="exam-shift"
                            aria-label="Shift"
                            value={shiftId}
                            onChange={(v) => setShiftId(v)}
                            className="flex-1 min-w-[120px]"
                            placeholder="Shift" />

                        <GradeSectionSelect
                            id="exam-section"
                            name="exam-section"
                            aria-label="Section"
                            gradeId={gradeId}
                            shiftId={shiftId}
                            value={gradeSectionId}
                            onChange={(v) => {
                                setGradeSectionId(v);
                                setSubjectId('');
                            } }
                            className="flex-1 min-w-[160px]"
                            placeholder="Section" />

                        <select
                            id="exam-subject"
                            name="exam-subject"
                            aria-label="Subject"
                            className="flex-1 min-w-[140px] px-3 py-2 bg-white/90 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            value={subjectId}
                            onChange={(e) => setSubjectId(e.target.value)}
                            disabled={!gradeSectionId}
                        >
                            <option value="">Subject</option>
                            {(subjects || []).map((su) => (
                                <option key={su._id} value={su._id}>
                                    {su.subjectName}
                                </option>
                            ))}
                        </select>

                        <div className="flex items-center gap-2 ml-auto flex-wrap">
                            <ActionButton
                                variant="neutral"
                                onClick={handleReset}
                                title="Reset filters"
                                icon={<RotateCcw size={16} />}
                            >
                                Reset
                            </ActionButton>
                        </div>
                    </div>

                    {/* Cohort Timeline */}
                    {cohortId && timeline.length > 0 && (
                        <div className="bg-white p-3 rounded-lg shadow flex flex-row flex-wrap gap-2 items-center">
                            <div className="text-sm font-medium text-gray-600 mr-2">Cohort Timeline:</div>
                            {timelineLoading && <div className="text-xs text-gray-500">Loading…</div>}
                            {!timelineLoading &&
                                timeline.map((entry) => {
                                    const active = academicYearId === String(entry.academicYear._id) &&
                                        gradeSectionId === String(entry.gradeSection._id);
                                    return (
                                        <button
                                            key={String(entry.academicYear._id) + String(entry.gradeSection._id)}
                                            type="button"
                                            onClick={() => {
                                                applyingTimelineRef.current = true;
                                                setAcademicYearId(String(entry.academicYear._id));
                                                setGradeId(String(entry.grade._id));
                                                setShiftId(String(entry.shift._id));
                                                setGradeSectionId(String(entry.gradeSection._id));
                                                setSubjectId('');
                                                // Release flag after microtask
                                                queueMicrotask(() => {
                                                    applyingTimelineRef.current = false;
                                                });
                                            } }
                                            className={`text-xs px-2 py-1 rounded border ${active
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-300'}`}
                                        >
                                            {entry.academicYear.yearName} / {entry.grade.gradeName}
                                            {entry.gradeSection.section ? ` Sec ${entry.gradeSection.section}` : ''}
                                        </button>
                                    );
                                })}
                        </div>
                    )}
                </><div className="bg-white p-4 rounded-lg shadow overflow-auto">
                        {!academicYearId || !gradeSectionId ? (
                            <p className="text-sm text-gray-500">Select Academic Year, Grade, Shift and Section.</p>
                        ) : !subjectId ? (
                            <p className="text-sm text-gray-500">Choose a Subject to load the grid.</p>
                        ) : loadingGrid ? (
                            <p className="text-sm text-gray-500">Loading grid…</p>
                        ) : grid.students.length === 0 ? (
                            <p className="text-sm text-gray-500">No students or data for this selection.</p>
                        ) : (

                            <TableShell>
                                <thead className="bg-gray-800">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Student</th>
                                        {[...grid.columns]
                                            .sort((a, b) => {
                                                const aName = (a.typeName || '').toLowerCase();
                                                const bName = (b.typeName || '').toLowerCase();
                                                const aIsMid = /mid/.test(aName);
                                                const bIsMid = /mid/.test(bName);
                                                const aIsFinal = /final/.test(aName);
                                                const bIsFinal = /final/.test(bName);
                                                // Prioritize Mid-Term first, then Final, else by name
                                                if (aIsMid && !bIsMid) return -1;
                                                if (!aIsMid && bIsMid) return 1;
                                                if (aIsFinal && !bIsFinal) return 1;
                                                if (!aIsFinal && bIsFinal) return -1;
                                                return aName.localeCompare(bName);
                                            })
                                            .map(col => (
                                                <th key={col.examId} className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="font-medium text-white">{col.typeName}</span>
                                                        <span className="text-xs text-gray-200">({weightMap[col.examId] ?? '-'}%)</span>
                                                    </div>
                                                </th>
                                            ))}
                                        <th className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Total (100)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {grid.students.map(st => {
                                        const rowTotal = grid.columns.reduce((sum, col) => {
                                            const raw = getInputValue(st.studentId, col.examId);
                                            const n = Number(raw);
                                            const weight = weightMap[col.examId] ?? 100;
                                            const clamped = Number.isFinite(n) ? clamp(n, 0, weight) : 0;
                                            return sum + clamped;
                                        }, 0);
                                        return (
                                            <tr key={st.studentId} className="odd:bg-white even:bg-gray-50 hover:bg-gray-50">
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-800 font-medium border-x border-gray-200">{st.fullName}</td>
                                                {[...grid.columns]
                                                    .sort((a, b) => {
                                                        const aName = (a.typeName || '').toLowerCase();
                                                        const bName = (b.typeName || '').toLowerCase();
                                                        const aIsMid = /mid/.test(aName);
                                                        const bIsMid = /mid/.test(bName);
                                                        const aIsFinal = /final/.test(aName);
                                                        const bIsFinal = /final/.test(bName);
                                                        if (aIsMid && !bIsMid) return -1;
                                                        if (!aIsMid && bIsMid) return 1;
                                                        if (aIsFinal && !bIsFinal) return 1;
                                                        if (!aIsFinal && bIsFinal) return -1;
                                                        return aName.localeCompare(bName);
                                                    })
                                                    .map(col => {
                                                        const key = getCellKey(st.studentId, col.examId);
                                                        const weight = weightMap[col.examId] ?? 100;
                                                        const val = getInputValue(st.studentId, col.examId);
                                                        const isSaving = savingCells.has(key);
                                                        const hasError = errorCells.has(key);
                                                        return (
                                                            <td key={col.examId} className="px-2 py-2 border-x border-gray-200">
                                                                <div className="relative inline-flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        min={0}
                                                                        max={weight}
                                                                        step="0.5"
                                                                        className={`w-24 border rounded-md px-2 py-1 text-left bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                                                                        value={val}
                                                                        // onChange={(e) => handleChange(st.studentId, col.examId, e.target.value, weight)}
                                                                        // onBlur={() => flushDebounce(key)}
                                                                        onChange={(e) => canEditScores && handleChange(st.studentId, col.examId, e.target.value, weight)}
                                                                        onBlur={() => canEditScores && flushDebounce(key)} />
                                                                    {isSaving && <span className="text-xs text-gray-400">Saving…</span>}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                <td className="px-4 py-3 text-left font-semibold text-gray-900 border-x border-gray-200">{Number(rowTotal.toFixed(2))}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </TableShell>
                        )}
                    </div></>

)}
        </div>
    );
}

// No formatSection needed; GradeSectionSelect handles label rendering internally (via placeholder and fetched items)

function updateScoreArray(arr, { student, exam, subject, scoreObtained }) {
    const idx = arr.findIndex(x => String(x.student) === String(student) && String(x.exam) === String(exam) && String(x.subject) === String(subject));
    if (scoreObtained === undefined) {
        // remove
        if (idx >= 0) return [...arr.slice(0, idx), ...arr.slice(idx+1)];
        return arr;
    }
    if (idx >= 0) {
        const next = arr.slice();
        next[idx] = { ...next[idx], scoreObtained };
        return next;
    }
    return [...arr, { student, exam, subject, scoreObtained }];
}

// Debounced change handler and saver
function clamp(n, min, max) {
    if (!Number.isFinite(n)) return undefined;
    return Math.max(min, Math.min(max, n));
}

// Note: These functions are closures inside the component; we attach them via function declarations
// and rely on up-to-date refs/state via parameters from event lambdas.

// We need to add these inside the component scope, but since we're editing the file post-hoc,
// define them as no-ops here to avoid reference errors if misused. Real handlers are above via inline lambdas.

