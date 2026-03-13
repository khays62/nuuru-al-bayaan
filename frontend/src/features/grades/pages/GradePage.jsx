import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import { useAuth } from '../../../auth/AuthContext';

import { Plus, Printer } from 'lucide-react';

import Card from '../../../shared/components/ui/Card.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import SearchInput from '../../../shared/components/DataToolbar/SearchInput.jsx';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import FilterDropdownSelect from '../../../shared/components/DataToolbar/FilterDropdownSelect.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';

import PdfDownloadButton from '../../../shared/components/exports/downloadButtons/PdfDownloadButton.jsx';
import ExcelDownloadButton from '../../../shared/components/exports/downloadButtons/ExcelDownloadButton.jsx';
import CsvDownloadButton from '../../../shared/components/exports/downloadButtons/CsvDownloadButton.jsx';
import CopyTableButton from '../../../shared/components/exports/downloadButtons/CopyTableButton.jsx';

import PrintHeader from '../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../shared/components/print/PrintFooter.jsx';

import { useEntityList } from '../../../hooks/useEntityList';
import { useClientSort } from '../../../shared/hooks/useClientSort';
import { listGradeSections, deleteGradeSection } from '../api/gradeSections';
import { getGrades, getShifts } from '../../lookups/api/lookups';
import headerImg from '../../../assets/nuuruBayaanHeader.png';

import GradeTable from '../components/GradeTable.jsx';
import GradeForm from '../components/GradeForm.jsx';
import GradeSectionRosterModal from '../components/GradeSectionRosterModal.jsx';
import { gradeSectionKeys } from '../queryKeys';
import { useGradeSectionsRealtimeInvalidation } from '../useGradeSectionsRealtimeInvalidation';
import { useI18n } from '../../../i18n/useI18n';

export default function GradePage() {
	const { auth } = useAuth();
	const role = auth?.user?.role;
	// Safety: teachers should use the dedicated My Classes page.
	if (role === 'teacher') return <Navigate to="/teacher-classes" replace />;
	return <GradePageInner />;
}

