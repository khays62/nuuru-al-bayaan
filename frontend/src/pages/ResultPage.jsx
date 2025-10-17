import React, { useEffect, useMemo, useRef, useState } from 'react';
import bannerImg from '../assets/image.png';
import toast from 'react-hot-toast';
import { getAcademicYears, getGrades, getShifts, getGradeSectionById, getExamSummaryAbort, getExamTypes } from '../api';
import { useCascadingFilters } from '../hooks/useCascadingFilters';
import AcademicYearSelect from '../components/lookups/AcademicYearSelect';
import GradeSelect from '../components/lookups/GradeSelect';
import ShiftSelect from '../components/lookups/ShiftSelect';
import GradeSectionSelect from '../components/lookups/GradeSectionSelect';

export default function ResultPage() {
    // Persist filters in sessionStorage (not URL)
    const SESSION_KEY = 'results:filters:v1';
    const saved = (() => {
        try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}'); } catch { return {}; }
    })();
    const [years, setYears] = useState([]);
    const [grades, setGrades] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [examTypes, setExamTypes] = useState([]);

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

    // Modes: subject | overall | examType | top | bottom (first four requested)
    const [mode, setMode] = useState(saved.mode || 'subject');
    const [topN, setTopN] = useState(Number(saved.top || 0));
    const [bottomN, setBottomN] = useState(Number(saved.bot || 0));
    const [minTotal] = useState('');
    const [minAvg] = useState('');

    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ results: [], classAverage: 0 });

    // Transcript modal removed from Results; use dedicated Transcript page instead

    // Lookups (with simple memo cache for exam types to avoid duplicate requests)
    useEffect(() => {
        (async () => {
            try {
                const [ys, gs, ss, et] = await Promise.all([getAcademicYears(), getGrades(), getShifts(), getExamTypesCached()]);
                setYears(Array.isArray(ys) ? ys : (ys?.data || []));
                setGrades(Array.isArray(gs) ? gs : (gs?.data || []));
                setShifts(Array.isArray(ss) ? ss : (ss?.data || []));
                setExamTypes(Array.isArray(et) ? et : (et?.data || []));
            } catch { toast.error('Failed to load lookups'); }
        })();
    }, []);

    // Persist filters to sessionStorage
    useEffect(() => {
        const payload = { ay: academicYearId, g: gradeId, sh: shiftId, gs: gradeSectionId, sub: subjectId, et: examTypeId, mode, top: topN, bot: bottomN };
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload)); } catch (err) { void err; }
    }, [academicYearId, gradeId, shiftId, gradeSectionId, subjectId, examTypeId, mode, topN, bottomN]);

    // Sections for selection
    // handled by useCascadingFilters

    // Subjects from selected section
    useEffect(() => {
        (async () => {
            setSubjects([]); setSubjectId('');
            if (!gradeSectionId) return;
            const { ok, data, error } = await getGradeSectionById(gradeSectionId);
            if (!ok) { toast.error(error || 'Failed to load subjects'); return; }
            setSubjects(Array.isArray(data?.subjects) ? data.subjects : []);
        })();
    }, [gradeSectionId]);

    // Auto-fetch summary with debounce and abort to avoid duplicate requests
    const fetchAbortRef = useRef(null);
    const handleReset = () => {
        try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
        if (fetchAbortRef.current) {
            try { fetchAbortRef.current.abort(); } catch { /* ignore */ }
        }
        setAcademicYearId('');
        setGradeId('');
        setShiftId('');
        setGradeSectionId('');
        setSubjectId('');
        setExamTypeId('');
        setMode('subject');
        setTopN(0);
        setBottomN(0);
        setSummary({ results: [], classAverage: 0 });
        setLoading(false);
    };
    useEffect(() => {
        // quick validations
        if (!academicYearId || !gradeSectionId) { setSummary({ results: [], classAverage: 0 }); return; }
        if (mode === 'subject' && !subjectId) { setSummary({ results: [], classAverage: 0 }); return; }
        if (mode === 'examType' && !examTypeId) { setSummary({ results: [], classAverage: 0 }); return; }
        if ((mode === 'top' && (!topN || topN <= 0)) || (mode === 'bottom' && (!bottomN || bottomN <= 0))) {
            setSummary({ results: [], classAverage: 0 });
            return;
        }
        setLoading(true);
        const handle = setTimeout(async () => {
            try {
                if (fetchAbortRef.current) fetchAbortRef.current.abort();
                const controller = new AbortController();
                fetchAbortRef.current = controller;
                const params = { academicYearId, gradeSectionId };
                if (mode) params.mode = (mode === 'examType' ? 'examType' : mode);
                if (mode === 'subject' && subjectId) params.subjectId = subjectId;
                if (mode === 'examType' && examTypeId) params.examTypeId = examTypeId;
                if (mode === 'top' && topN) params.topN = String(topN);
                if (mode === 'bottom' && bottomN) params.bottomN = String(bottomN);
                const { ok, data, error } = await getExamSummaryAbort(params, { signal: controller.signal });
                if (!ok) {
                    if (error !== 'aborted') toast.error(error || 'Failed to load summary');
                    setSummary({ results: [], classAverage: 0 });
                    return;
                }
                let resultData = data || { results: [], classAverage: 0 };
                if (minTotal !== '' || minAvg !== '') {
                    const minT = minTotal === '' ? -Infinity : Number(minTotal);
                    const minA = minAvg === '' ? -Infinity : Number(minAvg);
                    resultData.results = (resultData.results || []).filter(r => (r.total ?? 0) >= minT && (r.average ?? 0) >= minA);
                }
                setSummary(resultData);
            } finally {
                setLoading(false);
            }
        }, 400); // debounce
        return () => clearTimeout(handle);
        
    }, [academicYearId, gradeSectionId, subjectId, examTypeId, mode, topN, bottomN, minTotal, minAvg]);

    const results = useMemo(() => summary?.results || [], [summary]);
    const subjectCols = useMemo(() => summary?.subjects || [], [summary]);

    // Add utility to format number to 2 decimals
    const fmt2 = (n) => Number((n ?? 0).toFixed?.(2));

    // Inside component (top-level function body), add handlers
    const handleExportCsv = () => {
        if (!results || results.length === 0) return;
        // Only export for default table (not trend/difficulty)
        if (mode === 'trend' || mode === 'difficulty') return;
        const headers = ['Rank', 'Student', ...subjectCols.map(s => s.subjectName), 'Total (100)', 'Average'];
        const lines = [headers.join(',')];
        for (const r of results) {
            const subjectVals = subjectCols.map(sc => {
                const found = (r.subjectScores || []).find(s => String(s.subjectId) === String(sc._id));
                const val = fmt2(found?.total ?? 0);
                return Number.isFinite(val) ? val : '';
            });
            const row = [r.rank, `"${(r.fullName || '').replaceAll('"','""')}"`, ...subjectVals, fmt2(r.total ?? 0), fmt2(r.average ?? 0)];
            lines.push(row.join(','));
        }
        const csv = lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'results.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        window.print();
    };

    // openTranscript removed

    // (Transfer logs UI omitted on this page)

    return (
        <div className="space-y-6">
            {/* Print-only header (clean style like transcript) */}
            <div className="print-only">
                <div className="mb-4">
                    <img src={bannerImg} alt="School Banner" className="w-full h-auto" />
                </div>
                <div className="text-center mb-2">
                    <h2 className="text-xl font-bold">Class Results & Rankings</h2>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                    <div><span className="text-gray-600">Academic Year:</span> <span className="font-semibold">{years.find(y=>y._id===academicYearId)?.yearName || '-'}</span></div>
                    <div><span className="text-gray-600">Grade:</span> <span className="font-semibold">{grades.find(g=>g._id===gradeId)?.gradeName || '-'}</span></div>
                    <div><span className="text-gray-600">Shift:</span> <span className="font-semibold">{shifts.find(s=>s._id===shiftId)?.shiftName || '-'}</span></div>
                    <div><span className="text-gray-600">Section:</span> <span className="font-semibold">{formatSection((sections||[]).find(sc=>sc._id===gradeSectionId) || {})}</span></div>
                </div>
            </div>
            <div className='no-print'>
                <h1 className="text-2xl font-bold text-gray-800 ">Results & Rankings</h1>
                <p className="mt-1 text-sm text-gray-600">Pick filters to load class results and rankings automatically. Totals are normalized to 100.</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center gap-3 no-print">
                <AcademicYearSelect
                    value={academicYearId}
                    onChange={(v)=>{ setAcademicYearId(v); resetLower('ay'); }}
                    placeholder="Academic Year"
                />
                <GradeSelect
                    value={gradeId}
                    onChange={(v)=>{ setGradeId(v); resetLower('grade'); }}
                    placeholder="Grade"
                />
                <ShiftSelect
                    value={shiftId}
                    onChange={(v)=>{ setShiftId(v); resetLower('shift'); }}
                    placeholder="Shift"
                />
                <GradeSectionSelect
                    academicYearId={academicYearId}
                    gradeId={gradeId}
                    shiftId={shiftId}
                    value={gradeSectionId}
                    onChange={setGradeSectionId}
                    placeholder="Section"
                />
                <select
                    className="border rounded px-2 py-1"
                    value={mode}
                    onChange={(e)=> setMode(e.target.value)}
                >
                    <option value="subject">Subject</option>
                    <option value="overall">Overall</option>
                    <option value="examType">Exam Type</option>
                    <option value="top">Top N</option>
                    <option value="bottom">Bottom N</option>
                    <option value="trend">Trend (Mid vs Final)</option>
                    <option value="difficulty">Subject Difficulty</option>
                </select>
                {mode === 'subject' && (
                    <select
                        className="border rounded px-2 py-1"
                        value={subjectId}
                        onChange={(e)=> setSubjectId(e.target.value)}
                        disabled={!gradeSectionId}
                    >
                        <option value="">Subject</option>
                        {(subjects||[]).map(su => (
                            <option key={su._id} value={su._id}>{su.subjectName}</option>
                        ))}
                    </select>
                )}
                {mode === 'examType' && (
                    <select
                        className="border rounded px-2 py-1"
                        value={examTypeId}
                        onChange={(e)=> setExamTypeId(e.target.value)}
                        disabled={!gradeSectionId}
                    >
                        <option value="">Exam Type</option>
                        {(examTypes||[]).map(et => (
                            <option key={et._id} value={et._id}>{et.typeName}</option>
                        ))}
                    </select>
                )}
                {(mode === 'top' || mode === 'bottom') && (
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">N</label>
                        <input className="w-20 border rounded px-2 py-1" type="number" min={1} max={100} value={mode==='top'?topN:bottomN} onChange={e=> (mode==='top'? setTopN(Number(e.target.value)||0): setBottomN(Number(e.target.value)||0))} />
                    </div>
                )}
                <div className="md:ml-auto">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="px-3 py-2 text-sm rounded border bg-white hover:bg-gray-50"
                    >
                        Reset filters
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow overflow-auto">
                {(!academicYearId || !gradeSectionId) ? (
                    <p className="text-sm text-gray-500">Select Academic Year, Grade, Shift, and Section to view results.</p>
                ) : (mode === 'subject' && !subjectId) ? (
                    <p className="text-sm text-gray-500">Choose a Subject to view results.</p>
                ) : (mode === 'examType' && !examTypeId) ? (
                    <p className="text-sm text-gray-500">Choose an Exam Type to view results.</p>
                ) : loading ? (
                    <p className="text-sm text-gray-500">Loading results…</p>
                ) : (mode === 'trend') ? (
                    <table className="min-w-full text-sm border-separate border-spacing-0">
                        <thead>
                            <tr>
                                <th className="text-left p-3 border-b sticky top-0 bg-gray-50 z-10">Rank</th>
                                <th className="text-left p-3 border-b sticky top-0 bg-gray-50 z-10">Student</th>
                                <th className="text-right p-3 border-b sticky top-0 bg-gray-50 z-10">Mid-term</th>
                                <th className="text-right p-3 border-b sticky top-0 bg-gray-50 z-10">Final</th>
                                <th className="text-right p-3 border-b sticky top-0 bg-gray-50 z-10">Delta</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map(r => (
                                <tr key={r.studentId} className="odd:bg-gray-50 hover:bg-gray-50">
                                    <td className="p-3 border-b text-right">{r.rank}</td>
                                    <td className="p-3 border-b whitespace-nowrap">{r.fullName}</td>
                                    <td className="p-3 border-b text-right">{Number((r.mid ?? 0).toFixed?.(2))}</td>
                                    <td className="p-3 border-b text-right">{Number((r.final ?? 0).toFixed?.(2))}</td>
                                    <td className="p-3 border-b text-right font-semibold">{Number((r.delta ?? 0).toFixed?.(2))}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td className="p-3 border-t text-gray-600" colSpan={4}>Class Avg Delta</td>
                                <td className="p-3 border-t text-right font-semibold">{Number((summary.classAverage ?? 0).toFixed?.(2))}</td>
                            </tr>
                        </tfoot>
                    </table>
                ) : (mode === 'difficulty') ? (
                    <table className="min-w-full text-sm border-separate border-spacing-0">
                        <thead>
                            <tr>
                                <th className="text-left p-3 border-b sticky top-0 bg-gray-50 z-10">Subject</th>
                                <th className="text-right p-3 border-b sticky top-0 bg-gray-50 z-10">Avg</th>
                                <th className="text-right p-3 border-b sticky top-0 bg-gray-50 z-10">Students</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(summary?.subjects || []).map(sc => (
                                <tr key={String(sc._id)} className="odd:bg-gray-50 hover:bg-gray-50">
                                    <td className="p-3 border-b whitespace-nowrap">{sc.subjectName}</td>
                                    <td className="p-3 border-b text-right">{Number((sc.average ?? 0).toFixed?.(2))}</td>
                                    <td className="p-3 border-b text-right text-gray-600">{sc.count ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td className="p-3 border-t text-gray-600">Class Avg (subjects)</td>
                                <td className="p-3 border-t text-right font-semibold">{Number((summary.classAverage ?? 0).toFixed?.(2))}</td>
                                <td className="p-3 border-t text-right text-gray-500">—</td>
                            </tr>
                        </tfoot>
                    </table>
                ) : (results.length === 0) ? (
                    <p className="text-sm text-gray-500">No results found for the selected filters.</p>
                ) : (
                    <>
                    <div className="flex items-center gap-3" />
                    <div className="ml-auto flex items-center gap-2 no-print">
                        <button
                            type="button"
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border bg-white hover:bg-gray-50 shadow-sm active:scale-[0.99] transition disabled:opacity-50"
                            onClick={handleExportCsv}
                            disabled={loading || !academicYearId || !gradeSectionId || mode==='trend' || mode==='difficulty' || results.length===0}
                        >
                            Export CSV
                        </button>
                        <button
                            type="button"
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border bg-white hover:bg-gray-50 shadow-sm active:scale-[0.99] transition"
                            onClick={handlePrint}
                        >
                            Print
                        </button>
                    </div>
                    <table className="min-w-full text-sm border-separate border-spacing-0">
                        <thead>
                            <tr>
                                <th className="text-left p-3 border-b sticky top-0 bg-gray-50 z-10">Rank</th>
                                <th className="text-left p-3 border-b sticky top-0 bg-gray-50 z-10">Student</th>
                                {subjectCols.map(sc => (
                                    <th key={String(sc._id)} className="text-right p-3 border-b sticky top-0 bg-gray-50 z-10">{sc.subjectName}</th>
                                ))}
                                <th className="text-right p-3 border-b sticky top-0 bg-gray-50 z-10">Total (100)</th>
                                <th className="text-right p-3 border-b sticky top-0 bg-gray-50 z-10">Average</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map(r => (
                                <tr key={r.studentId} className="odd:bg-gray-50 hover:bg-gray-50">
                                    <td className="p-3 border-b text-right">{r.rank}</td>
                                    <td className="p-3 border-b whitespace-nowrap">{r.fullName}</td>
                                    {subjectCols.map(sc => {
                                        const found = (r.subjectScores || []).find(s => String(s.subjectId) === String(sc._id));
                                        return <td key={String(sc._id)} className="p-3 border-b text-right">{Number((found?.total ?? 0).toFixed?.(2) || (found?.total ?? 0))}</td>;
                                    })}
                                    <td className="p-3 border-b text-right font-semibold">{Number(r.total?.toFixed?.(2) ?? r.total)}</td>
                                    <td className="p-3 border-b text-right">{Number((r.average ?? 0).toFixed?.(2))}</td>
                                                                        
                                </tr>
                            ))}
                        </tbody>
        
                        <tfoot>
                            <tr>
                                                                <td className="p-3 border-t text-gray-600" colSpan={2}>Class Average</td>
                                {subjectCols.map(sc => {
                                  let sum = 0; let count = 0;
                                  for (const r of results) {
                                    const found = (r.subjectScores || []).find(s => String(s.subjectId) === String(sc._id));
                                    if (typeof found?.total === 'number') { sum += found.total; count += 1; }
                                  }
                                  const avg = count ? fmt2(sum / count) : 0;
                                                                    return <td key={String(sc._id)} className="p-3 border-t text-right font-medium">{avg}</td>;
                                })}
                                                                <td className="p-3 border-t text-right font-semibold" colSpan={1}>{fmt2(summary.classAverage ?? 0)}</td>
                                                                <td className="p-3 border-t text-right text-gray-500">—</td>
                            </tr>
                        </tfoot>
                    </table>
                    </>
                )}
            </div>
            {/* Print footer with date and page number */}
            <div className="print-footer print-only">
                <div>Printed on: {new Date().toLocaleString()}</div>
                <div>Page <span className="pageNumber"></span> of <span className="totalPages"></span></div>
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

// Lightweight client-side caches
let __examTypesCache = null;
async function getExamTypesCached() {
    if (__examTypesCache) return __examTypesCache;
    const data = await getExamTypes();
    __examTypesCache = data;
    return data;
}
