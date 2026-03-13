import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { previewPromotion, executePromotion } from '../api/promotions';
import { listStudents } from '../../students/api/studentsApi';
import { useAuth } from '../../../auth/AuthContext';
import { promotionKeys } from '../queryKeys';
import { usePromotionsRealtimeInvalidation } from '../usePromotionsRealtimeInvalidation';

import PromotionsToolbar from '../components/PromotionsToolbar.jsx';
import StudentsRosterTable from '../components/StudentsRosterTable.jsx';
import PromotionPreviewPanel from '../components/PromotionPreviewPanel.jsx';
import { formatApiErrorToast, formatCurrent, formatFrom, formatTo } from '../utils/formatters.js';
import { useI18n } from '../../../i18n/useI18n';

export default function PromotionPage() {
  const { t } = useI18n();
  const { auth, hasPermission } = useAuth();
  const role = String(auth?.user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const canPreview = isAdmin || hasPermission('promotions', 'preview') || hasPermission('promotions', 'promote');
  const canPromote = isAdmin || hasPermission('promotions', 'promote');

  const [timing, setTiming] = useState('mid-year');
  const initialFilters = { q: '', ay: '', grade: '', shift: '', section: '', cohort: '' };
  const [filters, setFilters] = useState(initialFilters);
  const [studentsError, setStudentsError] = useState(null);
  // filtersReady: all required dropdowns must be chosen (AY, Grade, Shift, Section, Cohort)
  const filtersReady = useMemo(() => (
    Boolean(filters.ay) && Boolean(filters.grade) && Boolean(filters.shift) && Boolean(filters.section) && Boolean(filters.cohort)
  ), [filters.ay, filters.grade, filters.shift, filters.section, filters.cohort]);

  const rosterParams = useMemo(
    () => ({
      search: filters.q,
      academicYear: filters.ay,
      grade: filters.grade,
      shift: filters.shift,
      gradeSectionId: filters.section,
      cohortId: filters.cohort,
      enrollmentStatus: 'active',
    }),
    [filters.q, filters.ay, filters.grade, filters.shift, filters.section, filters.cohort]
  );

  const rosterQuery = useQuery({
    queryKey: promotionKeys.roster(rosterParams),
    enabled: Boolean(filtersReady),
    queryFn: async ({ signal }) => {
      const res = await listStudents(rosterParams, { signal });
      const raw = res?.data || [];
      return raw.map((s) => ({
        ...s,
        current: {
          grade: s.grade || null,
          ay: s.academicYear || null,
          section: s.section || null,
          shift: s.shift || null,
          cohort: s.cohort || null,
        },
      }));
    },
    placeholderData: (prev) => prev,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  // Important: avoid returning a new [] each render when filtersReady=false (prevents effect loops)
  const students = useMemo(
    () => (filtersReady ? (rosterQuery.data || []) : []),
    [filtersReady, rosterQuery.data]
  );
  const studentsLoading = Boolean(filtersReady && (rosterQuery.isLoading || (rosterQuery.isFetching && students.length === 0)));

  // Keep table empty & reset selection until user chooses all filters
  useEffect(() => {
    setPreview(null);
    if (!filtersReady) {
      setSelectedIds(new Set());
      setStudentsError(null);
    }
  }, [filters, timing, filtersReady]);

  // EDCI: Realtime -> Events -> invalidate roster query -> UI updates.
  usePromotionsRealtimeInvalidation({ enabled: true });

  // Keep selection consistent with visible roster
  useEffect(() => {
    if (!filtersReady) return;
    setSelectedIds((prev) => {
      const next = new Set();
      const allowed = new Set((students || []).map((s) => String(s?._id)));
      for (const id of prev) if (allowed.has(String(id))) next.add(id);
      return next;
    });
  }, [filtersReady, students]);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [preview, setPreview] = useState(null); // { items:[], summary:{} }
  // removed `promoteResults` UI; preview + students tables are sufficient
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingPromote, setLoadingPromote] = useState(false);
  const [ayRefreshKey, setAyRefreshKey] = useState(0);

  // Also clear preview if the selected set of students changes - this prevents running Promote
  // against a preview that was generated for a different selection.
  useEffect(() => {
    setPreview(null);
  }, [selectedIds]);

  const resetPage = () => {
    setPreview(null);
    setSelectedIds(new Set());
    setFilters(initialFilters);
  };

  const handlePreview = async () => {
    if (!canPreview) {
      toast.error(t('promotions.permissions.noPreview', { defaultValue: 'You do not have permission: Promotions Preview' }));
      return;
    }
    if (!filtersReady) {
      toast.error(t('promotions.errors.selectFiltersFirst', { defaultValue: 'Select AY, Grade, Shift, Section, and Cohort first' }));
      return;
    }
    if (students.length === 0 || selectedIds.size === 0) {
      toast.error(t('promotions.errors.selectAtLeastOneStudent', { defaultValue: 'Select at least one student to preview' }));
      return;
    }
    setLoadingPreview(true);
    try {
      // Send studentIds as array in query string
      const params = new URLSearchParams();
      params.append('timing', timing);
      Array.from(selectedIds).forEach(id => params.append('studentIds', id));
    // UI no longer controls auto-create; backend decides and avoids duplicates
      const res = await previewPromotion(params);
      const { ok, items, summary, error, warnings, allNoScores } = res || {};
      if (!ok) {
        toast.error(formatApiErrorToast(res || { error: error || t('promotions.errors.previewFailed', { defaultValue: 'Preview failed' }) }));
        setPreview(null);
        return;
      }
      // preview items received (hide any non-active students just in case)
      const safeItems = (Array.isArray(items) ? items : []).filter((it) => !(
        Array.isArray(it?.errors) && it.errors.includes('ACTIVE_ENROLLMENT_MISSING')
      ));
      setPreview({ items: safeItems, summary });
      // Show a short toast if all selected have no scores, but still render table
      if (allNoScores || (Array.isArray(warnings) && warnings.includes('NO_SCORES_ALL'))) {
        toast.error(t('promotions.errors.noScoresAllShort', { defaultValue: 'All selected students have no exam scores.' }));
      }
    } catch (err) {
      toast.error(formatApiErrorToast(err));
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handlePromote = async () => {
    if (!canPromote) {
      toast.error(t('promotions.permissions.noPromote', { defaultValue: 'You do not have permission: Promotions Promote' }));
      return;
    }
    if (!preview) { toast.error(t('promotions.errors.runPreviewFirst', { defaultValue: 'Run preview first' })); return; }

    setLoadingPromote(true);
    try {
      const response = await executePromotion({ timing, studentIds: Array.from(selectedIds) });
      // If backend returns error status, show toast and stop
      if (response && response.ok === false && response.error) {
        toast.error(formatApiErrorToast(response));
        // Clear preview when server returns an error (e.g., duplicate/mid-year already done)
        setPreview(null);
        setLoadingPromote(false);
        return;
      }
        const { ok, results, error } = response;
    if (!ok) throw new Error(error || t('promotions.errors.promotionFailed', { defaultValue: 'Promotion failed' }));
      // Clear preview after a successful promotion so Promote cannot be accidentally re-run
      // on stale preview (user must re-run Preview for the current timing/selection).
      setPreview(null);
      // If backend created a new Academic Year and returned its id, refresh AY list
      // and auto-select the new academic year so the UI reflects the new AY.
      // Backend field expected: `createdAcademicYearId` (or `createdAcademicYear._id`).
      const createdAYId = response?.createdAcademicYearId || response?.createdAcademicYear?.["_id"] || response?.createdAcademicYear?.id;
        if (createdAYId) {
        // trigger AcademicYearSelect to reload options
        setAyRefreshKey(k => k + 1);
        // select the newly created AY in filters
        setFilters(prev => ({ ...prev, ay: createdAYId }));
        // dispatch global event so any AcademicYearSelect instances refresh immediately
  try { window.dispatchEvent(new CustomEvent('academicYear:created', { detail: { createdAcademicYearId: createdAYId } })); } catch { /* ignore */ }
      }
      // Single feedback toast: show counts after promote completes.
      const promotedCount = Number(response?.summary?.promotable || 0);
      const graduatesCount = Number(response?.summary?.graduates || 0);
      const notEligibleCount = (Array.isArray(results) ? results : []).filter((r) => (
        Array.isArray(r?.errors) && r.errors.includes('BELOW_MIN_AVG')
      )).length;
      const otherFailedCount = (Array.isArray(results) ? results : []).filter((r) => (
        Array.isArray(r?.errors)
        && r.errors.length > 0
        && !r.errors.includes('BELOW_MIN_AVG')
      )).length;

      let msg = `Promotion completed. Promoted: ${promotedCount}. Not eligible (avg < 60): ${notEligibleCount}.`;
      {
        const parts = [
          t('promotions.toasts.completedBase', { defaultValue: 'Promotion completed.' }),
          t('promotions.toasts.promotedCount', { defaultValue: 'Promoted: {{count}}.', count: promotedCount }),
          t('promotions.toasts.notEligibleCount', { defaultValue: 'Not eligible (avg < 60): {{count}}.', count: notEligibleCount }),
        ];
        if (graduatesCount > 0) parts.push(t('promotions.toasts.graduatedCount', { defaultValue: 'Graduated: {{count}}.', count: graduatesCount }));
        if (otherFailedCount > 0) parts.push(t('promotions.toasts.failedCount', { defaultValue: 'Failed: {{count}}.', count: otherFailedCount }));
        msg = parts.join(' ');
      }

      if (otherFailedCount > 0) toast.error(msg);
      else toast.success(msg);
      // clear selection but keep preview so user can compare
      setSelectedIds(new Set());
    } catch (err) {
      const code = err?.data?.error || '';
      if (code === 'NO_SCORES_ALL') {
        toast.error(t('promotions.errors.noScoresAllLong', { defaultValue: 'All selected students have no exam scores. Please add/import scores first, then try Promote again.' }));
      } else {
        toast.error(formatApiErrorToast(err));
      }
    } finally {
      setLoadingPromote(false);
    }
  };

  return (
    <div className="space-y-5">
      <PromotionsToolbar
        timing={timing}
        setTiming={setTiming}
        filters={filters}
        setFilters={setFilters}
        initialFilters={initialFilters}
        ayRefreshKey={ayRefreshKey}
        filtersReady={filtersReady}
        canPreview={canPreview}
        canPromote={canPromote}
        loadingPreview={loadingPreview}
        loadingPromote={loadingPromote}
        onPreview={handlePreview}
        onPromote={preview ? handlePromote : null}
        onReset={resetPage}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StudentsRosterTable
          filtersReady={filtersReady}
          students={students}
          studentsLoading={studentsLoading}
          studentsError={studentsError}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          formatCurrent={formatCurrent}
        />

        <PromotionPreviewPanel
          preview={preview}
          formatFrom={formatFrom}
          formatTo={formatTo}
        />
      </div>
    </div>
  );
}