function GradePageInner() {
	const { t } = useI18n();
	const { auth, hasPermission } = useAuth();
	const role = auth?.user?.role;
	const isAdmin = String(role || '').toLowerCase() === 'admin';
	const canView = isAdmin || hasPermission('grades', 'view');
	const canAdd = isAdmin || hasPermission('grades', 'add');
	const canEdit = isAdmin || hasPermission('grades', 'edit');
	const canDelete = isAdmin || hasPermission('grades', 'delete');

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingClass, setEditingClass] = useState(null);
	const [isRosterOpen, setIsRosterOpen] = useState(false);
	const [rosterClass, setRosterClass] = useState(null);

	// Local, controlled filters
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

	const fetchGradeSections = useCallback(async (params, options = {}) => {
		return await listGradeSections({
			page: params.page,
			limit: params.limit,
			search: params.search,
			grade: params.grade,
			shift: params.shift,
			section: params.section,
			sortBy: params.sortBy,
			sortDir: params.sortDir,
		}, { signal: options?.signal });
	}, []);

	const list = useEntityList({
		fetchFn: fetchGradeSections,
		initialSortBy: 'createdAt',
		initialSortDir: 'desc',
		initialLimit: 10,
		persistKey: 'grades-page',
		extraFilters: { grade: gradeFilter, shift: shiftFilter, section: sectionFilter },
		queryKeyBase: gradeSectionKeys.listBase,
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
		resetAndReload,
	} = list;

	useGradeSectionsRealtimeInvalidation({ enabled: true });

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

	const handleAddNew = () => {
		if (!canAdd) {
			toast.error(t('gradeSections.permissions.noAdd', { defaultValue: 'You do not have permission to add grade sections' }));
			return;
		}
		setEditingClass(null);
		setIsModalOpen(true);
	};
	const handleEdit = (cls) => {
		if (!canEdit) {
			toast.error(t('gradeSections.permissions.noEdit', { defaultValue: 'You do not have permission to edit grade sections' }));
			return;
		}
		setEditingClass(cls);
		setIsModalOpen(true);
	};
	const handleView = (cls) => { setRosterClass(cls); setIsRosterOpen(true); };
	const closeRoster = () => { setIsRosterOpen(false); setRosterClass(null); };
	const closeModal = () => { setIsModalOpen(false); setEditingClass(null); };
	const handlePrint = () => {
		if (!canView) {
			toast.error(t('gradeSections.permissions.noViewPrint', { defaultValue: 'You do not have permission to view/print grade sections' }));
			return;
		}
		setTimeout(() => window.print(), 0);
	};

	const handleDelete = async (id) => {
		if (!canDelete) {
			toast.error(t('gradeSections.permissions.noDelete', { defaultValue: 'You do not have permission to delete grade sections' }));
			return;
		}
		if (!window.confirm(t('gradeSections.confirms.delete', { defaultValue: 'Are you sure you want to delete this section?' }))) return;
		const res = await deleteGradeSection(id);
		if (res && res.ok) {
			toast.success(t('gradeSections.toasts.deleted', { defaultValue: 'Deleted successfully' }));
		} else {
			toast.error(res?.error || t('common.errors.failedToDelete', { defaultValue: 'Failed to delete' }));
		}
	};

	const applyFilters = (patch) => {
		if (patch.grade !== undefined) setGradeFilter(patch.grade);
		if (patch.shift !== undefined) setShiftFilter(patch.shift);
		if (patch.section !== undefined) setSectionFilter(patch.section);
		setPage(1);
	};

	const STORAGE_KEY = 'gradeSections:columns:v1';
	const canExport = Boolean(canView && !isLoading && Array.isArray(classes) && classes.length > 0);
	const sortedGrades = (grades || []).slice().sort((a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0));

	const buildExportPayload = useCallback(async () => {
		if (!canExport) return null;

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
			{ key: 'section', label: t('common.filters.section', { defaultValue: 'Section' }), get: (r) => r.section || '' },
			{ key: 'grade', label: t('common.filters.grade', { defaultValue: 'Grade' }), get: (r) => r.grade?.gradeName || '' },
			{ key: 'shift', label: t('common.filters.shift', { defaultValue: 'Shift' }), get: (r) => r.shift?.shiftName || '' },
			{ key: 'subjects', label: t('gradeSections.columns.subjects', { defaultValue: 'Subjects' }), get: (r) => String((r.subjects || []).length) },
			{ key: 'capacity', label: t('gradeSections.columns.capacity', { defaultValue: 'Capacity' }), get: (r) => (r.capacity == null ? '' : String(r.capacity)) },
		].filter((c) => isVisible(c.key));

		const headers = cols.map((c) => c.label);
		const rows = (sortedClassesForView || []).map((r) => cols.map((c) => c.get(r)));

		const subtitleParts = [
			gradeFilter ? `${t('common.filters.grade', { defaultValue: 'Grade' })}: ${gradeFilter}` : null,
			shiftFilter ? `${t('common.filters.shift', { defaultValue: 'Shift' })}: ${shiftFilter}` : null,
			sectionFilter ? `${t('common.filters.section', { defaultValue: 'Section' })}: ${sectionFilter}` : null,
		].filter(Boolean);

		return {
			filename: 'grade-sections',
			sheetName: t('gradeSections.export.sheetName', { defaultValue: 'Grade Sections' }),
			title: t('gradeSections.export.title', { defaultValue: 'Grade Sections' }),
			subtitle: subtitleParts.join(' - '),
			headerImageSrc: headerImg,
			headers,
			rows,
		};
	}, [canExport, gradeFilter, shiftFilter, sectionFilter, sortedClassesForView, t]);

	return (
		<div className="space-y-6 with-print-header with-print-footer">
			<PrintHeader />
			<PrintFooter left={t('common.generatedBy', { defaultValue: 'Generated by Nuuru Al-Bayaan' })} />

			<Card className="p-4 no-print">
				<div className="flex flex-col gap-3">
					<div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3">
						<div className="w-full md:max-w-xs grow">
							<SearchInput
								value={searchTerm}
								onChange={(v) => { setSearch(v); }}
								placeholder={t('gradeSections.searchPlaceholder', { defaultValue: 'Search grade or section...' })}
							/>
						</div>
						<FilterRow className="flex-1">
							<FilterItem grow minWidthClass="sm:min-w-40">
								<DropdownSelect
									value={gradeFilter}
									onChange={(v) => applyFilters({ grade: v })}
									placeholder={t('common.filters.grade', { defaultValue: 'Grade' })}
									options={sortedGrades.map((g) => ({ value: g._id, label: g.gradeName }))}
								/>
							</FilterItem>
							<FilterItem grow minWidthClass="sm:min-w-40">
								<FilterDropdownSelect
									value={shiftFilter}
									onChange={(v) => applyFilters({ shift: v })}
									placeholder={t('common.filters.shift', { defaultValue: 'Shift' })}
									options={(shifts || []).map((s) => ({ value: s._id, label: s.shiftName }))}
									maxVisible={5}
								/>
							</FilterItem>
							<FilterItem grow minWidthClass="sm:min-w-32">
								<Input
									id="grades-section-filter"
									name="grades-section-filter"
									aria-label={t('common.filters.section', { defaultValue: 'Section' })}
									type="text"
									value={sectionFilter}
									onChange={(e) => applyFilters({ section: e.target.value })}
									className="w-full"
									placeholder={t('common.filters.section', { defaultValue: 'Section' })}
								/>
							</FilterItem>
						</FilterRow>
					</div>

					<div className="w-full flex items-center justify-between gap-2 flex-wrap">
						{canAdd && (
							<Button
								variant="brand"
								size="lg"
								onClick={handleAddNew}
								icon={<Plus className="w-5 h-5" />}
								className="w-full sm:w-auto justify-center"
							>
								{t('gradeSections.actions.add', { defaultValue: 'Add Grade Section' })}
							</Button>
						)}

						<div className="flex items-center justify-end gap-2 flex-nowrap overflow-x-auto w-full sm:w-auto">
							{canView && (
								<>
									<ActionButton
										variant="outline"
										onClick={handlePrint}
										title={t('common.actions.print', { defaultValue: 'Print' })}
										icon={<Printer size={16} />}
									>
										{t('common.actions.print', { defaultValue: 'Print' })}
									</ActionButton>

									<PdfDownloadButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
									<ExcelDownloadButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
									<CsvDownloadButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
									<CopyTableButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
								</>
							)}

							<ActionButton
								variant="outline"
								onClick={() => {
									setGradeFilter('');
									setShiftFilter('');
									setSectionFilter('');
									resetAndReload({ filters: {}, search: '' });
								}}
								title={t('common.filters.resetTitle', { defaultValue: 'Reset filters' })}
							>
								{t('common.actions.reset', { defaultValue: 'Reset' })}
							</ActionButton>
						</div>
					</div>
				</div>
			</Card>

			<GradeTable
				items={classes}
				rows={sortedClassesForView}
				meta={meta}
				isLoading={isLoading}
				error={error}
				onRetry={refresh}
				onAdd={handleAddNew}
				onEdit={handleEdit}
				onDelete={handleDelete}
				onView={handleView}
				sortBy={sortBy}
				sortDir={sortDir}
				onSort={onSort}
				onPage={(p) => setPage(p)}
				onLimit={(v) => { setLimit(v); setPage(1); }}
			/>

			<Modal
				isOpen={isModalOpen}
				onClose={closeModal}
				title={editingClass ? t('gradeSections.modal.editTitle', { defaultValue: 'Edit Grade Section' }) : t('gradeSections.modal.addTitle', { defaultValue: 'Add Grade Section' })}
			>
				<GradeForm cls={editingClass} onClose={closeModal} onSuccess={() => { /* EDCI via realtime */ }} />
			</Modal>

			<GradeSectionRosterModal isOpen={isRosterOpen} onClose={closeRoster} gradeSection={rosterClass} />
		</div>
	);
}


