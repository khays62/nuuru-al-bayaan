import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import LoadingState from '../../../../shared/components/feedback/LoadingState.jsx';
import PrintHeader from '../../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../../shared/components/print/PrintFooter.jsx';
import TableShell from '../../../../shared/components/table/TableShell.jsx';
import { getStudentHistory, getStudentTranscript } from '../../../../api';
import { useAuth } from '../../../../auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { studentKeys } from '../../queryKeys';
import Card from '../../../../shared/components/ui/Card.jsx';
import Alert from '../../../../shared/components/ui/Alert.jsx';
import UiLoadingState from '../../../../shared/components/ui/LoadingState.jsx';

export default function TranscriptTab() {
  const { studentId: paramStudentId } = useParams();
  const { auth } = useAuth();

  const rawStudentRef = auth?.user?.studentRef;
  const studentRefId = rawStudentRef?._id || rawStudentRef || null;
  const studentId = paramStudentId || (auth?.user?.role === 'student' ? studentRefId : null);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | enrollmentId
  const [activeEnrId, setActiveEnrId] = useState(null);

  const enrollmentsQuery = useQuery({
    queryKey: studentKeys.history(studentId, { page: 1, limit: 1000 }),
    enabled: !!studentId,
    queryFn: async () => {
      const res = await getStudentHistory(studentId, { page: 1, limit: 1000 });
      const rows = Array.isArray(res?.data) ? res.data : [];
      return [...rows].sort((a, b) => {
        const ya = ayStart(a?.academicYear?.yearName);
        const yb = ayStart(b?.academicYear?.yearName);
        if (ya !== yb) return ya - yb;
        const sa = (a?.sequenceInYear ?? 1);
        const sb = (b?.sequenceInYear ?? 1);
        if (sa !== sb) return sa - sb;
        const aj = a?.joinedAt ? new Date(a.joinedAt).getTime() : 0;
        const bj = b?.joinedAt ? new Date(b.joinedAt).getTime() : 0;
        if (aj !== bj) return aj - bj;
        const ac = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bc = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ac - bc;
      });
    },
  });

  const enrollments = enrollmentsQuery.data || [];
  const enrLoading = enrollmentsQuery.isLoading;
  const enrError = enrollmentsQuery.isError ? 'Failed to load enrollments' : null;

  useEffect(() => {
    if (!enrollments?.length) return;
    setActiveEnrId(String(enrollments[0]._id));
    setActiveTab('summary');
  }, [enrollments]);

  const activeEnr = useMemo(() => {
    if (!activeEnrId) return null;
    return enrollments.find(e => String(e._id) === String(activeEnrId)) || null;
  }, [enrollments, activeEnrId]);

  const activeParams = useMemo(() => {
    if (!activeEnr) return null;
    const academicYearId = activeEnr.academicYear?._id || activeEnr.academicYear;
    const gradeSectionId = activeEnr.gradeSection?._id || activeEnr.gradeSection;
    if (!academicYearId || !gradeSectionId) return null;
    return { academicYearId: String(academicYearId), gradeSectionId: String(gradeSectionId) };
  }, [activeEnr]);

  const txQuery = useQuery({
    queryKey: studentKeys.transcriptByEnrollment(studentId, {
      academicYearId: activeParams?.academicYearId || null,
      gradeSectionId: activeParams?.gradeSectionId || null,
    }),
    enabled: !!studentId && activeTab !== 'summary' && !!activeParams?.academicYearId && !!activeParams?.gradeSectionId,
    queryFn: async ({ signal }) => {
      const { ok, data, error } = await getStudentTranscript(
        { academicYearId: activeParams.academicYearId, gradeSectionId: activeParams.gradeSectionId, studentId },
        { signal }
      );
      if (!ok) throw new Error(error || 'Transcript load failed');
      return data;
    },
  });

  const txLoading = txQuery.isLoading;
  const txError = txQuery.isError ? (txQuery.error?.message || 'Transcript load failed') : null;

  const overallSummaryQuery = useQuery({
    queryKey: studentKeys.overallSummary(studentId),
    enabled: !!studentId,
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/transcripts/students/${studentId}/overall-summary`, { signal, credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch overall summary');
      const data = await res.json();
      return {
        overallTotal: Number(data?.overallTotal || 0),
        weightedAverage: Number(data?.weightedAverage || 0),
        cumulativeRank: data?.cumulativeRank ?? null,
        cumulativeRankOutOf: Number(data?.cumulativeRankOutOf || 0),
        rankFromWeightedInLatest: data?.rankFromWeightedInLatest ?? null,
        rankLatestOutOf: Number(data?.rankLatestOutOf || 0),
      };
    },
  });

  const overallLoading = overallSummaryQuery.isLoading;
  const overallError = overallSummaryQuery.isError ? (overallSummaryQuery.error?.message || 'Summary load failed') : null;
  const overallSummary = overallSummaryQuery.data || null;

  return (
    <Card className="p-4 with-print-header with-print-footer">
      <PrintHeader />

      <div className="mb-4">
        <div className="border-l-4 border-blue-600 bg-blue-50 rounded px-3 py-2">
          <h2 className="text-lg font-semibold text-blue-900">Transcript</h2>
          <div className="text-xs text-blue-800/80 mt-0.5">Your results by level</div>
        </div>
      </div>
      {enrLoading && (
        <div className="py-6">
          <UiLoadingState label="Loading…" className="border-0 bg-transparent p-0 justify-start" />
        </div>
      )}
      {enrError && <Alert variant="danger" title={enrError} className="py-3" />}
      {!enrLoading && !enrError && (
        <div className="space-y-4">
          {enrollments.length === 0 && (
            <div className="text-sm text-gray-500">No enrollments found for this student.</div>
          )}
          {enrollments.length > 0 && (
            <LevelsTabs
              enrollments={enrollments}
              activeTab={activeTab}
              activeEnrId={activeEnrId}
              setActiveTab={setActiveTab}
              setActiveEnrId={setActiveEnrId}
            />
          )}

          {activeTab === 'summary' ? (
            <Card className="p-4 shadow-none">
              <div className="flex items-center justify-between bg-gray-50 text-gray-700 border border-gray-200 px-3 py-2 rounded">
                <div className="text-sm font-medium">Overall Summary</div>
                {overallLoading && <span className="text-xs text-slate-500">Loading…</span>}
              </div>
              <div className="mt-3">
                {overallError && <Alert variant="danger" title={overallError} className="mt-2" />}
                {(() => {
                  const overallTotal = overallSummary?.overallTotal ?? 0;
                  const weightedAvg = overallSummary?.weightedAverage ?? 0;
                  const rankDisp = overallSummary?.cumulativeRank ?? null;
                  return (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded bg-emerald-50 text-emerald-700">
                        <span className="font-semibold">Overall:</span>
                        <span>{formatNumber(overallTotal)}</span>
                      </div>
                      <div className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded bg-blue-50 text-blue-700">
                        <span className="font-semibold">Average:</span>
                        <span>{formatPercent(weightedAvg)}</span>
                      </div>
                      <div className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded bg-purple-50 text-purple-700" title="Booska ardayga marka la kala hormariyo wadarta dhibcaha taariikhdiisa, waxaa la barbar dhigay ardayda fasalka ugu dambeeya (dhammaan statuses).">
                        <span className="font-semibold">Rank:</span>
                        <span>{rankDisp != null ? `${rankDisp}` : '-'}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </Card>
          ) : activeEnrId && (() => {
            const en = activeEnr;
            if (!en) return null;
            const t = txQuery.data;
            const orderedExamTypes = t ? orderExamTypes(t.examTypes) : [];
            return (
              <Card className="p-4 border-blue-100 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-blue-50 text-blue-900 border border-blue-100 px-3 py-3 rounded">
                  <div className="text-sm">
                    <span className="font-semibold text-blue-900">AY:</span>{' '}
                    <span className="text-blue-900/90">{en.academicYear?.yearName || '-'}</span>
                    <span className="mx-2 text-blue-900/60">•</span>
                    <span className="font-semibold text-blue-900">Grade:</span>{' '}
                    <span className="text-blue-900/90">{en.grade?.gradeName || en.gradeSection?.grade?.gradeName || '-'}</span>
                    <span className="mx-2 text-blue-900/60">•</span>
                    <span className="font-semibold text-blue-900">Section:</span>{' '}
                    <span className="text-blue-900/90">{en.gradeSection?.section || '-'}</span>
                    {en.gradeSection?.shift && (<>
                      <span className="mx-2 text-blue-900/60">•</span>
                      <span className="font-semibold text-blue-900">Shift:</span>{' '}
                      <span className="text-blue-900/90">{en.shift?.shiftName || en.gradeSection?.shift?.shiftName || en.gradeSection?.shift || '-'}</span>
                    </>)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-semibold">Overall: {formatNumber(t?.overall?.total || 0)}</span>
                    <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 font-semibold">Average: {formatNumber(t?.overall?.average || 0)}</span>
                  </div>
                </div>
                <div className="mt-3">
                  {txLoading && !t && (
                    <LoadingState
                      variant="table"
                      rows={7}
                      columns={5}
                      message="Loading transcript…"
                    />
                  )}
                  {txError && !t && (
                    <Alert variant="danger" title={txError} className="mt-2" />
                  )}
                  {t && (
                    t.subjects?.length === 0 || t.examTypes?.length === 0 ? (
                      <div className="text-sm text-gray-500">No exams recorded for this enrollment.</div>
                    ) : (
                      <div className="space-y-3">
                        <TableShell className="shadow-sm ring-blue-100">
                          <thead>
                            <tr className="bg-gray-800 text-white border-b border-gray-700">
                              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Subject</th>
                              {orderedExamTypes.map(et => (
                                <th key={String(et._id)} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{et.typeName || 'Exam'}</th>
                              ))}
                              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.rows.map((r, idx) => (
                              <tr key={String(r.subjectId)} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-blue-50 transition-colors border-b last:border-0`}>
                                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{r.subjectName}</td>
                                {orderedExamTypes.map(et => {
                                  const cell = r.exams.find(x => String(x.examTypeId) === String(et._id));
                                  return (
                                    <td key={String(et._id)} className="px-4 py-3 text-gray-800">{formatNumber(cell ? cell.score : 0)}</td>
                                  );
                                })}
                                <td className="px-4 py-3 font-semibold text-gray-900">{formatNumber(r.total || 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </TableShell>
                      </div>
                    )
                  )}
                </div>
              </Card>
            );
          })()}
        </div>
      )}
      <PrintFooter />
    </Card>
  );
}

