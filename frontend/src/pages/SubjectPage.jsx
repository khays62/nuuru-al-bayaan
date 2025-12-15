import React, { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import Modal from '../components/common/Modal';
import SubjectTable from '../components/subject/SubjectTable';
import SubjectForm from '../components/subject/SubjectForm';
import { toast } from 'react-hot-toast';

// Reusable infrastructure
import { useEntityList } from '../hooks/useEntityList';
import DataToolbar from '../components/common/DataToolbar/DataToolbar';
import SearchInput from '../components/common/DataToolbar/SearchInput';
// import FilterSelect from '../components/common/DataToolbar/FilterSelect';
import GradeSelect from '../components/lookups/GradeSelect';
import SortControls from '../components/common/DataToolbar/SortControls';
import PaginationControls from '../components/common/Pagination/PaginationControls';
import LoadingState from '../components/common/Feedback/LoadingState';
import EmptyState from '../components/common/Feedback/EmptyState';
import { useAuth } from "../contexts/AuthContext";

// API services (existing ones for now)
import { getSubjects, addSubject, getGrades, updateSubject, deleteSubject } from '../api';

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
    toggleSort,
    setPage,
    setLimit,
    refresh,
    resetAndReload
  } = list;

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

  const filtersSlot = (
    <GradeSelect
      id="subjects-grade-filter"
      name="subjects-grade-filter"
      aria-label="Grade"
      value={gradeFilter}
      onChange={(v) => { setGradeFilter(v); setPage(1); }}
      className="min-w-32"
      placeholder="Grade"
    />
  );

  const sortSlot = (
    <SortControls
      currentField={meta.sortBy}
      currentDir={meta.sortDir}
      onSort={toggleSort}
      fields={[
        { field: 'subjectName', label: 'Name' },
        { field: 'subjectCode', label: 'Code' },
        { field: 'createdAt', label: 'Created' }
      ]}
    />
  );

  const { auth, hasPermission } = useAuth();

  const canViewSubject = hasPermission("subjects","view")
  // Button hadda waxa aan u raraynaa header-ka sare (title row) si ay uga ekaato Classes page

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Subject Management</h1>
          <p className="mt-1 text-sm text-gray-600">Manage all subjects and assign them to grades.</p>
        </div>
        <div className="sm:self-auto">
          {/* <button
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Add New Subject
          </button> */}
          <button
  onClick={handleAddNew}
  disabled={!hasPermission("subjects", "add")}
  className={`flex items-center justify-center w-full sm:w-auto px-4 py-2 rounded-lg shadow-sm
    ${hasPermission("subjects", "add")
      ? "bg-blue-600 hover:bg-blue-700 text-white"
      : "bg-gray-300 text-gray-500 cursor-not-allowed"}
  `}
>
  <Plus size={20} className="mr-2" />
  Add New Subject
</button>
        </div>
      </div>

      {/* {canViewSubject && (

      <DataToolbar
        showReset={false}
        searchSlot={searchSlot}
        filtersSlot={<div className="flex flex-row flex-wrap gap-2 w-full items-center">
          <GradeSelect
            id="subjects-grade-filter"
            name="subjects-grade-filter"
            aria-label="Grade"
            value={gradeFilter}
            onChange={(v) => { setGradeFilter(v); setPage(1); }}
            className="flex-1 min-w-[140px]"
            placeholder="Grade"
          />
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {sortSlot}
            <button
              type="button"
              onClick={() => { setGradeFilter(''); resetAndReload({ filters: {}, search: '' }); }}
              className="px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md border text-sm"
            >Reset</button>
          </div>
        </div>}
      />

      {isLoading ? (
        <LoadingState variant="table" message="Loading subjects..." rows={6} columns={5} />
      ) : error ? (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded">
          {error} <button onClick={refresh} className="underline ml-2">Retry</button>
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState
          title="No subjects found"
          description="Try adjusting search or add a new subject."
          actionLabel="Add Subject"
          onAction={handleAddNew}
        />
      ) : (
        <>
    


      

          <><div className="flex justify-between items-center mb-2 text-sm text-gray-600">
                    <div>
                      Page {meta.page} of {meta.totalPages} — {meta.total} total
                    </div>
                  </div><SubjectTable
                      subjects={subjects}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      canEdit={hasPermission("subject", "edit")}
                      canDelete={hasPermission("subject", "delete")} /><PaginationControls
                      page={meta.page}
                      totalPages={meta.totalPages}
                      limit={meta.limit}
                      onPage={(p) => setPage(p)}
                      onLimit={(l) => setLimit(l)} /></>

          )}
        </>
      )} */}

{canViewSubject && (
  <>
    <DataToolbar
      showReset={false}
      searchSlot={searchSlot}
      filtersSlot={
        <div className="flex flex-row flex-wrap gap-2 w-full items-center">
          <GradeSelect
            id="subjects-grade-filter"
            name="subjects-grade-filter"
            aria-label="Grade"
            value={gradeFilter}
            onChange={(v) => {
              setGradeFilter(v);
              setPage(1);
            }}
            className="flex-1 min-w-[140px]"
            placeholder="Grade"
          />
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {sortSlot}
            <button
              type="button"
              onClick={() => {
                setGradeFilter('');
                resetAndReload({ filters: {}, search: '' });
              }}
              className="px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md border text-sm"
            >
              Reset
            </button>
          </div>
        </div>
      }
    />

    {isLoading ? (
      <LoadingState variant="table" message="Loading subjects..." rows={6} columns={5} />
    ) : error ? (
      <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded">
        {error}{' '}
        <button onClick={refresh} className="underline ml-2">
          Retry
        </button>
      </div>
    ) : subjects.length === 0 ? (
      <EmptyState
        title="No subjects found"
        description="Try adjusting search or add a new subject."
        actionLabel="Add Subject"
        onAction={handleAddNew}
      />
    ) : (
      <>
        <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
          <div>
            Page {meta.page} of {meta.totalPages} — {meta.total} total
          </div>
        </div>

        <SubjectTable
          subjects={subjects}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canEdit={hasPermission('subject', 'edit')}
          canDelete={hasPermission('subject', 'delete')}
        />

        <PaginationControls
          page={meta.page}
          totalPages={meta.totalPages}
          limit={meta.limit}
          onPage={(p) => setPage(p)}
          onLimit={(l) => setLimit(l)}
        />
      </>
    )}
  </>
)}


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

