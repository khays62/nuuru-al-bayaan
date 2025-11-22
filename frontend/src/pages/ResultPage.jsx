import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getAcademicYears, getGrades, getShifts, getGradeSectionById, getExamSummaryAbort, getExamTypes } from '../api';
import { useCascadingFilters } from '../hooks/useCascadingFilters';
import AcademicYearSelect from '../components/lookups/AcademicYearSelect';
import GradeSelect from '../components/lookups/GradeSelect';
import ShiftSelect from '../components/lookups/ShiftSelect';
import GradeSectionSelect from '../components/lookups/GradeSectionSelect';
import ActionButton from '../components/common/ActionButton';
import { RotateCcw, Printer, Download } from 'lucide-react';
import TableShell from '../components/common/table/TableShell';
import PrintHeader from '../components/print/PrintHeader';
import PrintFooter from '../components/print/PrintFooter';

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
            <div className="space-y-6 with-print-header with-print-footer">
                {/* Print header/footer */}
                <PrintHeader />
                <PrintFooter left="Generated by Nuuru Al-Bayaan" />
            
            <div className='no-print'>
                <h1 className="text-2xl font-bold text-gray-800 ">Results & Rankings</h1>
                <p className="mt-1 text-sm text-gray-600">Pick filters to load class results and rankings automatically. Totals are normalized to 100.</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow flex flex-row flex-wrap items-center gap-3 no-print">
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
                    gradeId={gradeId}
                    shiftId={shiftId}
                    value={gradeSectionId}
                    onChange={setGradeSectionId}
                    placeholder="Section"
                />
                <select
                    className="px-3 py-2 bg-white/90 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="px-3 py-2 bg-white/90 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="px-3 py-2 bg-white/90 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        {/* Number input styled separately for consistency */}
                    </div>
                )}
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                    <ActionButton variant="neutral" onClick={handleReset} title="Reset filters" icon={<RotateCcw size={16} />}>Reset</ActionButton>
                    <ActionButton
                        variant="neutral"
                        onClick={handleExportCsv}
                        title="Export CSV"
                        icon={<Download size={16} />}
                        disabled={loading || !academicYearId || !gradeSectionId || mode==='trend' || mode==='difficulty' || results.length===0}
                    >CSV</ActionButton>
                    <ActionButton
                        variant="neutral"
                        onClick={handlePrint}
                        title="Print"
                        icon={<Printer size={16} />}
                    >Print</ActionButton>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow overflow-auto results-print">
                {(!academicYearId || !gradeSectionId) ? (
                    <p className="text-sm text-gray-500">Select Academic Year, Grade, Shift, and Section to view results.</p>
                ) : (mode === 'subject' && !subjectId) ? (
                    <p className="text-sm text-gray-500">Choose a Subject to view results.</p>
                ) : (mode === 'examType' && !examTypeId) ? (
                    <p className="text-sm text-gray-500">Choose an Exam Type to view results.</p>
                ) : loading ? (
                    <p className="text-sm text-gray-500">Loading results…</p>
                                ) : (mode === 'trend') ? (
                                        <>
                                            {/* Removed duplicate Print action (toolbar already provides it) */}
                                            {academicYearId && gradeSectionId && (
                                                <div className="border-b pb-2 mb-2 text-sm flex flex-wrap gap-x-4 gap-y-1">
                                                    {(() => {
                                                        const selSec = (sections||[]).find(s => String(s._id) === String(gradeSectionId));
                                                        const ayName = (years||[]).find(y => String(y._id)===String(academicYearId))?.yearName || selSec?.academicYear?.yearName || '-';
                                                        const gName = (grades||[]).find(g => String(g._id)===String(gradeId))?.gradeName || selSec?.grade?.gradeName || '-';
                                                        const shName = (shifts||[]).find(s => String(s._id)===String(shiftId))?.shiftName || selSec?.shift?.shiftName || '-';
                                                        const secName = selSec?.section || '-';
                                                        return (
                                                            <>
                                                                <span><span className="font-medium">Academic Year:</span> {ayName}</span>
                                                                <span><span className="font-medium">Grade:</span> {gName}</span>
                                                                <span><span className="font-medium">Section:</span> {secName}</span>
                                                                <span><span className="font-medium">Shift:</span> {shName}</span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                            <TableShell>
                                                <thead className="bg-gray-800">
                                                    <tr>
                                                        <th className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Rank</th>
                                                        <th className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Student</th>
                                                        <th className="text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Mid-term</th>
                                                        <th className="text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Final</th>
                                                        <th className="text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Delta</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-700">
                                                    {results.map(r => (
                                                        <tr key={r.studentId} className="odd:bg-white even:bg-gray-50">
                                                            <td className="px-4 py-3 text-right border-x border-gray-700">{r.rank}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap border-x border-gray-700">{r.fullName}</td>
                                                            <td className="px-4 py-3 text-right border-x border-gray-700">{Number((r.mid ?? 0).toFixed?.(2))}</td>
                                                            <td className="px-4 py-3 text-right border-x border-gray-700">{Number((r.final ?? 0).toFixed?.(2))}</td>
                                                            <td className="px-4 py-3 text-right font-semibold border-x border-gray-700">{Number((r.delta ?? 0).toFixed?.(2))}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="border-t-2 border-gray-700">
                                                    <tr className="font-medium">
                                                        <td className="px-4 py-3 text-gray-700 border-b border-gray-700" colSpan={4}>Class Avg Delta</td>
                                                        <td className="px-4 py-3 text-right font-semibold border-b border-gray-700">{Number((summary.classAverage ?? 0).toFixed?.(2))}</td>
                                                    </tr>
                                                </tfoot>
                                            </TableShell>
                                        </>
                                ) : (mode === 'difficulty') ? (
                                        <>
                                            {/* Removed duplicate Print action (toolbar already provides it) */}
                                            {academicYearId && gradeSectionId && (
                                                <div className="border-b pb-2 mb-2 text-sm flex flex-wrap gap-x-4 gap-y-1">
                                                    {(() => {
                                                        const selSec = (sections||[]).find(s => String(s._id) === String(gradeSectionId));
                                                        const ayName = (years||[]).find(y => String(y._id)===String(academicYearId))?.yearName || selSec?.academicYear?.yearName || '-';
                                                        const gName = (grades||[]).find(g => String(g._id)===String(gradeId))?.gradeName || selSec?.grade?.gradeName || '-';
                                                        const shName = (shifts||[]).find(s => String(s._id)===String(shiftId))?.shiftName || selSec?.shift?.shiftName || '-';
                                                        const secName = selSec?.section || '-';
                                                        return (
                                                            <>
                                                                <span><span className="font-medium">Academic Year:</span> {ayName}</span>
                                                                <span><span className="font-medium">Grade:</span> {gName}</span>
                                                                <span><span className="font-medium">Section:</span> {secName}</span>
                                                                <span><span className="font-medium">Shift:</span> {shName}</span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                            <TableShell>
                                                <thead className="bg-gray-800">
                                                    <tr>
                                                        <th className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Subject</th>
                                                        <th className="text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Avg</th>
                                                        <th className="text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Students</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-700">
                                                    {(summary?.subjects || []).map(sc => (
                                                        <tr key={String(sc._id)} className="odd:bg-white even:bg-gray-50">
                                                            <td className="px-4 py-3 whitespace-nowrap border-x border-gray-700">{sc.subjectName}</td>
                                                            <td className="px-4 py-3 text-right border-x border-gray-700">{Number((sc.average ?? 0).toFixed?.(2))}</td>
                                                            <td className="px-4 py-3 text-right text-gray-700 border-x border-gray-700">{sc.count ?? '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="border-t-2 border-gray-700">
                                                    <tr className="font-medium">
                                                        <td className="px-4 py-3 text-gray-700 border-b border-gray-700">Class Avg (subjects)</td>
                                                        <td className="px-4 py-3 text-right font-semibold border-b border-gray-700">{Number((summary.classAverage ?? 0).toFixed?.(2))}</td>
                                                        <td className="px-4 py-3 text-right text-gray-500 border-b border-gray-700">—</td>
                                                    </tr>
                                                </tfoot>
                                            </TableShell>
                                        </>
                                ) : (results.length === 0) ? (
                    <p className="text-sm text-gray-500">No results found for the selected filters.</p>
                ) : (
                    <>
                    {/* Removed duplicate CSV/Print actions (toolbar already provides them) */}
                                        {/* Info block like Transcript (AY/Grade/Section/Shift) */}
                                        {academicYearId && gradeSectionId && (
                                            <div className="border-b pb-2 mb-2 text-sm flex flex-wrap gap-x-4 gap-y-1">
                                                {(() => {
                                                    const selSec = (sections||[]).find(s => String(s._id) === String(gradeSectionId));
                                                    const ayName = (years||[]).find(y => String(y._id)===String(academicYearId))?.yearName || selSec?.academicYear?.yearName || '-';
                                                    const gName = (grades||[]).find(g => String(g._id)===String(gradeId))?.gradeName || selSec?.grade?.gradeName || '-';
                                                    const shName = (shifts||[]).find(s => String(s._id)===String(shiftId))?.shiftName || selSec?.shift?.shiftName || '-';
                                                    const secName = selSec?.section || '-';
                                                    return (
                                                        <>
                                                            <span><span className="font-medium">Academic Year:</span> {ayName}</span>
                                                            <span><span className="font-medium">Grade:</span> {gName}</span>
                                                            <span><span className="font-medium">Section:</span> {secName}</span>
                                                            <span><span className="font-medium">Shift:</span> {shName}</span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                        <TableShell>
                            <thead className="bg-gray-800">
                            <tr>
                                                                        <th className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Rank</th>
                                                                        <th className="text-left px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Student</th>
                                    {subjectCols.map(sc => (
                                        <th key={String(sc._id)} className="text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">{sc.subjectName}</th>
                                ))}
                                    <th className="text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Total (100)</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Average</th>
                            </tr>
                        </thead>
                                                <tbody className="divide-y divide-gray-700">
                            {results.map(r => (
                                                                <tr key={r.studentId} className="odd:bg-white even:bg-gray-50">
                                                                        <td className="px-4 py-3 text-right border-x border-gray-700">{r.rank}</td>
                                                                        <td className="px-4 py-3 whitespace-nowrap border-x border-gray-700">{r.fullName}</td>
                                    {subjectCols.map(sc => {
                                        const found = (r.subjectScores || []).find(s => String(s.subjectId) === String(sc._id));
                                                                                return <td key={String(sc._id)} className="px-4 py-3 text-right border-x border-gray-700">{Number((found?.total ?? 0).toFixed?.(2) || (found?.total ?? 0))}</td>;
                                    })}
                                                                        <td className="px-4 py-3 text-right font-semibold border-x border-gray-700">{Number(r.total?.toFixed?.(2) ?? r.total)}</td>
                                                                        <td className="px-4 py-3 text-right border-x border-gray-700">{Number((r.average ?? 0).toFixed?.(2))}</td>
                                                                        
                                </tr>
                            ))}
                        </tbody>
                                                <tfoot className="border-t-2 border-gray-700">
                                                        <tr className="font-medium">
                                                                <td className="px-4 py-3 text-gray-700 text-right border-b border-gray-700" colSpan={2}>Class Average</td>
                                                                {subjectCols.map(sc => {
                                                                    let sum = 0; let count = 0;
                                                                    for (const r of results) {
                                                                        const found = (r.subjectScores || []).find(s => String(s.subjectId) === String(sc._id));
                                                                        if (typeof found?.total === 'number') { sum += found.total; count += 1; }
                                                                    }
                                                                    const avg = count ? fmt2(sum / count) : 0;
                                                                    return <td key={String(sc._id)} className="px-4 py-3 text-right font-medium border-b border-gray-700">{avg}</td>;
                                                                })}
                                                                <td className="px-4 py-3 text-right font-semibold border-b border-gray-700" colSpan={1}>{fmt2(summary.classAverage ?? 0)}</td>
                                                                <td className="px-4 py-3 text-right text-gray-500 border-b border-gray-700">—</td>
                                                        </tr>
                                                </tfoot>
                    </TableShell>
                    </>
                )}
            </div>
            
        </div>
    );
}

// Lightweight client-side caches
let __examTypesCache = null;
async function getExamTypesCached() {
    if (__examTypesCache) return __examTypesCache;
    const data = await getExamTypes();
    __examTypesCache = data;
    return data;
}
