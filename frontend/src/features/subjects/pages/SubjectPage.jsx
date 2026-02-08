import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus, Printer, RotateCcw } from 'lucide-react';
import Modal from '../../../shared/components/ui/Modal.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Card from '../../../shared/components/ui/Card.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import SubjectForm from '../components/SubjectForm';
import { toast } from 'react-hot-toast';

import { useAuth } from '../../../auth/AuthContext';

// Reusable infrastructure
import { useEntityList } from '../../../hooks/useEntityList';
import SearchInput from '../../../shared/components/DataToolbar/SearchInput.jsx';
import GradeSelect from '../../lookups/components/GradeSelect';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import { useClientSort } from '../../../shared/hooks/useClientSort';
import SubjectTable from '../components/SubjectTable.jsx';
import PdfDownloadButton from '../../../shared/components/exports/downloadButtons/PdfDownloadButton.jsx';
import ExcelDownloadButton from '../../../shared/components/exports/downloadButtons/ExcelDownloadButton.jsx';
import CsvDownloadButton from '../../../shared/components/exports/downloadButtons/CsvDownloadButton.jsx';
import CopyTableButton from '../../../shared/components/exports/downloadButtons/CopyTableButton.jsx';
import PrintHeader from '../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../shared/components/print/PrintFooter.jsx';
import headerImg from '../../../assets/nuuruBayaanHeader.png';

// API services (existing ones for now)
import { getSubjects, addSubject, updateSubject, deleteSubject } from '../api/subjects';
import { getGrades } from '../../lookups/api/lookups';
import { subjectKeys } from '../queryKeys';
import { useSubjectsRealtimeInvalidation } from '../useSubjectsRealtimeInvalidation';

// NOTE: getSubjects(apiService) returns { data, meta }. We'll wrap it in fetchFn signature.

