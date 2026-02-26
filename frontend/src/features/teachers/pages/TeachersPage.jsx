import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Printer, RotateCcw } from 'lucide-react';

import { useAuth } from '../../../auth/AuthContext';

import { createTeacher, deactivateTeacher, listTeachers, reactivateTeacher, resetTeacherPassword, updateTeacher, uploadTeacherPhoto } from '../api/teachersApi';

import Modal from '../../../shared/components/ui/Modal.jsx';
import SearchInput from '../../../shared/components/DataToolbar/SearchInput.jsx';
import SortControls from '../../../shared/components/DataToolbar/SortControls.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import { useDebounce } from '../../../hooks/useDebounce';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import PdfDownloadButton from '../../../shared/components/exports/downloadButtons/PdfDownloadButton.jsx';
import ExcelDownloadButton from '../../../shared/components/exports/downloadButtons/ExcelDownloadButton.jsx';
import CsvDownloadButton from '../../../shared/components/exports/downloadButtons/CsvDownloadButton.jsx';
import CopyTableButton from '../../../shared/components/exports/downloadButtons/CopyTableButton.jsx';
import headerImg from '../../../assets/nuuruBayaanHeader.png';
import PrintHeader from '../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../shared/components/print/PrintFooter.jsx';
import Card from '../../../shared/components/ui/Card.jsx';

import { useI18n } from '../../../i18n/I18nProvider';

import TeacherForm from '../components/TeacherForm';
import TeacherAssignmentsModal from '../components/TeacherAssignmentsModal';
import TeacherTable from '../components/TeacherTable.jsx';
import { teacherKeys } from '../queryKeys';
import { useTeachersRealtimeInvalidation } from '../useTeachersRealtimeInvalidation';

