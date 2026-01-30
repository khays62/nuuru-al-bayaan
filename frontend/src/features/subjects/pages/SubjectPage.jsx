import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import Modal from '../../../shared/components/ui/Modal.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import SubjectForm from '../components/SubjectForm';
import { toast } from 'react-hot-toast';

import { useAuth } from '../../../auth/AuthContext';

// Reusable infrastructure
import { useEntityList } from '../../../hooks/useEntityList';
import DataToolbar from '../../../shared/components/DataToolbar/DataToolbar.jsx';
import SearchInput from '../../../shared/components/DataToolbar/SearchInput.jsx';
import GradeSelect from '../../lookups/components/GradeSelect';
import SortControls from '../../../shared/components/DataToolbar/SortControls.jsx';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import { useClientSort } from '../../../shared/hooks/useClientSort';
import SubjectTable from '../components/SubjectTable.jsx';
import { on as onEvent, off as offEvent, EVENTS } from '../../../utils/events';

// API services (existing ones for now)
import { getSubjects, addSubject, updateSubject, deleteSubject } from '../api/subjects';
import { getGrades } from '../../lookups/api/lookups';

// NOTE: getSubjects(apiService) returns { data, meta }. We'll wrap it in fetchFn signature.

export default function SubjectPage() {
  const { auth, hasPermission } = useAuth();
  const isAdmin = String(auth?.user?.role || '').toLowerCase() === 'admin';
  const canAdd = isAdmin || hasPermission('subjects', 'add');
  const canEdit = isAdmin || hasPermission('subjects', 'edit');
  const canDelete = isAdmin || hasPermission('subjects', 'delete');

  // --- Additional State Not Covered by useEntityList ---
  const [grades, setGrades] = useState([]); // For filter + form
  const [gradeFilter, setGradeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- useEntityList Hook (Core List Management) ---
  const fetchSubjects = useCallback(async (params) => {
    const result = await getSubjects(params);
    return result; // { data, meta }
  }, []);

  const list = useEntityList({
    fetchFn: fetchSubjects,
    initialSortBy: 'createdAt',
    initialSortDir: 'desc',
    initialLimit: 10,
    persistKey: 'subjects',
    extraFilters: { grade: gradeFilter }
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
    silentRefresh,
    resetAndReload
  } = list;

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
    silentRefresh();
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
    // Refresh only this list; GradeForm will refresh on demand via its refresh button or when grade changes
    await silentRefresh();
    closeModal();
    toast.success(editingSubject ? 'Subject updated' : 'Subject created', { position: 'top-center' });
    setIsSubmitting(false);
  };

  // Live refresh: keep list in sync across browsers/tabs.
  useEffect(() => {
    const handler = () => silentRefresh();
    onEvent(EVENTS.SUBJECTS_CHANGED, handler);
    return () => offEvent(EVENTS.SUBJECTS_CHANGED, handler);
  }, [silentRefresh]);

  // --- Toolbar Slots ---
  const searchSlot = (
    <SearchInput
      value={searchTerm}
      onChange={(v) => setSearch(v)}
      placeholder="Search subjects by name or code..."
    />
  );

  const sortSlot = (
    <SortControls
      currentField={sortBy}
      currentDir={sortDir}
      onSort={onSort}
      fields={[
        { field: 'subjectName', label: 'Name' },
        { field: 'subjectCode', label: 'Code' },
        { field: 'createdAt', label: 'Created' }
      ]}
    />
  );

  // Button hadda waxa aan u raraynaa header-ka sare (title row) si ay uga ekaato Classes page

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Subject Management</h1>
          <p className="mt-1 text-sm text-gray-600">Manage all subjects and assign them to grades.</p>
        </div>
        <div className="sm:self-auto">
          {canAdd && (
            <Button variant="brand" size="lg" onClick={handleAddNew} icon={<Plus className="w-4 h-4" />}>
              Add New Subject
            </Button>
          )}
        </div>
      </div>

      <DataToolbar
        showReset={false}
        searchSlot={searchSlot}
        filtersSlot={
          <FilterRow>
            <FilterItem grow minWidthClass="min-w-35">
              <GradeSelect
                id="subjects-grade-filter"
                name="subjects-grade-filter"
                aria-label="Grade"
                value={gradeFilter}
                onChange={(v) => { setGradeFilter(v); setPage(1); }}
                placeholder="Grade"
              />
            </FilterItem>

            <FilterItem className="sm:ml-auto">
              <div className="flex items-center gap-2 flex-wrap">
                {sortSlot}
                <Button
                  type="button"
                  variant="neutral"
                  size="md"
                  onClick={() => { setGradeFilter(''); resetAndReload({ filters: {}, search: '' }); }}
                >
                  Reset
                </Button>
              </div>
            </FilterItem>
          </FilterRow>
        }
      />

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