export default function SubjectPage() {
  const { auth, hasPermission } = useAuth();
  const isAdmin = String(auth?.user?.role || '').toLowerCase() === 'admin';
  const canAdd = isAdmin || hasPermission('subjects', 'add');
  const canEdit = isAdmin || hasPermission('subjects', 'edit');
  const canDelete = isAdmin || hasPermission('subjects', 'delete');
  const canView = isAdmin || hasPermission('subjects', 'view');

  // --- Additional State Not Covered by useEntityList ---
  const [grades, setGrades] = useState([]); // For filter + form
  const [gradeFilter, setGradeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- useEntityList Hook (Core List Management) ---
  const fetchSubjects = useCallback(async (params, options = {}) => {
    const result = await getSubjects(params, { signal: options?.signal });
    return result; // { data, meta }
  }, []);

  const list = useEntityList({
    fetchFn: fetchSubjects,
    initialSortBy: 'createdAt',
    initialSortDir: 'desc',
    initialLimit: 10,
    persistKey: 'subjects',
    extraFilters: { grade: gradeFilter },
    queryKeyBase: subjectKeys.listBase,
  });

  // Extract for convenience
  const {
    items: subjects,
    meta,
    isLoading,
    error,
    searchTerm,
    setSearch,
    setPage,
    setLimit,
    refresh,
    resetAndReload
  } = list;

  useSubjectsRealtimeInvalidation({ enabled: true });

  const {
    sortBy,
    sortDir,
    onSort,
    sortedRows: sortedSubjectsForView,
  } = useClientSort(subjects, {
    initialSortBy: 'createdAt',
    initialSortDir: 'desc',
    getValue: (s, field) => {
      switch (field) {
        case 'subjectName':
          return String(s?.subjectName || '').toLowerCase();
        case 'subjectCode':
          return String(s?.subjectCode || '').toLowerCase();
        case 'createdAt':
        default:
          return new Date(s?.createdAt || 0).getTime();
      }
    },
  });

  // columns live in SubjectTable (feature component)

  // --- Load Grades (lookup) ---
  useEffect(() => {
    (async () => {
      try {
        const gradeList = await getGrades();
        setGrades(gradeList);
      } catch {
        toast.error('Failed to load grades');
      }
    })();
  }, []);

  // --- CRUD Handlers ---
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSubject(null);
  };

  const handleAddNew = () => {
    if (!canAdd) {
      toast.error('You do not have permission to add subjects');
      return;
    }
    setEditingSubject(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleEdit = (subject) => {
    if (!canEdit) {
      toast.error('You do not have permission to edit subjects');
      return;
    }
    setEditingSubject(subject);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (subjectId) => {
    if (!canDelete) {
      toast.error('You do not have permission to delete subjects');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    const result = await deleteSubject(subjectId);
    if (result.error) {
      if (result.details?.inUse) {
        toast.error(`Cannot delete: subject used in ${result.details.usageCount} class(es).`, { position: 'top-center' });
      } else {
        toast.error(result.error, { position: 'top-center' });
      }
      return;
    }
    toast.success('Subject deleted', { position: 'top-center' });
  };

  const handleFormSubmit = async (formData) => {
    if (editingSubject) {
      if (!canEdit) {
        toast.error('You do not have permission to edit subjects');
        return;
      }
    } else {
      if (!canAdd) {
        toast.error('You do not have permission to add subjects');
        return;
      }
    }
    setFormError(null);
    setIsSubmitting(true);
    let result;
    if (editingSubject) {
      result = await updateSubject(editingSubject._id, formData);
    } else {
      result = await addSubject(formData);
    }
    if (result.error) {
      if (result.field === 'subjectCode') {
        setFormError('Subject code already exists. Please choose another.');
      } else {
        setFormError(result.error);
      }
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }
    // EDCI: realtime invalidation will refresh the list across browsers/tabs.
    closeModal();
    toast.success(editingSubject ? 'Subject updated' : 'Subject created', { position: 'top-center' });
    setIsSubmitting(false);
  };

  // --- Toolbar Slots ---
  const searchSlot = (
    <SearchInput
      value={searchTerm}
      onChange={(v) => setSearch(v)}
      placeholder="Search subjects by name or code..."
    />
  );

  const outlineBtn = '!bg-white !text-blue-700 !border-blue-400 hover:!bg-blue-50';
  const isPageLoading = Boolean(isLoading);
  const canExport = Boolean(canView && !isPageLoading && Array.isArray(sortedSubjectsForView) && sortedSubjectsForView.length > 0);

  const handlePrint = () => {
    if (!canView) {
      toast.error('You do not have permission to export/print subjects');
      return;
    }
    setTimeout(() => window.print(), 0);
  };

  const buildExportPayload = async () => {
    if (!canExport) return null;
    const STORAGE_KEY = 'subjects:columns:v1';
    let visible = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') visible = parsed;
      }
    } catch { /* ignore */ }
    const isVisible = (key) => visible?.[String(key)] !== false;

    const cols = [
      isVisible('subjectName') ? { key: 'subjectName', label: 'Subject Name' } : null,
      isVisible('subjectCode') ? { key: 'subjectCode', label: 'Subject Code' } : null,
      isVisible('grades') ? { key: 'grades', label: 'Associated Grades' } : null,
    ].filter(Boolean);

    const headers = cols.map((c) => c.label);
    const rows = (sortedSubjectsForView || []).map((s) => cols.map((col) => {
      switch (col.key) {
        case 'subjectName':
          return s?.subjectName || '';
        case 'subjectCode':
          return s?.subjectCode || '';
        case 'grades':
          return Array.isArray(s?.grades)
            ? s.grades.map((g) => g?.gradeName || g?.name || '').filter(Boolean).join(', ')
            : '';
        default:
          return '';
      }
    }));

    return {
      filename: 'subjects',
      title: 'Subjects',
      subtitle: `Total: ${sortedSubjectsForView.length} • Generated: ${new Date().toLocaleString()}`,
      headerImageSrc: headerImg,
      headers,
      rows,
    };
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 no-print">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full lg:max-w-lg">
              {searchSlot}
            </div>
            <div className="w-full lg:max-w-2xl">
              <FilterRow align="end">
                <FilterItem grow minWidthClass="min-w-35">
                  <GradeSelect
                    id="subjects-grade-filter"
                    name="subjects-grade-filter"
                    aria-label="Grade"
                    value={gradeFilter}
                    onChange={(v) => {
                      setGradeFilter(v);
                      setPage(1);
                    }}
                    placeholder="Grade"
                  />
                </FilterItem>
              </FilterRow>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-auto">
              {canAdd ? (
                <Button
                  variant="brand"
                  size="lg"
                  className="w-full sm:w-auto justify-center"
                  onClick={handleAddNew}
                  icon={<Plus size={20} />}
                >
                  Add New Subject
                </Button>
              ) : null}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <ActionButton
                variant="neutral"
                className={outlineBtn}
                icon={<Printer size={16} />}
                disabled={!canExport}
                onClick={handlePrint}
                title="Print"
              >
                Print
              </ActionButton>
              <PdfDownloadButton getPayload={buildExportPayload} disabled={!canExport} className={outlineBtn} />
              <ExcelDownloadButton getPayload={buildExportPayload} disabled={!canExport} className={outlineBtn} />
              <CsvDownloadButton getPayload={buildExportPayload} disabled={!canExport} className={outlineBtn} />
              <CopyTableButton getPayload={buildExportPayload} disabled={!canExport} className={outlineBtn} />
              <ActionButton
                variant="neutral"
                className={outlineBtn}
                icon={<RotateCcw size={16} />}
                onClick={() => {
                  setGradeFilter('');
                  resetAndReload({ filters: {}, search: '' });
                }}
              >
                Reset
              </ActionButton>
            </div>
          </div>
        </div>
      </Card>

      <div className="with-print-header with-print-footer">
        <PrintHeader />

      <SubjectTable
        items={subjects}
        rows={sortedSubjectsForView}
        isLoading={isLoading}
        error={error}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        meta={meta}
        onPage={(p) => setPage(p)}
        onLimit={(l) => setLimit(l)}
        onAdd={handleAddNew}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

        <PrintFooter />
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingSubject ? 'Edit Subject' : 'Add New Subject'}>
        {formError && <div className="mb-3 text-red-600 text-sm">{formError}</div>}
        <SubjectForm
          subject={editingSubject}
          onClose={closeModal}
          onSubmit={handleFormSubmit}
          allGrades={grades}
          isSubmitting={isSubmitting}
          onDirty={() => formError && setFormError(null)}
        />
      </Modal>
    </div>
  );
}

