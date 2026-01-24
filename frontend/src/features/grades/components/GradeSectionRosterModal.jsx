import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../../../shared/components/ui/Modal.jsx';
import TableShell from '../../../shared/components/table/TableShell.jsx';
import SortableTh from '../../../shared/components/table/SortableTh.jsx';
import StickyTableControls from '../../../shared/components/table/StickyTableControls.jsx';
import PaginationControls from '../../../shared/components/Pagination/PaginationControls.jsx';
import LoadingState from '../../../shared/components/feedback/LoadingState.jsx';
import EmptyState from '../../../shared/components/feedback/EmptyState.jsx';
import PdfDownloadButton from '../../../shared/components/exports/downloadButtons/PdfDownloadButton.jsx';
import ExcelDownloadButton from '../../../shared/components/exports/downloadButtons/ExcelDownloadButton.jsx';
import CsvDownloadButton from '../../../shared/components/exports/downloadButtons/CsvDownloadButton.jsx';
import CopyTableButton from '../../../shared/components/exports/downloadButtons/CopyTableButton.jsx';
import headerImg from '../../../assets/nuuruBayaanHeader.png';
import { useEntityList } from '../../../hooks/useEntityList';
import { fetchJson } from '../../../shared/api/http';
import toast from 'react-hot-toast';

export default function GradeSectionRosterModal({ isOpen, onClose, gradeSection }) {
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
    const t = setTimeout(() => controller.abort(), 12000);
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
        throw new Error('Loading students timed out. Please try again.');
      }
      throw e;
    } finally {
      clearTimeout(t);
    }
  }, [isOpen]);

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
      toast.error('No active students found for this Grade Section.', { id: toastId });
    }
  }, [isOpen, sectionId, isLoading, error, students, meta?.total, toastId]);

  const STORAGE_KEY = 'gradeSections:roster:columns:v1';
  const columns = useMemo(() => ([
    { key: 'studentId', label: 'Student ID', sortable: true, field: 'studentId' },
    { key: 'fullName', label: 'Full Name', sortable: true, field: 'fullName' },
    { key: 'gender', label: 'Gender' },
    { key: 'grade', label: 'Grade' },
    { key: 'section', label: 'Section' },
    { key: 'shift', label: 'Shift' },
    { key: 'status', label: 'Status' },
  ]), []);

  const [visible, setVisible] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(visible || {})); } catch { /* ignore */ }
  }, [visible]);

  const isVisible = (key) => visible?.[String(key)] !== false;
  const toggle = (key) => setVisible((prev) => {
    const next = { ...(prev || {}) };
    const k = String(key);
    next[k] = !(prev?.[k] !== false);
    return next;
  });

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
      { key: 'studentId', label: 'Student ID', get: (r) => r.studentId || '' },
      { key: 'fullName', label: 'Full Name', get: (r) => r.fullName || '' },
      { key: 'gender', label: 'Gender', get: (r) => r.gender || '' },
      { key: 'grade', label: 'Grade', get: (r) => r.grade || '' },
      { key: 'section', label: 'Section', get: (r) => (r.section ? `Sec ${r.section}` : '') },
      { key: 'shift', label: 'Shift', get: (r) => r.shift || '' },
      { key: 'status', label: 'Status', get: (r) => r.status || '' },
    ].filter((c) => v(c.key));

    const headers = cols.map((c) => c.label);
    const rows = (students || []).map((r) => cols.map((c) => c.get(r)));

    const gradeName = gradeSection?.grade?.gradeName || gradeSection?.grade?.name || '';
    const shiftName = gradeSection?.shift?.shiftName || gradeSection?.shift?.name || '';
    const sectionNum = gradeSection?.section || '';

    const subtitle = [
      gradeName ? `Grade: ${gradeName}` : null,
      sectionNum ? `Section: ${sectionNum}` : null,
      shiftName ? `Shift: ${shiftName}` : null,
    ].filter(Boolean).join(' • ');

    return {
      filename: 'students-roster',
      sheetName: 'Roster',
      title: 'Students Roster',
      subtitle,
      headerImageSrc: headerImg,
      headers,
      rows,
    };
  }, [canExport, students, gradeSection]);

  const title = useMemo(() => {
    const gradeName = gradeSection?.grade?.gradeName || gradeSection?.grade?.name || 'Grade';
    const shiftName = gradeSection?.shift?.shiftName || gradeSection?.shift?.name || '';
    const sectionNum = gradeSection?.section || '';
    const tail = [shiftName ? `Shift ${shiftName}` : null].filter(Boolean).join(' • ');
    return tail ? `${gradeName} • Sec ${sectionNum} • ${tail}` : `${gradeName} • Sec ${sectionNum}`;
  }, [gradeSection]);

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
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded">
            {error}
          </div>
        ) : isLoading && students.length === 0 ? (
          <LoadingState variant="table" message="Loading students..." rows={6} columns={7} />
        ) : students.length === 0 ? (
          <EmptyState title="No students in this section" description="No active students found for this grade section." />
        ) : (
          <>
            <StickyTableControls
              columns={columns}
              visible={visible}
              onToggle={toggle}
              limit={meta.limit || 10}
              total={meta.total || 0}
              onLimit={(v) => { setLimit(v); setPage(1); }}
              limits={[10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 'all']}
            />

            <TableShell>
              <thead className="bg-gray-800">
                <tr>
                  {isVisible('studentId') && (
                    <SortableTh label="Student ID" field="studentId" sortBy={meta.sortBy} sortDir={meta.sortDir} onSort={toggleSort} />
                  )}
                  {isVisible('fullName') && (
                    <SortableTh label="Full Name" field="fullName" sortBy={meta.sortBy} sortDir={meta.sortDir} onSort={toggleSort} />
                  )}
                  {isVisible('gender') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Gender</th>
                  )}
                  {isVisible('grade') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Grade</th>
                  )}
                  {isVisible('section') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Section</th>
                  )}
                  {isVisible('shift') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Shift</th>
                  )}
                  {isVisible('status') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Status</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.map((st) => (
                  <tr key={st._id} className="odd:bg-white even:bg-gray-50 hover:bg-gray-50 transition-colors">
                    {isVisible('studentId') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">{st.studentId}</td>
                    )}
                    {isVisible('fullName') && (
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200">{st.fullName}</td>
                    )}
                    {isVisible('gender') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-x border-gray-200">{st.gender || '-'}</td>
                    )}
                    {isVisible('grade') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200">{st.grade || '-'}</td>
                    )}
                    {isVisible('section') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-x border-gray-200">{st.section ? `Sec ${st.section}` : '-'}</td>
                    )}
                    {isVisible('shift') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-x border-gray-200">{st.shift || '-'}</td>
                    )}
                    {isVisible('status') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-x border-gray-200">{st.status || '-'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </TableShell>

            <PaginationControls
              className="no-print"
              page={meta.page}
              totalPages={meta.totalPages || meta.pages || 1}
              limit={meta.limit}
              total={meta.total || 0}
              onPage={(p) => setPage(p)}
              onLimit={(l) => setLimit(l)}
              showRowsSelector={false}
              infoVariant="range"
            />
          </>
        )}
      </div>
    </Modal>
  );
}
