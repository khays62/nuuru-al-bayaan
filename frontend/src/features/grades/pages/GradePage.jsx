import React, { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Printer } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '../../../shared/components/ui/Modal.jsx';
import GradeTable from '../components/GradeTable';
import GradeForm from '../components/GradeForm';
import { useEntityList } from '../../../hooks/useEntityList';
import SearchInput from '../../../shared/components/DataToolbar/SearchInput.jsx';
import { listGradeSections, deleteGradeSection } from '../api/gradeSections';
import { getGrades, getShifts } from '../../lookups/api/lookups';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
// AY and Cohort filters removed (GS is AY-agnostic)
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import PdfDownloadButton from '../../../shared/components/exports/downloadButtons/PdfDownloadButton.jsx';
import ExcelDownloadButton from '../../../shared/components/exports/downloadButtons/ExcelDownloadButton.jsx';
import CsvDownloadButton from '../../../shared/components/exports/downloadButtons/CsvDownloadButton.jsx';
import CopyTableButton from '../../../shared/components/exports/downloadButtons/CopyTableButton.jsx';
import headerImg from '../../../assets/nuuruBayaanHeader.png';
import GradeSectionRosterModal from '../components/GradeSectionRosterModal';
import PrintHeader from '../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../shared/components/print/PrintFooter.jsx';
import { useAuth } from '../../../auth/AuthContext';
import TableState from '../../../shared/components/table/TableState.jsx';
import PaginationBar from '../../../shared/components/table/PaginationBar.jsx';
import { useClientSort } from '../../../shared/hooks/useClientSort';

export default function GradePage() {
		const { auth } = useAuth();
		const role = auth?.user?.role;
		// Safety: teachers should use the dedicated My Classes page.
		if (role === 'teacher') return <Navigate to="/teacher-classes" replace />;
		return <GradePageInner />;
}

