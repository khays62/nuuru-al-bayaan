import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Modal from '../../../shared/components/ui/Modal.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import SubjectForm from '../components/SubjectForm';
import { toast } from 'react-hot-toast';

// Reusable infrastructure
import { useEntityList } from '../../../hooks/useEntityList';
import DataToolbar from '../../../shared/components/DataToolbar/DataToolbar.jsx';
import SearchInput from '../../../shared/components/DataToolbar/SearchInput.jsx';
import GradeSelect from '../../lookups/components/GradeSelect';
import SortControls from '../../../shared/components/DataToolbar/SortControls.jsx';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import { useClientSort } from '../../../shared/hooks/useClientSort';

// API services (existing ones for now)
import { getSubjects, addSubject, updateSubject, deleteSubject } from '../api/subjects';
import { getGrades } from '../../lookups/api/lookups';

// NOTE: getSubjects(apiService) returns { data, meta }. We'll wrap it in fetchFn signature.

export default function SubjectPage() {
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

  const columns = useMemo(() => ([
    {
      key: 'subjectName',
      label: 'Subject Name',
      sortable: true,
      field: 'subjectName',
      tdClassName: 'px-6 py-4 whitespace-nowrap font-medium text-gray-900 border-x border-gray-200',
    },
    {
      key: 'subjectCode',
      label: 'Subject Code',
      sortable: true,
      field: 'subjectCode',
      tdClassName: 'px-6 py-4 whitespace-nowrap text-gray-600 border-x border-gray-200',
    },
    {
      key: 'grades',
      label: 'Associated Grades',
      tdClassName: 'px-6 py-4 text-gray-600 border-x border-gray-200',
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      noPrint: true,
      locked: false,
      tdClassName: 'px-6 py-4 whitespace-nowrap text-right font-medium space-x-2 border-x border-gray-200',
    },
  ]), []);

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
    setEditingSubject(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleEdit = (subject) => {
    setEditingSubject(subject);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (subjectId) => {
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
    refresh();
    toast.success('Subject deleted', { position: 'top-center' });
  };

  const handleFormSubmit = async (formData) => {
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
    await refresh();
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
          <Button variant="brand" size="lg" onClick={handleAddNew} icon={<Plus className="w-4 h-4" />}>
            Add New Subject
          </Button>
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

      <StandardTable
        isLoading={isLoading}
        error={error}
        items={subjects}
        loadingVariant="table"
        loadingMessage="Loading subjects..."
        loadingRows={6}
        loadingColumns={5}
        emptyTitle="No subjects found"
        emptyDescription="Try adjusting search or add a new subject."
        emptyActionLabel="Add Subject"
        onEmptyAction={handleAddNew}
        onRetry={refresh}
        topSlot={
          <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
            <div>
              Page {meta.page} of {meta.totalPages} — {meta.total} total
            </div>
          </div>
        }
        rows={sortedSubjectsForView}
        columns={columns}
        storageKey="subjects:columns:v1"
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        controlsProps={{
          limit: meta.limit || 10,
          total: meta.total || 0,
          onLimit: (l) => { setLimit(l); setPage(1); },
          limits: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 'all'],
        }}
        getRowKey={(s) => s._id}
        renderCell={(subject, col) => {
          switch (col.key) {
            case 'subjectName':
              return subject.subjectName;
            case 'subjectCode':
              return subject.subjectCode;
            case 'grades':
              return (
                <div className="flex flex-wrap gap-1 max-w-xs">
                  {(subject.grades || []).map((grade) => (
                    <span key={grade._id} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-md">
                      {grade.gradeName}
                    </span>
                  ))}
                </div>
              );
            case 'actions':
              return (
                <>
                  <button
                    onClick={() => handleEdit(subject)}
                    className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-100 transition-colors"
                    title="Edit Subject"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(subject._id)}
                    className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 transition-colors"
                    title="Delete Subject"
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              );
            default:
              return '';
          }
        }}
        meta={meta}
        onPage={(p) => setPage(p)}
        onLimit={(l) => setLimit(l)}
        showRowsSelector={false}
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

