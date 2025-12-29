import React, { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '../components/common/Modal';
import GradeTable from '../components/grade/GradeTable';
import GradeForm from '../components/grade/GradeForm';
import { useEntityList } from '../hooks/useEntityList';
import DataToolbar from '../components/common/DataToolbar/DataToolbar';
import SearchInput from '../components/common/DataToolbar/SearchInput';
import SortControls from '../components/common/DataToolbar/SortControls';
import PaginationControls from '../components/common/Pagination/PaginationControls';
import LoadingState from '../components/common/Feedback/LoadingState';
import EmptyState from '../components/common/Feedback/EmptyState';
import { listGradeSections, deleteGradeSection } from '../api';
// Reusable lookup selects (replace ad-hoc FilterSelects)
import GradeSelect from '../components/lookups/GradeSelect';
import ShiftSelect from '../components/lookups/ShiftSelect';
// AY and Cohort filters removed (GS is AY-agnostic)
import { useAuth } from '../contexts/AuthContext';

export default function GradePage() {
		const { hasPermission } = useAuth();
		const canAddGrade = hasPermission('grades', 'add');
		const canEditGrade = hasPermission('grades', 'edit');
		const canDeleteGrade = hasPermission('grades', 'delete');

		const [isModalOpen, setIsModalOpen] = useState(false);
		const [editingClass, setEditingClass] = useState(null);
		// Local, controlled filters (mirrors StudentPage pattern for stability)
		const [gradeFilter, setGradeFilter] = useState('');
		const [shiftFilter, setShiftFilter] = useState('');
	const [sectionFilter, setSectionFilter] = useState('');


		const fetchGrades = useCallback(async (params) => {
				const result = await listGradeSections({
						page: params.page,
						limit: params.limit,
						search: params.search,
						grade: params.grade,
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
		extraFilters: { grade: gradeFilter, shift: shiftFilter, section: sectionFilter }
		});

		const {
				items: classes,
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

		// CRUD handlers
		const handleAddNew = () => { if (!canAddGrade) return; setEditingClass(null); setIsModalOpen(true); };
		const handleEdit = (cls) => { if (!canEditGrade) return; setEditingClass(cls); setIsModalOpen(true); };
		const handleDelete = async (id) => {
				if (!canDeleteGrade) return;
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

		// Apply filters in a coalesced way to avoid multiple fetches
		const applyFilters = (patch) => {
			if (patch.grade !== undefined) setGradeFilter(patch.grade);
			if (patch.shift !== undefined) setShiftFilter(patch.shift);
			if (patch.section !== undefined) setSectionFilter(patch.section);
			// Single page reset; hook will coalesce identical signatures
			setPage(1);
		};

		// Toolbar slots
		const searchSlot = (
		<SearchInput
			value={searchTerm}
			onChange={(v) => { setSearch(v); /* setPage(1) handled by hook when search changes */ }}
			placeholder="Search by grade name..."
		/>
		);
		const filtersSlot = (
			<div className="flex flex-col sm:flex-row gap-3">
				<GradeSelect
					id="grades-grade-filter"
					name="grades-grade-filter"
					aria-label="Grade"
					value={gradeFilter}
					onChange={(v) => applyFilters({ grade: v })}
					className="min-w-32"
					placeholder="Grade"
				/>
				<ShiftSelect
					id="grades-shift-filter"
					name="grades-shift-filter"
					aria-label="Shift"
					value={shiftFilter}
					onChange={(v) => applyFilters({ shift: v })}
					className="min-w-32"
					placeholder="Shift"
				/>
				<input
					id="grades-section-filter"
					name="grades-section-filter"
					aria-label="Section"
					type="text"
					value={sectionFilter}
					onChange={(e) => applyFilters({ section: e.target.value })}
					className="px-3 py-2 bg-white/90 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					placeholder="e.g. 1, A"
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
										<p className="mt-1 text-sm text-gray-600">Manage grade sections by grade and shift. Subjects are linked to grades.</p>
								</div>
								<div>
										<button
											onClick={handleAddNew}
											disabled={!canAddGrade}
												className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm"
										>
												<Plus className="w-4 h-4 mr-2" /> Add Grade Section
										</button>
								</div>
						</div>

						<DataToolbar
							showReset={false}
							searchSlot={searchSlot}
							filtersSlot={<div className="flex flex-row flex-wrap gap-2 w-full items-center">
								<GradeSelect
									id="grades-grade-filter"
									name="grades-grade-filter"
									aria-label="Grade"
									value={gradeFilter}
									onChange={(v) => applyFilters({ grade: v })}
									className="flex-1 min-w-[140px]"
									placeholder="Grade"
								/>
								<ShiftSelect
									id="grades-shift-filter"
									name="grades-shift-filter"
									aria-label="Shift"
									value={shiftFilter}
									onChange={(v) => applyFilters({ shift: v })}
									className="flex-1 min-w-[140px]"
									placeholder="Shift"
								/>
								<input
									id="grades-section-filter"
									name="grades-section-filter"
									aria-label="Section"
									type="text"
									value={sectionFilter}
									onChange={(e) => applyFilters({ section: e.target.value })}
									className="flex-1 min-w-[120px] px-3 py-2 bg-white/90 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									placeholder="Section"
								/>
								<div className="flex items-center gap-2 ml-auto flex-wrap">
									{sortSlot}
									<button
										type="button"
										onClick={() => { setGradeFilter(''); setShiftFilter(''); setSectionFilter(''); resetAndReload({ filters: {}, search: '' }); }}
										className="px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md border text-sm"
									>
										Reset
									</button>
								</div>
							</div>}
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
										<GradeTable
											classes={classes}
											onEdit={handleEdit}
											onDelete={handleDelete}
											canEdit={canEditGrade}
											canDelete={canDeleteGrade}
										/>
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

