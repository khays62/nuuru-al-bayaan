import React, { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '../components/common/Modal';
import GradeTable from '../components/grade/GradeTable';
import GradeForm from '../components/grade/GradeForm';
import { useEntityList } from '../hooks/useEntityList';
import DataToolbar from '../components/common/DataToolbar/DataToolbar';
import SearchInput from '../components/common/DataToolbar/SearchInput';
import FilterSelect from '../components/common/DataToolbar/FilterSelect';
import SortControls from '../components/common/DataToolbar/SortControls';
import PaginationControls from '../components/common/Pagination/PaginationControls';
import LoadingState from '../components/common/Feedback/LoadingState';
import EmptyState from '../components/common/Feedback/EmptyState';
import { listGradeSections, deleteGradeSection, getGrades, getAcademicYears, getShifts } from '../api/apiService';

export default function GradePage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [grades, setGrades] = useState([]);
    const [years, setYears] = useState([]);
    const [shifts, setShifts] = useState([]);
    // Local, controlled filters (mirrors StudentPage pattern for stability)
    const [gradeFilter, setGradeFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [shiftFilter, setShiftFilter] = useState('');
    const [sectionFilter, setSectionFilter] = useState('');

    const fetchGrades = useCallback(async (params) => {
        const result = await listGradeSections({
            page: params.page,
            limit: params.limit,
            search: params.search,
            grade: params.grade,
            academicYear: params.academicYear,
            shift: params.shift,
            section: params.section,
            sortBy: params.sortBy,
            sortDir: params.sortDir
        });
        return result;
    }, []);

    const list = useEntityList({
        fetchFn: fetchGrades,
        initialSortBy: 'createdAt',
        initialSortDir: 'desc',
        initialLimit: 10,
        persistKey: 'grades-page',
        extraFilters: { grade: gradeFilter, academicYear: yearFilter, shift: shiftFilter, section: sectionFilter }
    });

    const {
        items: classes,
        meta,
        isLoading,
        error,
        searchTerm,
        setSearch,
        setFilter,
        toggleSort,
        setPage,
        setLimit,
        refresh
    } = list;

    // lookups
    useEffect(() => {
        (async () => {
            try {
                const [g, y, s] = await Promise.all([
                    getGrades(),
                    getAcademicYears(),
                    getShifts()
                ]);
                setGrades(g || []);
                setYears(y || []);
                setShifts(s || []);
            } catch (e) {
                toast.error('Failed to load lookups');
            }
        })();
    }, []);

    // CRUD handlers (still using class endpoints under the hood)
    const handleAddNew = () => { setEditingClass(null); setIsModalOpen(true); };
    const handleEdit = (cls) => { setEditingClass(cls); setIsModalOpen(true); };
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this section for the selected grade/year/shift?')) return;
        const res = await deleteGradeSection(id);
        if (res && res.ok) {
            toast.success('Deleted successfully');
            refresh();
        } else {
            toast.error(res?.error || 'Failed to delete');
        }
    };
    const closeModal = () => { setIsModalOpen(false); setEditingClass(null); };

    // Toolbar slots
    const searchSlot = (
        <SearchInput
            value={searchTerm}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by grade name..."
        />
    );
    const filtersSlot = (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <FilterSelect
                value={gradeFilter}
                onChange={(v) => { setGradeFilter(v); setPage(1); }}
                options={grades.map(g => ({ value: g._id, label: g.gradeName }))}
                placeholder="Grade"
            />
            <FilterSelect
                value={yearFilter}
                onChange={(v) => { setYearFilter(v); setPage(1); }}
                options={years.map(y => ({ value: y._id, label: y.yearName }))}
                placeholder="Academic Year"
            />
            <FilterSelect
                value={shiftFilter}
                onChange={(v) => { setShiftFilter(v); setPage(1); }}
                options={shifts.map(s => ({ value: s._id, label: s.shiftName }))}
                placeholder="Shift"
            />
            <input
                type="text"
                value={sectionFilter}
                onChange={(e) => { setSectionFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 border rounded-md"
                placeholder="Filter by Section (e.g. 1, A)"
            />
        </div>
    );
    const sortSlot = (
        <SortControls
            currentField={meta.sortBy}
            currentDir={meta.sortDir}
            onSort={toggleSort}
            fields={[ { field: 'createdAt', label: 'Created' } ]}
        />
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Grade Management</h1>
                    <p className="mt-1 text-sm text-gray-600">Manage grade sections by academic year and shift. Subjects are linked to grades.</p>
                </div>
                <div>
                    <button
                        onClick={handleAddNew}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Grade Section
                    </button>
                </div>
            </div>

            <DataToolbar
                searchSlot={searchSlot}
                filtersSlot={filtersSlot}
                sortSlot={sortSlot}
            />

            {isLoading ? (
                <LoadingState variant="table" message="Loading..." rows={6} columns={5} />
            ) : error ? (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded">
                    {error} <button onClick={refresh} className="underline ml-2">Retry</button>
                </div>
            ) : classes.length === 0 ? (
                <EmptyState
                    title="No grade sections found"
                    description="Try adjusting filters or create a new one."
                    actionLabel="Add"
                    onAction={handleAddNew}
                />
            ) : (
                <>
                    <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
                        <div>
                            Page {meta.page} of {meta.totalPages || meta.pages || 1} — {meta.total} total
                        </div>
                    </div>
                    <GradeTable classes={classes} onEdit={handleEdit} onDelete={handleDelete} />
                    <PaginationControls
                        page={meta.page}
                        totalPages={meta.totalPages || meta.pages || 1}
                        limit={meta.limit}
                        onPage={(p) => setPage(p)}
                        onLimit={(l) => setLimit(l)}
                    />
                </>
            )}

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingClass ? 'Edit Grade Section' : 'Add Grade Section'}>
                <GradeForm cls={editingClass} onClose={closeModal} onSuccess={() => refresh()} />
            </Modal>
        </div>
    );
}