function LevelsTabs({ enrollments, activeTab, activeEnrId, setActiveTab, setActiveEnrId }) {
  const MAX_PRIMARY = 3; // inta ugu horeysa ee la soo bandhigo mobile
  // Ku bilow order isla marka enrollments ay yimaadaan si aan u helno tabs isla markiiba
  const [order, setOrder] = useState(() => enrollments.map(e => String(e._id)));
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null); // { top, left, width }
  // Initialize / sync order marka enrollments beddelaan
  useEffect(() => {
    if (!enrollments.length) return;
    setOrder(prev => {
      if (!prev.length) return enrollments.map(e => String(e._id));
      const fresh = enrollments.map(e => String(e._id));
      // Ilaali tartibka hore ee ids weli jira, ku dar kuwa cusub dhamaadka
      const kept = prev.filter(id => fresh.includes(id));
      const added = fresh.filter(id => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [enrollments]);
  // Outside click si loo xiro menu
  useEffect(() => {
    if (!open) return;
    function onOutside(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('touchstart', onOutside);
    };
  }, [open]);
  // Mobile-only: haddii user uu ka doorto overflow (⋯), ka dhig id-ga la doortay inuu galo primary (swap la samee last primary)
  const promote = (id) => {
    setOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      if (idx < MAX_PRIMARY) return prev; // Hore ayuu uga mid yahay primary
      const arr = [...prev];
      const swapIdx = MAX_PRIMARY - 1; // booska ugu danbeeya ee primary
      const tmp = arr[swapIdx];
      arr[swapIdx] = arr[idx];
      arr[idx] = tmp;
      return arr;
    });
  };
  const idToEnrollment = (id) => enrollments.find(e => String(e._id) === String(id));
  const primaryIds = order.slice(0, MAX_PRIMARY);
  const overflowIds = order.slice(MAX_PRIMARY);
  const handleSelectDesktop = (id) => {
    // Desktop: wax swap/switch ah ha dhicin
    setActiveEnrId(id);
    setActiveTab(id);
  };

  const handleSelectMobile = (id) => {
    // Mobile: haddii uu ka yimid overflow (⋯), samee swap
    if (effectiveOverflow.includes(id)) promote(id);
    setActiveEnrId(id);
    setActiveTab(id);
    setOpen(false);
  };
  // Haddii order weli madhan yahay laakiin enrollments jiro, ha muujin wax ka hor inta uu effect-ka soconayo => fallback degdeg ah
  const effectivePrimary = primaryIds.length ? primaryIds : enrollments.slice(0, MAX_PRIMARY).map(e => String(e._id));
  const effectiveOverflow = primaryIds.length ? overflowIds : enrollments.slice(MAX_PRIMARY).map(e => String(e._id));
  return (
    <div className="overflow-x-auto overflow-visible">
      {/* Desktop: dhammaan levels + summary */}
      <div className="hidden md:flex items-center gap-4 border-b">
        <button
          onClick={() => setActiveTab('summary')}
          className={`${activeTab === 'summary' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600 hover:text-gray-800'} pb-2 px-1 text-sm whitespace-nowrap`}
        >Summary</button>
        {order.map((id) => {
          const en = idToEnrollment(id);
          if (!en) return null;
          const active = activeTab !== 'summary' && id === activeEnrId;
          const label = getLevelLabel(en);
          return (
            <button
              key={id}
              onClick={() => handleSelectDesktop(id)}
              className={`${active ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600 hover:text-gray-800'} pb-2 px-1 text-sm whitespace-nowrap`}
              title={`${en.academicYear?.yearName || ''} • ${en.grade?.gradeName || en.gradeSection?.grade?.gradeName || ''} • Sec ${en.gradeSection?.section || ''}`}
            >{label}</button>
          );
        })}
      </div>
      {/* Mobile: primary + overflow menu (⋯) */}
      <div className="flex md:hidden items-center justify-between border-b">
        <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('summary')}
            className={`${activeTab === 'summary' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600 hover:text-gray-800'} pb-2 px-1 text-xs whitespace-nowrap shrink-0`}
          >Summary</button>
          {effectivePrimary.map((id) => {
            const en = idToEnrollment(id);
            if (!en) return null;
            const active = activeTab !== 'summary' && id === activeEnrId;
            const label = getLevelLabel(en);
            return (
              <button
                key={id}
                onClick={() => handleSelectMobile(id)}
                className={`${active ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600 hover:text-gray-800'} pb-2 px-1 text-xs whitespace-nowrap shrink-0`}
                title={`${en.academicYear?.yearName || ''} • ${en.grade?.gradeName || en.gradeSection?.grade?.gradeName || ''} • Sec ${en.gradeSection?.section || ''}`}
              >{label}</button>
            );
          })}
        </div>
        {effectiveOverflow.length > 0 && (
          <div ref={menuRef} className="relative ml-1">
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : 'false'}
              className="text-xs text-gray-600 px-2 py-1 rounded border bg-white hover:bg-gray-50 flex items-center justify-center w-10 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              title="Levels kale"
              ref={btnRef}
            >
              <span className="font-semibold tracking-wider">⋯</span>
            </button>
            {open && (
              <FixedMenu btnRef={btnRef} setMenuPos={setMenuPos} menuPos={menuPos}>
                <ul className="py-1 text-xs">
                  {effectiveOverflow.map(id => {
                    const en = idToEnrollment(id);
                    if (!en) return null;
                    const active = activeTab !== 'summary' && id === activeEnrId;
                    const label = getLevelLabel(en);
                    return (
                      <li key={id}>
                        <button
                          onClick={() => handleSelectMobile(id)}
                          className={`w-full text-left px-3 py-1 ${active ? 'text-indigo-600 font-medium bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'} focus:outline-none focus:bg-gray-100`}
                          role="menuitem"
                        >{label}</button>
                      </li>
                    );
                  })}
                  {effectiveOverflow.length === 0 && (
                    <li className="px-3 py-1 text-gray-400 text-xs">Empty</li>
                  )}
                </ul>
              </FixedMenu>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FixedMenu({ btnRef, setMenuPos, menuPos, children }) {
  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const top = rect.bottom + 8; // 8px margin-top
    const left = rect.right - 176; // align right; width ~176px
    setMenuPos({ top, left, width: 176 });
    function onScrollOrResize() {
      const r = el.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 8, left: r.right - 176, width: 176 });
    }
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [btnRef, setMenuPos]);
  const style = menuPos ? { position: 'fixed', top: `${menuPos.top}px`, left: `${menuPos.left}px`, width: `${menuPos.width}px`, zIndex: 1000 } : { display: 'none' };
  return (
    <Card style={style} className="shadow-lg">
      {children}
    </Card>
  );
}

function getLevelLabel(enrollment) {
  const name = enrollment?.grade?.gradeName || enrollment?.gradeSection?.grade?.gradeName;
  if (name && String(name).trim()) return String(name).trim();
  return 'Level';
}

function formatNumber(n) {
  const num = Number(n || 0);
  if (Number.isNaN(num)) return '0';
  // 0 decimals for totals, 1 for averages/percentages
  return Math.round(num * 10) / 10;
}

function orderExamTypes(list) {
  const arr = Array.isArray(list) ? [...list] : [];
  const hasOrder = arr.some(x => {
    const n = Number(x?.order);
    return Number.isFinite(n) && n > 0;
  });
  if (hasOrder) {
    return arr.sort((a, b) => {
      const ao = Number(a?.order || 0);
      const bo = Number(b?.order || 0);
      if (ao !== bo) return ao - bo;
      return String(a?.typeName || '').localeCompare(String(b?.typeName || ''));
    });
  }
  const name = (x) => String(x?.typeName || '').toLowerCase();
  const hasMid = arr.some(x => name(x).includes('mid'));
  const hasFinal = arr.some(x => name(x).includes('final'));
  if (hasMid && hasFinal) {
    return arr.sort((a,b) => {
      const na = name(a), nb = name(b);
      // Mid-term first, Final last, everything else in between
      const ra = na.includes('mid') ? 0 : na.includes('final') ? 2 : 1;
      const rb = nb.includes('mid') ? 0 : nb.includes('final') ? 2 : 1;
      if (ra !== rb) return ra - rb;
      return na.localeCompare(nb);
    });
  }
  return arr.sort((a,b) => name(a).localeCompare(name(b)));
}

function ayStart(yearName) {
  if (!yearName) return 0;
  const m = String(yearName).match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : 0;
}

function formatPercent(n) {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return '0%';
  return `${(Math.round(num * 10) / 10).toFixed(1)}%`;
}