function GradePageInner() {
		const [isModalOpen, setIsModalOpen] = useState(false);
		const [editingClass, setEditingClass] = useState(null);
		const [isRosterOpen, setIsRosterOpen] = useState(false);
		const [rosterClass, setRosterClass] = useState(null);
		// Local, controlled filters (mirrors StudentPage pattern for stability)
		const [gradeFilter, setGradeFilter] = useState('');
		const [shiftFilter, setShiftFilter] = useState('');
	const [sectionFilter, setSectionFilter] = useState('');
		const [grades, setGrades] = useState([]);
		const [shifts, setShifts] = useState([]);

		useEffect(() => {
			let ignore = false;
			(async () => {
				try {
					const [gs, ss] = await Promise.all([getGrades(), getShifts()]);
					if (ignore) return;
					setGrades(Array.isArray(gs) ? gs : (gs?.data || []));
					setShifts(Array.isArray(ss) ? ss : (ss?.data || []));
				} catch {
					if (ignore) return;
					setGrades([]);
					setShifts([]);
				}
			})();
			return () => { ignore = true; };
		}, []);


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
				setPage,
				setLimit,
				refresh,
				resetAndReload
		} = list;

		const {
			sortBy,
			sortDir,
			onSort,
			sortedRows: sortedClassesForView,
		} = useClientSort(classes, {
			initialSortBy: 'createdAt',
			initialSortDir: 'desc',
			getValue: (row, field) => {
				switch (field) {
					case 'section':
						return String(row?.section ?? '').toLowerCase();
					case 'gradeName':
						return String(row?.grade?.gradeName || row?.grade?.name || row?.grade || '').toLowerCase();
					case 'createdAt':
					default:
						return new Date(row?.createdAt || 0).getTime();
				}
			},
		});

		// CRUD handlers
		const handleAddNew = () => { setEditingClass(null); setIsModalOpen(true); };
		const handleEdit = (cls) => { setEditingClass(cls); setIsModalOpen(true); };
		const handleView = (cls) => { setRosterClass(cls); setIsRosterOpen(true); };
		const closeRoster = () => { setIsRosterOpen(false); setRosterClass(null); };
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
		const handlePrint = () => { setTimeout(() => window.print(), 0); };

		// Apply filters in a coalesced way to avoid multiple fetches
		const applyFilters = (patch) => {
			if (patch.grade !== undefined) setGradeFilter(patch.grade);
			if (patch.shift !== undefined) setShiftFilter(patch.shift);
			if (patch.section !== undefined) setSectionFilter(patch.section);
			// Single page reset; hook will coalesce identical signatures
			setPage(1);
		};

		const outlineBtn = 'bg-white! text-blue-700! border-blue-400! hover:bg-blue-50!';
		const canExport = Boolean(!isLoading && Array.isArray(classes) && classes.length > 0);
		const sortedGrades = (grades || []).slice().sort((a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0));
		const buildExportPayload = useCallback(async () => {
			if (!canExport) return null;
			// Match currently visible columns (and never export Actions)
			const STORAGE_KEY = 'gradeSections:columns:v1';
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
				{ key: 'section', label: 'Section', get: (r) => r.section || '' },
				{ key: 'grade', label: 'Grade', get: (r) => r.grade?.gradeName || '' },
				{ key: 'shift', label: 'Shift', get: (r) => r.shift?.shiftName || '' },
				{ key: 'subjects', label: 'Subjects', get: (r) => String((r.subjects || []).length) },
				{ key: 'capacity', label: 'Capacity', get: (r) => (r.capacity == null ? '' : String(r.capacity)) },
				// actions excluded
			].filter((c) => isVisible(c.key));

			const headers = cols.map((c) => c.label);
			const rows = (sortedClassesForView || []).map((r) => cols.map((c) => c.get(r)));

			const subtitleParts = [
				gradeFilter ? `Grade: ${gradeFilter}` : null,
				shiftFilter ? `Shift: ${shiftFilter}` : null,
				sectionFilter ? `Section: ${sectionFilter}` : null,
			].filter(Boolean);

			return {
				filename: 'grade-sections',
				sheetName: 'Grade Sections',
				title: 'Grade Sections',
				subtitle: subtitleParts.join(' • '),
				headerImageSrc: headerImg,
				headers,
				rows,
			};
		}, [canExport, sortedClassesForView, gradeFilter, shiftFilter, sectionFilter]);

		return (
				<div className="space-y-6 with-print-header with-print-footer">
					<PrintHeader />
					<PrintFooter left="Generated by Nuuru Al-Bayaan" />

					<div className="bg-white p-4 rounded-lg shadow-lg no-print">
						<div className="flex flex-col gap-3">
							{/* Row 1: Search + filters */}
							<div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3">
								<div className="w-full md:max-w-xs grow">
									<SearchInput
										value={searchTerm}
										onChange={(v) => { setSearch(v); }}
										placeholder="Search grade or section..."
									/>
								</div>
								<div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 flex-1">
									<div className="w-full sm:flex-1 sm:min-w-40">
										<DropdownSelect
											value={gradeFilter}
											onChange={(v) => applyFilters({ grade: v })}
											placeholder="Grade"
												options={sortedGrades.map((g) => ({ value: g._id, label: g.gradeName }))}
										/>
									</div>
									<div className="w-full sm:flex-1 sm:min-w-40">
										<DropdownSelect
											value={shiftFilter}
											onChange={(v) => applyFilters({ shift: v })}
											placeholder="Shift"
											options={(shifts || []).map((s) => ({ value: s._id, label: s.shiftName }))}
										/>
									</div>
									<Input
										id="grades-section-filter"
										name="grades-section-filter"
										aria-label="Section"
										type="text"
										value={sectionFilter}
										onChange={(e) => applyFilters({ section: e.target.value })}
										className="w-full sm:flex-1 sm:min-w-32"
										placeholder="Section"
									/>
								</div>
							</div>

							{/* Row 2: Add (left) + exports/reset (right) */}
							<div className="w-full flex items-center justify-between gap-2 flex-wrap">
								<Button
									variant="brand"
									size="lg"
									onClick={handleAddNew}
									icon={<Plus className="w-5 h-5" />}
									className="w-full sm:w-auto justify-center"
								>
									Add Grade Section
								</Button>

								<div className="flex items-center justify-end gap-2 flex-nowrap overflow-x-auto w-full sm:w-auto">
									<ActionButton
											variant="neutral"
											className={outlineBtn}
											onClick={handlePrint}
											title="Print"
											icon={<Printer size={16} />}
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
										onClick={() => { setGradeFilter(''); setShiftFilter(''); setSectionFilter(''); resetAndReload({ filters: {}, search: '' }); }}
										title="Reset filters"
									>
										Reset
									</ActionButton>
								</div>
							</div>
						</div>
					</div>

						<TableState
							isLoading={isLoading && classes.length === 0}
							error={error}
							items={classes}
							loadingMessage="Loading..."
							loadingVariant="table"
							loadingRows={6}
							loadingColumns={5}
							emptyTitle="No grade sections found"
							emptyDescription="Try adjusting filters or create a new one."
							emptyActionLabel="Add"
							onEmptyAction={handleAddNew}
							onRetry={refresh}
						>
							<GradeTable
								classes={sortedClassesForView}
								onEdit={handleEdit}
								onDelete={handleDelete}
								onView={handleView}
								sortBy={sortBy}
								sortDir={sortDir}
								onSort={onSort}
								limit={meta.limit || 10}
								total={meta.total || 0}
								onLimit={(v) => { setLimit(v); setPage(1); }}
							/>
							<PaginationBar
								meta={meta}
								className="no-print"
								onPage={(p) => setPage(p)}
								onLimit={(l) => setLimit(l)}
								showRowsSelector={false}
								infoVariant="page"
							/>
						</TableState>

						<Modal isOpen={isModalOpen} onClose={closeModal} title={editingClass ? 'Edit Grade Section' : 'Add Grade Section'}>
								<GradeForm cls={editingClass} onClose={closeModal} onSuccess={() => refresh()} />
						</Modal>

						<GradeSectionRosterModal isOpen={isRosterOpen} onClose={closeRoster} gradeSection={rosterClass} />
				</div>
		);
}

