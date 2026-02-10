import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../../shared/components/ui/Modal.jsx';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import LoadingState from '../../../shared/components/ui/LoadingState.jsx';
import EmptyState from '../../../shared/components/ui/EmptyState.jsx';
import Alert from '../../../shared/components/ui/Alert.jsx';
import PdfDownloadButton from '../../../shared/components/exports/downloadButtons/PdfDownloadButton.jsx';
import ExcelDownloadButton from '../../../shared/components/exports/downloadButtons/ExcelDownloadButton.jsx';
import CsvDownloadButton from '../../../shared/components/exports/downloadButtons/CsvDownloadButton.jsx';
import CopyTableButton from '../../../shared/components/exports/downloadButtons/CopyTableButton.jsx';
import headerImg from '../../../assets/nuuruBayaanHeader.png';
import { useEntityList } from '../../../hooks/useEntityList';
import { fetchJson } from '../../../shared/api/http';
import toast from 'react-hot-toast';
import { useI18n } from '../../../i18n/I18nProvider';

export default function GradeSectionRosterModal({ isOpen, onClose, gradeSection }) {
  const { t } = useI18n();
  const sectionId = gradeSection?._id || '';
  const toastId = sectionId ? `roster-empty-${sectionId}` : 'roster-empty';

  const fetchFn = useCallback(async ({ page, limit, sortBy, sortDir, gradeSectionId }) => {
    if (!isOpen) {
      return { data: [], meta: { page: 1, limit: limit || 10, total: 0, totalPages: 1 } };
    }
    if (!gradeSectionId) {
      return { data: [], meta: { page: 1, limit: limit || 10, total: 0, totalPages: 1 } };
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const query = new URLSearchParams();
      if (sortBy) query.append('sort', `${sortBy}:${sortDir || 'asc'}`);
      query.append('page', String(page || 1));
      query.append('limit', String(limit || 10));
      query.append('gradeSectionId', String(gradeSectionId));
      query.append('enrollmentStatus', 'active');
      const res = await fetchJson(`/students?${query.toString()}`, { signal: controller.signal });
      return { data: res?.data || [], meta: res?.meta || {} };
    } catch (e) {
      if (e?.name === 'AbortError') {
        throw new Error(t('gradeSections.roster.errors.timeout', { defaultValue: 'Loading students timed out. Please try again.' }));
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }
  }, [isOpen, t]);

  const {
    items: students,
    meta,
    isLoading,
    error,
    setPage,
    setLimit,
    toggleSort,
  } = useEntityList({
    fetchFn,
    initialSortBy: 'fullName',
    initialSortDir: 'asc',
    initialLimit: 10,
    persistKey: 'grade-section-roster',
    extraFilters: { gradeSectionId: sectionId },
    debounceSearchMs: 0,
  });

  // Toast when the section has no active students (after a completed load)
  const prevLoadingRef = useRef(false);
  const loadedOnceRef = useRef(false);
  const lastSectionIdRef = useRef('');

  useEffect(() => {
    // When changing section or closing, reset state and dismiss any previous toast
    if (!isOpen || !sectionId || lastSectionIdRef.current !== sectionId) {
      loadedOnceRef.current = false;
      prevLoadingRef.current = false;
      lastSectionIdRef.current = sectionId;
      toast.dismiss(toastId);
    }
  }, [isOpen, sectionId, toastId]);

  useEffect(() => {
    if (!isOpen || !sectionId) return;

    // Track a completed load cycle (loading -> not loading)
    if (prevLoadingRef.current && !isLoading) {
      loadedOnceRef.current = true;
    }
    prevLoadingRef.current = Boolean(isLoading);

    if (!loadedOnceRef.current) return;
    if (error) return;

    const total = Number(meta?.total || 0);
    const hasStudents = Array.isArray(students) && students.length > 0;

    if (hasStudents) {
      toast.dismiss(toastId);
      return;
    }

    if (total === 0) {
      toast.error(t('gradeSections.roster.toasts.noActiveStudents', { defaultValue: 'No active students found for this Grade Section.' }), { id: toastId });
    }
  }, [isOpen, sectionId, isLoading, error, students, meta?.total, toastId, t]);

  const STORAGE_KEY = 'gradeSections:roster:columns:v1';
  const columns = useMemo(() => ([
    { key: 'studentId', label: t('gradeSections.roster.columns.studentId', { defaultValue: 'Student ID' }), sortable: true, field: 'studentId', thClassName: 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200' },
    { key: 'fullName', label: t('gradeSections.roster.columns.fullName', { defaultValue: 'Full Name' }), sortable: true, field: 'fullName', thClassName: 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700', tdClassName: 'px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200' },
    { key: 'gender', label: t('gradeSections.roster.columns.gender', { defaultValue: 'Gender' }), thClassName: 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-x border-gray-200' },
    { key: 'grade', label: t('common.filters.grade', { defaultValue: 'Grade' }), thClassName: 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200' },
    { key: 'section', label: t('common.filters.section', { defaultValue: 'Section' }), thClassName: 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-x border-gray-200' },
    { key: 'shift', label: t('common.filters.shift', { defaultValue: 'Shift' }), thClassName: 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-x border-gray-200' },
    { key: 'status', label: t('common.filters.status', { defaultValue: 'Status' }), thClassName: 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-x border-gray-200' },
  ]), [t]);

  const outlineBtn = 'bg-white! text-blue-700! border-blue-400! hover:bg-blue-50!';
  const canExport = Boolean(!isLoading && Array.isArray(students) && students.length > 0);

  const buildExportPayload = useCallback(async () => {
    if (!canExport) return null;

    let localVisible = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') localVisible = parsed;
      }
    } catch { /* ignore */ }

    const v = (key) => localVisible?.[String(key)] !== false;

    const cols = [
      { key: 'studentId', label: t('gradeSections.roster.columns.studentId', { defaultValue: 'Student ID' }), get: (r) => r.studentId || '' },
      { key: 'fullName', label: t('gradeSections.roster.columns.fullName', { defaultValue: 'Full Name' }), get: (r) => r.fullName || '' },
      { key: 'gender', label: t('gradeSections.roster.columns.gender', { defaultValue: 'Gender' }), get: (r) => r.gender || '' },
      { key: 'grade', label: t('common.filters.grade', { defaultValue: 'Grade' }), get: (r) => r.grade || '' },
      { key: 'section', label: t('common.filters.section', { defaultValue: 'Section' }), get: (r) => (r.section ? `${t('common.sectionPrefix', { defaultValue: 'Sec' })} ${r.section}` : '') },
      { key: 'shift', label: t('common.filters.shift', { defaultValue: 'Shift' }), get: (r) => r.shift || '' },
      { key: 'status', label: t('common.filters.status', { defaultValue: 'Status' }), get: (r) => r.status || '' },
    ].filter((c) => v(c.key));

    const headers = cols.map((c) => c.label);
    const rows = (students || []).map((r) => cols.map((c) => c.get(r)));

    const gradeName = gradeSection?.grade?.gradeName || gradeSection?.grade?.name || '';
    const shiftName = gradeSection?.shift?.shiftName || gradeSection?.shift?.name || '';
    const sectionNum = gradeSection?.section || '';

    const subtitle = [
      gradeName ? `${t('common.filters.grade', { defaultValue: 'Grade' })}: ${gradeName}` : null,
      sectionNum ? `${t('common.filters.section', { defaultValue: 'Section' })}: ${sectionNum}` : null,
      shiftName ? `${t('common.filters.shift', { defaultValue: 'Shift' })}: ${shiftName}` : null,
    ].filter(Boolean).join(' • ');

    return {
      filename: 'students-roster',
      sheetName: t('gradeSections.roster.export.sheetName', { defaultValue: 'Roster' }),
      title: t('gradeSections.roster.export.title', { defaultValue: 'Students Roster' }),
      subtitle,
      headerImageSrc: headerImg,
      headers,
      rows,
    };
  }, [canExport, students, gradeSection, t]);

  const title = useMemo(() => {
    const gradeName = gradeSection?.grade?.gradeName || gradeSection?.grade?.name || t('common.filters.grade', { defaultValue: 'Grade' });
    const shiftName = gradeSection?.shift?.shiftName || gradeSection?.shift?.name || '';
    const sectionNum = gradeSection?.section || '';
    const secPrefix = t('common.sectionPrefix', { defaultValue: 'Sec' });
    const tail = [shiftName ? `${t('common.filters.shift', { defaultValue: 'Shift' })} ${shiftName}` : null].filter(Boolean).join(' • ');
    return tail ? `${gradeName} • ${secPrefix} ${sectionNum} • ${tail}` : `${gradeName} • ${secPrefix} ${sectionNum}`;
  }, [gradeSection, t]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      panelClassName="max-w-6xl"
    >
      <div className="flex items-center justify-end gap-2 flex-nowrap overflow-x-auto no-print">
        <PdfDownloadButton getPayload={buildExportPayload} disabled={!canExport} className={outlineBtn} />
        <ExcelDownloadButton getPayload={buildExportPayload} disabled={!canExport} className={outlineBtn} />
        <CsvDownloadButton getPayload={buildExportPayload} disabled={!canExport} className={outlineBtn} />
        <CopyTableButton getPayload={buildExportPayload} disabled={!canExport} className={outlineBtn} />
      </div>

      <div className="mt-4 max-h-[70vh] overflow-auto">
        {error ? (
          <Alert variant="danger">{error}</Alert>
        ) : isLoading && students.length === 0 ? (
          <LoadingState variant="table" message={t('gradeSections.roster.loading', { defaultValue: 'Loading students...' })} rows={6} columns={7} />
        ) : students.length === 0 ? (
          <EmptyState title={t('gradeSections.roster.emptyTitle', { defaultValue: 'No students in this section' })} description={t('gradeSections.roster.emptyDescription', { defaultValue: 'No active students found for this grade section.' })} />
        ) : (
          <>
            <StandardTable
              isLoading={isLoading}
              error={error}
              items={students}
              rows={students}
              columns={columns}
              storageKey={STORAGE_KEY}
              sortBy={meta.sortBy}
              sortDir={meta.sortDir}
              onSort={toggleSort}
              controlsProps={{
                limit: meta.limit || 10,
                total: meta.total || 0,
                onLimit: (v) => { setLimit(v); setPage(1); },
                limits: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 'all'],
              }}
              meta={meta}
              onPage={(p) => setPage(p)}
              onLimit={(l) => setLimit(l)}
              showRowsSelector={false}
              paginationProps={{ infoVariant: 'range', className: 'no-print' }}
              tableProps={{
                theadClassName: 'bg-gray-800',
                useDefaultHeaderStyles: false,
                tbodyClassName: 'divide-y divide-gray-200',
                baseRowClassName: 'odd:bg-white even:bg-gray-50 hover:bg-gray-50 transition-colors',
              }}
              getRowKey={(st) => st?._id}
              renderCell={(st, col) => {
                if (col.key === 'studentId') return st?.studentId;
                if (col.key === 'fullName') return st?.fullName;
                if (col.key === 'gender') return st?.gender || '-';
                if (col.key === 'grade') return st?.grade || '-';
                if (col.key === 'section') return st?.section ? `${t('common.sectionPrefix', { defaultValue: 'Sec' })} ${st.section}` : '-';
                if (col.key === 'shift') return st?.shift || '-';
                if (col.key === 'status') return st?.status || '-';
                return '';
              }}
            />
          </>
        )}
      </div>
    </Modal>
  );
}
