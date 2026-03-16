import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import LoadingState from '../../../../shared/components/ui/LoadingState.jsx';
import PrintHeader from '../../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../../shared/components/print/PrintFooter.jsx';
import StandardTable from '../../../../shared/components/table/StandardTable.jsx';
import { getStudentTranscript, getStudentOverallSummary } from '../../../../api';
import { http } from '../../../../shared/api/http.js';
import { useAuth } from '../../../../auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { studentKeys } from '../../queryKeys';
import Card from '../../../../shared/components/ui/Card.jsx';
import Alert from '../../../../shared/components/ui/Alert.jsx';
import { useI18n } from '../../../../i18n/useI18n';

export default function TranscriptTab() {
  const { studentId: paramStudentId } = useParams();
  const { auth } = useAuth();
  const { t } = useI18n();

  const rawStudentRef = auth?.user?.studentRef;
  const studentRefId = rawStudentRef?._id || rawStudentRef || null;
  const studentId = paramStudentId || (auth?.user?.role === 'student' ? studentRefId : null);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | enrollmentId
  const [activeEnrId, setActiveEnrId] = useState(null);

  const enrollmentsQuery = useQuery({
    queryKey: studentKeys.transcriptIndex(studentId),
    enabled: !!studentId,
    refetchOnMount: 'always',
    staleTime: 0,
    queryFn: async ({ signal }) => {
      const payload = await http.fetchJson(`students/${String(studentId)}/full-transcript?mode=index`, { signal });
      const raw = Array.isArray(payload?.enrollments) ? payload.enrollments : [];

      const rows = raw.map((e) => {
        const gs = e?.gradeSection || null;
        const gradeName = typeof gs?.grade === 'string' ? gs.grade : (gs?.grade?.gradeName || '');
        const shiftName = typeof gs?.shift === 'string' ? gs.shift : (gs?.shift?.shiftName || '');
        return {
          _id: e?.enrollmentId || e?._id,
          academicYear: e?.academicYear || null,
          grade: gradeName ? { gradeName } : (e?.grade || null),
          shift: shiftName ? { shiftName } : (e?.shift || null),
          gradeSection: gs
            ? {
                _id: gs?._id,
                section: gs?.section,
                grade: gradeName ? { gradeName } : gs?.grade,
                shift: shiftName ? { shiftName } : gs?.shift,
              }
            : null,
          joinedAt: e?.joinedAt,
          leftAt: e?.leftAt,
          status: e?.status,
        };
      });

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

  const enrollments = useMemo(() => (Array.isArray(enrollmentsQuery.data) ? enrollmentsQuery.data : []), [enrollmentsQuery.data]);
  const enrLoading = enrollmentsQuery.isLoading;
  const enrError = enrollmentsQuery.isError ? t('students.transcriptTab.enrollmentsLoadFailed') : null;

  useEffect(() => {
    if (!enrollments?.length) return;
    // Keep user's current selection when realtime refresh happens.
    const current = activeEnrId ? enrollments.find(e => String(e._id) === String(activeEnrId)) : null;
    if (current) return;
    setActiveEnrId(String(enrollments[0]._id));
    setActiveTab('summary');
  }, [enrollments, activeEnrId]);

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
      return await getStudentOverallSummary(studentId, { signal });
    },
  });

  const overallLoading = overallSummaryQuery.isLoading;
  const overallError = overallSummaryQuery.isError ? (overallSummaryQuery.error?.message || 'Summary load failed') : null;
  const overallSummary = overallSummaryQuery.data || null;

  return (
    <Card className="p-4 with-print-header with-print-footer">
      <PrintHeader />

      <div className="mb-4">
        <div className="border-l-4 border-(--nb-color-brand) bg-(--nb-color-brand-50) rounded px-3 py-2">
          <h2 className="text-lg font-semibold text-(--nb-color-fg)">{t('nav.transcript')}</h2>
          <div className="text-xs text-(--nb-color-muted) mt-0.5">{t('students.transcriptTab.subtitle')}</div>
        </div>
      </div>
      {enrLoading && (
        <div className="py-6">
          <LoadingState label={t('common.loading')} className="border-0 bg-transparent p-0 justify-start" />
        </div>
      )}
      {enrError && <Alert variant="danger" title={enrError} className="py-3" />}
      {!enrLoading && !enrError && (
        <div className="space-y-4">
          {enrollments.length === 0 && (
            <div className="text-sm text-(--nb-color-muted)">{t('students.transcriptTab.noEnrollments')}</div>
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
              <div className="flex items-center justify-between bg-(--nb-color-bg) text-(--nb-color-fg) border border-(--nb-color-border) px-3 py-2 rounded">
                <div className="text-sm font-medium">{t('students.transcriptTab.overallSummary')}</div>
                {overallLoading && <span className="text-xs text-(--nb-color-muted)">{t('common.loading')}</span>}
              </div>
              <div className="mt-3">
                {overallError && <Alert variant="danger" title={overallError} className="mt-2" />}
                {(() => {
                  const overallTotal = overallSummary?.overallTotal ?? 0;
                  const weightedAvg = overallSummary?.weightedAverage ?? 0;
                  const rankDisp = overallSummary?.cumulativeRank ?? null;
                  return (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded bg-(--nb-color-accent-50) text-(--nb-color-accent)">
                        <span className="font-semibold">{t('students.transcriptTab.labels.overall')}:</span>
                        <span>{formatNumber(overallTotal)}</span>
                      </div>
                      <div className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded bg-(--nb-color-brand-50) text-(--nb-color-brand)">
                        <span className="font-semibold">{t('students.transcriptTab.labels.average')}:</span>
                        <span>{formatPercent(weightedAvg)}</span>
                      </div>
                      <div className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded bg-(--nb-color-bg) text-(--nb-color-fg) border border-(--nb-color-border)" title={t('students.transcriptTab.rankTooltip')}>
                        <span className="font-semibold">{t('students.transcriptTab.labels.rank')}:</span>
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
            const tx = txQuery.data;
            const orderedExamTypes = tx ? orderExamTypes(tx.examTypes) : [];
            return (
              <Card className="p-4 border-(--nb-color-border) shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-(--nb-color-brand-50) text-(--nb-color-fg) border border-(--nb-color-border) px-3 py-3 rounded">
                  <div className="text-sm">
                    <span className="font-semibold text-(--nb-color-fg)">{t('students.table.columns.academicYear')}:</span>{' '}
                    <span className="text-(--nb-color-fg)">{en.academicYear?.yearName || '-'}</span>
                    <span className="mx-2 text-(--nb-color-muted)">•</span>
                    <span className="font-semibold text-(--nb-color-fg)">{t('students.table.columns.grade')}:</span>{' '}
                    <span className="text-(--nb-color-fg)">{en.grade?.gradeName || en.gradeSection?.grade?.gradeName || '-'}</span>
                    <span className="mx-2 text-(--nb-color-muted)">•</span>
                    <span className="font-semibold text-(--nb-color-fg)">{t('students.table.columns.section')}:</span>{' '}
                    <span className="text-(--nb-color-fg)">{en.gradeSection?.section || '-'}</span>
                    {en.gradeSection?.shift && (<>
                      <span className="mx-2 text-(--nb-color-muted)">•</span>
                      <span className="font-semibold text-(--nb-color-fg)">{t('students.table.columns.shift')}:</span>{' '}
                      <span className="text-(--nb-color-fg)">{en.shift?.shiftName || en.gradeSection?.shift?.shiftName || en.gradeSection?.shift || '-'}</span>
                    </>)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-(--nb-color-accent-50) text-(--nb-color-accent) font-semibold">{t('students.transcriptTab.labels.overall')}: {formatNumber(tx?.overall?.total || 0)}</span>
                    <span className="inline-flex items-center text-xs px-2 py-1 rounded bg-(--nb-color-brand-50) text-(--nb-color-brand) font-semibold">{t('students.transcriptTab.labels.average')}: {formatNumber(tx?.overall?.average || 0)}</span>
                  </div>
                </div>
                <div className="mt-3">
                  {txLoading && !tx && (
                    <LoadingState
                      variant="table"
                      rows={7}
                      columns={5}
                      message={t('students.transcriptTab.loadingTranscript')}
                    />
                  )}
                  {txError && !tx && (
                    <Alert variant="danger" title={txError} className="mt-2" />
                  )}
                  {tx && (
                    tx.subjects?.length === 0 || tx.examTypes?.length === 0 ? (
                      <div className="text-sm text-(--nb-color-muted)">{t('students.transcriptTab.noExams')}</div>
                    ) : (
                      <div className="space-y-3">
                        <StandardTable
                          isLoading={false}
                          items={tx.rows}
                          rows={tx.rows}
                          columns={[
                            {
                              key: 'subject',
                              label: t('students.transcriptTab.table.subject'),
                              thClassName: 'text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide',
                              tdClassName: 'px-4 py-3 font-medium text-(--nb-color-text) whitespace-nowrap',
                            },
                            ...orderedExamTypes.map((et) => ({
                              key: `et:${String(et._id)}`,
                              label: et.typeName || t('students.transcriptTab.examFallback'),
                              examTypeId: String(et._id),
                              thClassName: 'text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap',
                              tdClassName: 'px-4 py-3 text-(--nb-color-text)',
                            })),
                            {
                              key: 'total',
                              label: t('students.transcriptTab.table.total'),
                              thClassName: 'text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide',
                              tdClassName: 'px-4 py-3 font-semibold text-(--nb-color-text)',
                            },
                          ]}
                          getRowKey={(r) => String(r.subjectId)}
                          renderCell={(r, col) => {
                            if (col.key === 'subject') return r.subjectName;
                            if (col.key === 'total') return formatNumber(r.total || 0);
                            if (String(col.key).startsWith('et:')) {
                              const examTypeId = col.examTypeId;
                              const cell = (r.exams || []).find((x) => String(x.examTypeId) === String(examTypeId));
                              return formatNumber(cell ? cell.score : 0);
                            }
                            return '';
                          }}
                          tableProps={{
                            theadClassName: 'bg-(--nb-color-brand) text-white border-b border-(--nb-color-border)',
                            useDefaultHeaderStyles: false,
                            baseRowClassName: 'odd:bg-(--nb-color-bg-card) even:bg-(--nb-color-bg) hover:bg-(--nb-color-brand-50) transition-colors border-b border-(--nb-color-border) last:border-0',
                          }}
                        />
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
  const { t } = useI18n();
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

  // Haddii order weli madhan yahay laakiin enrollments jiro, ha muujin wax ka hor inta uu effect-ka soconayo => fallback degdeg ah
  const effectivePrimary = primaryIds.length ? primaryIds : enrollments.slice(0, MAX_PRIMARY).map(e => String(e._id));
  const effectiveOverflow = primaryIds.length ? overflowIds : enrollments.slice(MAX_PRIMARY).map(e => String(e._id));

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

  return (
    <div>
      {/* Desktop: dhammaan levels + summary */}
      <div className="hidden md:flex items-center gap-4 border-b border-(--nb-color-border)">
        <button
          onClick={() => setActiveTab('summary')}
          className={`${activeTab === 'summary' ? 'border-b-2 border-(--nb-color-brand) text-(--nb-color-brand)' : 'text-(--nb-color-muted) hover:text-(--nb-color-text)'} pb-2 px-1 text-sm whitespace-nowrap`}
        >{t('common.summary')}</button>
        {order.map((id) => {
          const en = idToEnrollment(id);
          if (!en) return null;
          const active = activeTab !== 'summary' && id === activeEnrId;
          const label = getLevelLabel(en, t);
          return (
            <button
              key={id}
              onClick={() => handleSelectDesktop(id)}
              className={`${active ? 'border-b-2 border-(--nb-color-brand) text-(--nb-color-brand)' : 'text-(--nb-color-muted) hover:text-(--nb-color-text)'} pb-2 px-1 text-sm whitespace-nowrap`}
              title={`${en.academicYear?.yearName || ''} • ${en.grade?.gradeName || en.gradeSection?.grade?.gradeName || ''} • ${t('students.table.columns.section')} ${en.gradeSection?.section || ''}`}
            >{label}</button>
          );
        })}
      </div>

      {/* Mobile: primary + overflow menu (⋯) */}
      <div className="flex md:hidden items-center justify-between border-b border-(--nb-color-border)">
        <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('summary')}
            className={`${activeTab === 'summary' ? 'border-b-2 border-(--nb-color-brand) text-(--nb-color-brand)' : 'text-(--nb-color-muted) hover:text-(--nb-color-text)'} pb-2 px-1 text-xs whitespace-nowrap shrink-0`}
          >{t('common.summary')}</button>
          {effectivePrimary.map((id) => {
            const en = idToEnrollment(id);
            if (!en) return null;
            const active = activeTab !== 'summary' && id === activeEnrId;
            const label = getLevelLabel(en, t);
            return (
              <button
                key={id}
                onClick={() => handleSelectMobile(id)}
                className={`${active ? 'border-b-2 border-(--nb-color-brand) text-(--nb-color-brand)' : 'text-(--nb-color-muted) hover:text-(--nb-color-text)'} pb-2 px-1 text-xs whitespace-nowrap shrink-0`}
                title={`${en.academicYear?.yearName || ''} • ${en.grade?.gradeName || en.gradeSection?.grade?.gradeName || ''} • ${t('students.table.columns.section')} ${en.gradeSection?.section || ''}`}
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
              className="text-xs text-(--nb-color-muted) px-2 py-1 rounded border border-(--nb-color-border) bg-(--nb-color-bg-card) hover:bg-(--nb-color-bg) flex items-center justify-center w-10 focus:outline-none focus:ring-2 focus:ring-(--nb-color-brand)"
              title={t('students.transcriptTab.moreLevelsTooltip')}
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
                    const label = getLevelLabel(en, t);
                    return (
                      <li key={id}>
                        <button
                          onClick={() => handleSelectMobile(id)}
                          className={`w-full text-left px-3 py-1 ${active ? 'text-(--nb-color-brand) font-medium bg-(--nb-color-brand-50)' : 'text-(--nb-color-text) hover:bg-(--nb-color-bg)'} focus:outline-none focus:bg-(--nb-color-bg)`}
                          role="menuitem"
                        >{label}</button>
                      </li>
                    );
                  })}
                  {effectiveOverflow.length === 0 && (
                    <li className="px-3 py-1 text-(--nb-color-muted) text-xs">{t('common.empty')}</li>
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
    <Card style={style} className="shadow-(--nb-shadow-md)">
      {children}
    </Card>
  );
}

function getLevelLabel(enrollment, t) {
  const name = enrollment?.grade?.gradeName || enrollment?.gradeSection?.grade?.gradeName;
  if (name && String(name).trim()) return String(name).trim();
  return typeof t === 'function' ? t('students.transcriptTab.levelFallback') : 'Level';
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
