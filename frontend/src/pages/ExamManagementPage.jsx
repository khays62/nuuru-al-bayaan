import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import FilterSelect from '../components/common/DataToolbar/FilterSelect';
import { getAcademicYears, getGrades, getShifts, listGradeSections, getExamGrid, saveExamScore, getGradeSectionById } from '../api/apiService';

export default function ExamManagementPage() {
    const [years, setYears] = useState([]);
    const [grades, setGrades] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [sections, setSections] = useState([]);
    const [subjects, setSubjects] = useState([]); // subjects assigned to the selected section only

    const [academicYearId, setAcademicYearId] = useState('');
    const [gradeId, setGradeId] = useState('');
    const [shiftId, setShiftId] = useState('');
    const [gradeSectionId, setGradeSectionId] = useState('');
    const [subjectId, setSubjectId] = useState('');

    const [grid, setGrid] = useState({ students: [], columns: [], scores: [] });
    const [loadingGrid, setLoadingGrid] = useState(false);
    const [localInputs, setLocalInputs] = useState({}); // key: studentId-examId-subjectId -> string
    const [savingCells, setSavingCells] = useState(new Set()); // keys being saved
    const [errorCells, setErrorCells] = useState(new Set()); // keys with last error
    const debounceTimers = useRef(new Map()); // key -> timer

    // Lookups
    useEffect(() => {
        (async () => {
            try {
                const [ys, gs, ss] = await Promise.all([getAcademicYears(), getGrades(), getShifts()]);
                setYears(Array.isArray(ys) ? ys : (ys?.data || []));
                setGrades(Array.isArray(gs) ? gs : (gs?.data || []));
                setShifts(Array.isArray(ss) ? ss : (ss?.data || []));
            } catch (e) { toast.error('Failed to load lookups'); }
        })();
    }, []);

    useEffect(() => {
        (async () => {
            if (academicYearId && gradeId && shiftId) {
                try {
                    const res = await listGradeSections({ academicYear: academicYearId, grade: gradeId, shift: shiftId, limit: 200 });
                    setSections(res?.data || []);
                } catch (e) {
                    setSections([]);
                }
            } else {
                setSections([]);
                setGradeSectionId('');
            }
        })();
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
                map[cols[midIdx].examId] = 50;
                map[cols[finalIdx].examId] = 50;
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
            const { ok, data, error } = await getExamGrid({ academicYearId, gradeSectionId, subjectId });
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
    }, [academicYearId, gradeSectionId, subjectId]);

    const onChangeScore = async (studentId, examId, value) => {
        const num = Number(value);
        if (!Number.isFinite(num)) return; // ignore non-number
        if (num < 0 || num > 100) { toast.error('Score must be 0..100'); return; }
        const prev = scoreMap.get(`${studentId}-${examId}-${subjectId}`);
        // optimistic update
        setGrid(g => ({ ...g, scores: updateScoreArray(g.scores, { student: studentId, exam: examId, subject: subjectId, scoreObtained: num }) }));
        const { ok, data } = await saveExamScore({ studentId, examId, subjectId, scoreObtained: num });
        if (!ok) {
            // revert
            setGrid(g => ({ ...g, scores: updateScoreArray(g.scores, { student: studentId, exam: examId, subject: subjectId, scoreObtained: prev ?? undefined }) }));
            toast.error(data?.message || 'Save failed');
        } else {
            toast.success('Saved');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Exam Management & Score Entry</h1>
                <p className="mt-1 text-sm text-gray-600">Select filters; the grid loads automatically when a subject is chosen. Enter scores inline (0..100).</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row gap-3">
                <FilterSelect value={academicYearId} onChange={setAcademicYearId} options={years.map(y=>({ value:y._id, label:y.yearName }))} placeholder="Academic Year" />
                <FilterSelect value={gradeId} onChange={setGradeId} options={grades.map(g=>({ value:g._id, label:g.gradeName }))} placeholder="Grade" />
                <FilterSelect value={shiftId} onChange={setShiftId} options={shifts.map(s=>({ value:s._id, label:s.shiftName }))} placeholder="Shift" />
                <FilterSelect value={gradeSectionId} onChange={setGradeSectionId} options={sections.map(sc=>({ value:sc._id, label:formatSection(sc) }))} placeholder="Section" />
                <FilterSelect value={subjectId} onChange={setSubjectId} options={(subjects||[]).map(su=>({ value: su._id, label: su.subjectName }))} placeholder="Subject" disabled={!gradeSectionId} />
            </div>

            <div className="bg-white p-4 rounded-lg shadow overflow-auto">
                {!academicYearId || !gradeSectionId ? (
                    <p className="text-sm text-gray-500">Select Academic Year, Grade, Shift and Section.</p>
                ) : !subjectId ? (
                    <p className="text-sm text-gray-500">Choose a Subject to load the grid.</p>
                ) : loadingGrid ? (
                    <p className="text-sm text-gray-500">Loading grid…</p>
                ) : grid.students.length === 0 ? (
                    <p className="text-sm text-gray-500">No students or data for this selection.</p>
                ) : (
                    <table className="min-w-full text-sm border-separate border-spacing-0">
                        <thead>
                            <tr>
                                <th className="text-left p-3 border-b sticky top-0 bg-white z-10">Student</th>
                                {grid.columns.map(col => (
                                    <th key={col.examId} className="text-center p-3 border-b sticky top-0 bg-white z-10">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="font-medium">{col.typeName}</span>
                                            <span className="text-xs text-gray-500">({weightMap[col.examId] ?? '-'})</span>
                                        </div>
                                    </th>
                                ))}
                                <th className="text-center p-3 border-b sticky top-0 bg-white z-10">Total (100)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {grid.students.map(st => {
                                const rowTotal = grid.columns.reduce((sum, col) => {
                                    const key = getCellKey(st.studentId, col.examId);
                                    const raw = getInputValue(st.studentId, col.examId);
                                    const n = Number(raw);
                                    const weight = weightMap[col.examId] ?? 100;
                                    const clamped = Number.isFinite(n) ? clamp(n, 0, weight) : 0;
                                    return sum + clamped;
                                }, 0);
                                return (
                                    <tr key={st.studentId} className="odd:bg-gray-50 hover:bg-gray-50">
                                        <td className="p-3 border-b whitespace-nowrap text-gray-800 font-medium">{st.fullName}</td>
                                        {grid.columns.map(col => {
                                            const key = getCellKey(st.studentId, col.examId);
                                            const weight = weightMap[col.examId] ?? 100;
                                            const val = getInputValue(st.studentId, col.examId);
                                            const isSaving = savingCells.has(key);
                                            const hasError = errorCells.has(key);
                                            return (
                                                <td key={col.examId} className="p-2 border-b">
                                                    <div className="relative inline-flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            inputMode="decimal"
                                                            min={0}
                                                            max={weight}
                                                            step="0.5"
                                                            className={`w-24 border rounded-md px-2 py-1 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${hasError ? 'border-red-500' : 'border-gray-300'}`}
                                                            value={val}
                                                            onChange={(e) => handleChange(st.studentId, col.examId, e.target.value, weight)}
                                                            onBlur={() => flushDebounce(key)}
                                                        />
                                                        {isSaving && <span className="text-xs text-gray-400">Saving…</span>}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="p-3 border-b text-center font-semibold text-gray-900">{Number(rowTotal.toFixed(2))}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

function formatSection(item) {
    const gradeName = item?.grade?.gradeName || 'Grade';
    const section = item?.section || '1';
    const yearName = item?.academicYear?.yearName || '';
    const shiftName = item?.shift?.shiftName || '';
    const tail = [yearName, shiftName].filter(Boolean).join(' - ');
    return tail ? `${gradeName} - Sec ${section} (${tail})` : `${gradeName} - Sec ${section}`;
}

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