export default function TeachersPage() {
	const { auth, hasPermission } = useAuth();
	const { t } = useI18n();
	const isAdmin = String(auth?.user?.role || '').toLowerCase() === 'admin';
	const canAddTeacher = isAdmin || hasPermission('teachers', 'add');
	const canEditTeacher = isAdmin || hasPermission('teachers', 'edit');
	const canAssignTeacher = isAdmin || hasPermission('teachers', 'assign');
	const canDeactivateTeacher = isAdmin || hasPermission('teachers', 'deactivate');
	const canReactivateTeacher = isAdmin || hasPermission('teachers', 'reactivate');
	const canResetTeacherPassword = isAdmin || hasPermission('teachers', 'resetPassword');
	// Teachers module doesn't define a separate "print" action; treat printing/exports as data download.
	const canDownloadTeachers = isAdmin || hasPermission('teachers', 'download');

	const navigate = useNavigate();
	const [showForm, setShowForm] = useState(false);
	const [editing, setEditing] = useState(null);
	const [createFormKey, setCreateFormKey] = useState(0);
	const [search, setSearch] = useState('');
	const debouncedSearch = useDebounce(search, 350);
	const [showAssign, setShowAssign] = useState(false);
	const [assignTeacher, setAssignTeacher] = useState(null);
	const [sortBy, setSortBy] = useState('createdAt');
	const [sortDir, setSortDir] = useState('desc');
	const [statusFilter, setStatusFilter] = useState('');
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);
	const [statusOverrides, setStatusOverrides] = useState({});
	const [pendingById, setPendingById] = useState({});

	const queryClient = useQueryClient();
	useTeachersRealtimeInvalidation();

	const teachersQuery = useQuery({
		queryKey: teacherKeys.adminList({ search: debouncedSearch }),
		queryFn: async ({ signal }) => {
			const res = await listTeachers({ search: debouncedSearch }, { signal });
			const rows = Array.isArray(res) ? res : (res?.items || res?.data || []);
			return Array.isArray(rows) ? rows : [];
		},
		placeholderData: (prev) => prev,
		staleTime: 30_000,
		refetchOnWindowFocus: false,
	});

	const createTeacherMutation = useMutation({
		mutationFn: (payload) => createTeacher(payload),
		onSuccess: () => {
			try {
				queryClient.invalidateQueries({ queryKey: teacherKeys.adminListBase, refetchType: 'active' });
			} catch { /* ignore */ }
		},
		onError: (e) => {
			toast.error(e?.data?.message || e?.message || t('teachers.table.errors.saveFailed'));
		},
	});

	const updateTeacherMutation = useMutation({
		mutationFn: ({ id, payload }) => updateTeacher(id, payload),
		onSuccess: () => {
			toast.success(t('teachers.table.toasts.updated'));
			try {
				queryClient.invalidateQueries({ queryKey: teacherKeys.adminListBase, refetchType: 'active' });
			} catch { /* ignore */ }
		},
		onError: (e) => {
			toast.error(e?.data?.message || e?.message || t('teachers.table.errors.saveFailed'));
		},
	});

	const toggleStatusMutation = useMutation({
		mutationFn: async ({ id, nextStatus }) => {
			if (nextStatus === 'inactive') return deactivateTeacher(id);
			return reactivateTeacher(id);
		},
		onSuccess: () => {
			try {
				queryClient.invalidateQueries({ queryKey: teacherKeys.adminListBase, refetchType: 'active' });
			} catch { /* ignore */ }
		},
	});

	const resetPasswordMutation = useMutation({
		mutationFn: (id) => resetTeacherPassword(id),
		onSuccess: () => {
			toast.success(t('teachers.table.toasts.passwordReset'));
		},
		onError: (e) => {
			toast.error(e?.data?.message || e?.message || t('teachers.table.errors.resetFailed'));
		},
	});

	const items = teachersQuery.data || [];
	const viewItems = React.useMemo(() => {
		if (!Array.isArray(items)) return [];
		return items.map((t) => {
			const id = t?._id || t?.id;
			if (!id) return t;
			const override = statusOverrides[id];
			return override ? { ...t, status: override } : t;
		});
	}, [items, statusOverrides]);

	const filteredItems = React.useMemo(() => {
		if (!Array.isArray(viewItems)) return [];
		const sf = String(statusFilter || '').trim().toLowerCase();
		if (!sf) return viewItems;
		return viewItems.filter((t) => String(t?.status || '').toLowerCase() === sf);
	}, [viewItems, statusFilter]);

	const sortedItems = React.useMemo(() => {
		const arr = [...filteredItems];
		const dir = sortDir === 'asc' ? 1 : -1;
		const key = sortBy;
		arr.sort((a, b) => {
			if (key === 'createdAt') {
				const ta = new Date(a.createdAt || 0).getTime();
				const tb = new Date(b.createdAt || 0).getTime();
				if (ta < tb) return -1 * dir;
				if (ta > tb) return 1 * dir;
				return 0;
			}
			const va = (a[key] || a.fullName || '').toString().toLowerCase();
			const vb = (b[key] || b.fullName || '').toString().toLowerCase();
			if (va < vb) return -1 * dir;
			if (va > vb) return 1 * dir;
			return 0;
		});
		return arr;
	}, [filteredItems, sortBy, sortDir]);

	const onSort = (field) => {
		if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
		else {
			setSortBy(field);
			setSortDir('asc');
		}
	};

	const onReset = () => {
		setSearch('');
		setSortBy('createdAt');
		setSortDir('desc');
		setStatusFilter('');
		setPage(1);
		setLimit(10);
	};

	const onAdd = () => {
		if (!canAddTeacher) {
			toast.error(t('teachers.table.permissions.noAdd'));
			return;
		}
		setEditing(null);
		setCreateFormKey((k) => k + 1);
		setShowForm(true);
	};
	const onEdit = (row) => {
		if (!canEditTeacher) {
			toast.error(t('teachers.table.permissions.noEdit'));
			return;
		}
		setEditing(row);
		setShowForm(true);
	};
	const onToggleStatus = async (row) => {
		const id = row?._id || row?.id;
		if (!id) return;
		if (pendingById[id]) return;

		const currentStatus = (statusOverrides[id] ?? row?.status ?? 'active') === 'inactive' ? 'inactive' : 'active';
		const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
		if (nextStatus === 'inactive' && !canDeactivateTeacher) {
			toast.error(t('teachers.table.permissions.noDeactivate'));
			return;
		}
		if (nextStatus === 'active' && !canReactivateTeacher) {
			toast.error(t('teachers.table.permissions.noReactivate'));
			return;
		}
		const verb = nextStatus === 'inactive' ? t('common.actions.deactivate') : t('common.actions.reactivate');
		if (!confirm(t('teachers.table.confirms.toggle', { verb }))) return;

		setPendingById((prev) => ({ ...prev, [id]: true }));
		setStatusOverrides((prev) => ({ ...prev, [id]: nextStatus }));
		try {
			await toggleStatusMutation.mutateAsync({ id, nextStatus });
			setStatusOverrides((prev) => {
				const copy = { ...prev };
				delete copy[id];
				return copy;
			});
			toast.success(nextStatus === 'inactive' ? t('teachers.table.toasts.deactivated') : t('teachers.table.toasts.reactivated'));
		} catch (e) {
			setStatusOverrides((prev) => {
				const copy = { ...prev };
				delete copy[id];
				return copy;
			});
			toast.error(e?.data?.message || e?.message || t('teachers.table.errors.updateFailed'));
		} finally {
			setPendingById((prev) => {
				const copy = { ...prev };
				delete copy[id];
				return copy;
			});
		}
	};

	const onResetPassword = async (row) => {
		if (!canResetTeacherPassword) {
			toast.error(t('teachers.table.permissions.noResetPw'));
			return;
		}
		const id = row?._id || row?.id;
		if (!id) return;
		if (pendingById[id]) return;
		if (String(row?.status || '').toLowerCase() === 'inactive') return;
		if (!confirm(t('teachers.table.confirms.resetPassword'))) return;

		setPendingById((prev) => ({ ...prev, [id]: true }));
		try {
			await resetPasswordMutation.mutateAsync(id);
		} catch (e) {
			toast.error(e?.data?.message || e?.message || t('teachers.table.errors.resetFailed'));
		} finally {
			setPendingById((prev) => {
				const copy = { ...prev };
				delete copy[id];
				return copy;
			});
		}
	};

	// Keep page in range if total shrinks (delete/search)
	useEffect(() => {
		const total = sortedItems.length;
		const tp = total <= 0 ? 1 : (limit >= total ? 1 : Math.ceil(total / limit));
		if (page > tp) setPage(tp);
	}, [sortedItems.length, limit, page]);

	const total = sortedItems.length;
	const totalPages = total <= 0 ? 1 : (limit >= total ? 1 : Math.ceil(total / limit));
	const currentRows = useMemo(() => {
		if (!Array.isArray(sortedItems)) return [];
		if (total <= 0) return [];
		if (limit >= total) return sortedItems;
		const start = (Math.max(1, page) - 1) * limit;
		return sortedItems.slice(start, start + limit);
	}, [sortedItems, page, limit, total]);

	const onSave = async (payload, photoFile) => {
		const isEdit = Boolean(editing);
		let teacherId = null;
		let createdName = '';

		try {
			if (isEdit) {
				const id = editing._id || editing.id;
				teacherId = id;
				await updateTeacherMutation.mutateAsync({ id, payload });
			} else {
				const res = await createTeacherMutation.mutateAsync(payload);
				teacherId = res?.data?._id || res?.data?.id || res?._id || null;
				createdName = String(payload?.fullName || '').trim();
				toast.success(
					createdName
						? t('teachers.table.toasts.createdWithName', { name: createdName })
						: t('teachers.table.toasts.created')
				);
			}
		} catch {
			// Errors are already toasted in the mutation handlers.
			return;
		}

		if (teacherId && photoFile) {
			try {
				await uploadTeacherPhoto(teacherId, photoFile);
			} catch (e) {
				toast.error(e?.data?.message || e?.message || t('teachers.table.errors.photoUploadFailed'));
			}
		}

		if (isEdit) {
			setShowForm(false);
			setEditing(null);
			return;
		}

		// Create: keep modal open for bulk entry, but reset the form.
		setEditing(null);
		setCreateFormKey((k) => k + 1);
	};

	const handlePrint = () => {
		if (!canDownloadTeachers) {
			toast.error(t('teachers.table.permissions.noExport'));
			return;
		}
		setTimeout(() => window.print(), 0);
	};
	const isLoading = Boolean(teachersQuery.isLoading && teachersQuery.data == null);
	const canExport = Boolean(canDownloadTeachers && !isLoading && Array.isArray(sortedItems) && sortedItems.length > 0);
	const buildExportPayload = useCallback(async () => {
		if (!canExport) return null;

		// Export should match the currently visible table columns (and exclude action buttons).
		const STORAGE_KEY = 'teachers:columns:v1';
		let visible = {};
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (parsed && typeof parsed === 'object') visible = parsed;
			}
		} catch { /* ignore */ }
		const isVisible = (key) => visible?.[String(key)] !== false;

		const dtf = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
		const cols = [
			{ key: 'name', label: t('teachers.table.columns.name'), get: (tch) => tch?.fullName || `${tch?.firstName || ''} ${tch?.lastName || ''}`.trim() || '' },
			{ key: 'teacherId', label: t('teachers.table.columns.teacherId'), get: (tch) => tch?.teacherId || '' },
			{ key: 'email', label: t('teachers.table.columns.email'), get: (tch) => tch?.email || '' },
			{ key: 'phone', label: t('teachers.table.columns.phone'), get: (tch) => tch?.phone || '' },
			{ key: 'salary', label: t('teachers.table.columns.salary'), get: (tch) => Number(tch?.salary || 0) },
			{ key: 'createdAt', label: t('teachers.table.columns.createdAt'), get: (tch) => (tch?.createdAt ? dtf.format(new Date(tch.createdAt)) : '') },
			{ key: 'status', label: t('teachers.table.columns.status'), get: (tch) => tch?.status || '' },
			// actions are UI-only; never export
		].filter((c) => isVisible(c.key));

		const headers = cols.map((c) => c.label);
		const rows = (sortedItems || []).map((t) => cols.map((c) => c.get(t)));

		const subtitleParts = [
			search ? `${t('teachers.export.labels.search')}: ${search}` : null,
			statusFilter ? `${t('teachers.export.labels.status')}: ${statusFilter}` : null,
		].filter(Boolean);

		return {
			filename: t('teachers.export.filename'),
			sheetName: t('teachers.export.sheetName'),
			title: '',
			subtitle: subtitleParts.join(' • '),
			headerImageSrc: headerImg,
			headers,
			rows,
		};
	}, [canExport, sortedItems, search, statusFilter, t]);

	return (
		<div className="space-y-6 with-print-header with-print-footer print-fit-wide">
			<PrintHeader />
			<PrintFooter left={t('common.generatedBy')} />

			<Card className="p-4 no-print">
				<div className="flex flex-col gap-3">
					{/* Row 1: Search + selections */}
					<div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3">
						<div className="w-full md:max-w-xs grow">
							<SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('teachers.searchPlaceholder')} />
						</div>

						<FilterRow className="flex-1">
							<FilterItem minWidthClass="sm:min-w-44">
								<DropdownSelect
									value={statusFilter}
									onChange={(v) => { setStatusFilter(v); setPage(1); }}
									placeholder={t('teachers.filters.status')}
									options={[
										{ value: '', label: t('teachers.filters.all') },
										{ value: 'active', label: t('teachers.filters.active') },
										{ value: 'inactive', label: t('teachers.filters.inactive') },
									]}
								/>
							</FilterItem>

							<FilterItem grow minWidthClass="sm:min-w-48">
								<SortControls
									currentField={sortBy}
									currentDir={sortDir}
									fields={[
										{ field: 'fullName', label: t('teachers.sort.name') },
										{ field: 'teacherId', label: t('teachers.sort.id') },
										{ field: 'createdAt', label: t('teachers.sort.created') },
									]}
									onSort={onSort}
								/>
							</FilterItem>
						</FilterRow>
					</div>

					{/* Row 2: Add button (left) + Actions (right) */}
					<div className="w-full flex items-center justify-between gap-2 flex-wrap">
						{canAddTeacher && (
							<Button
								variant="brand"
								size="lg"
								onClick={onAdd}
								icon={<Plus size={20} />}
								className="w-full sm:w-auto justify-center"
							>
								{t('teachers.addNew')}
							</Button>
						)}

						<div className="flex items-center justify-end gap-2 flex-nowrap overflow-x-auto w-full sm:w-auto">
							{canDownloadTeachers && (
								<>
									<ActionButton
										variant="outline"
										onClick={handlePrint}
										title={t('common.actions.print')}
										icon={<Printer size={16} />}
									>
										{t('common.actions.print')}
									</ActionButton>

									<PdfDownloadButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
									<ExcelDownloadButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
									<CsvDownloadButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
									<CopyTableButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
								</>
							)}

							<ActionButton
								variant="outline"
								onClick={onReset}
								title={t('teachers.resetFilters')}
								icon={<RotateCcw size={16} />}
							>
								{t('common.actions.reset')}
							</ActionButton>
						</div>
					</div>
				</div>
			</Card>

			<TeacherTable
				items={sortedItems}
				rows={currentRows}
				isLoading={isLoading}
				error={teachersQuery.isError ? (teachersQuery.error?.data?.message || teachersQuery.error?.message || t('teachers.table.errors.loadFailed')) : null}
				sortBy={sortBy}
				sortDir={sortDir}
				onSort={onSort}
				meta={{ page, totalPages, limit, total }}
				onPage={setPage}
				onLimit={(v) => { setLimit(v); setPage(1); }}
				onView={(teacher) => {
					const id = teacher?._id || teacher?.id;
					if (!id) return;
					navigate(`/teachers/${id}`);
				}}
				onAssign={(teacher) => {
					if (!canAssignTeacher) {
						toast.error(t('teachers.table.permissions.noAssign'));
						return;
					}
					setAssignTeacher(teacher);
					setShowAssign(true);
				}}
				onEdit={onEdit}
				onToggleStatus={onToggleStatus}
				onResetPassword={onResetPassword}
				pendingById={pendingById}
			/>

			<Modal
				isOpen={showForm}
				onClose={() => {
					setShowForm(false);
					setEditing(null);
				}}
				title={editing ? t('teachers.editTitle') : t('teachers.addTitle')}
				panelClassName="max-w-none w-[96vw]"
				headerClassName="bg-linear-to-r from-(--nb-color-brand) to-(--nb-color-accent) text-white border-b border-white/10"
				titleClassName="text-white text-xl font-bold"
				closeButtonClassName="text-white/90 hover:text-white p-1 rounded-(--nb-radius-sm) hover:bg-white/10 transition-colors"
				bodyClassName="p-3 nb-scrollbar-none"
			>
				<TeacherForm
					key={editing ? String(editing?._id || editing?.id || 'edit') : `create:${createFormKey}`}
					initialValue={editing}
					onCancel={() => {
						setShowForm(false);
						setEditing(null);
					}}
					onSave={onSave}
				/>
			</Modal>

			<TeacherAssignmentsModal key={assignTeacher?._id || assignTeacher?.id || 'teacher-assignments'} isOpen={showAssign} onClose={() => {
				setShowAssign(false);
				setAssignTeacher(null);
			}} teacher={assignTeacher || {}} />
		</div>
	);
}
