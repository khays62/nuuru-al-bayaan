import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../../auth/AuthContext';

import { createTeacher, deactivateTeacher, listTeachers, reactivateTeacher, resetTeacherPassword, updateTeacher } from '../api/teachersApi';

import Modal from '../../../shared/components/ui/Modal.jsx';
import DataToolbar from '../../../shared/components/DataToolbar/DataToolbar.jsx';
import SearchInput from '../../../shared/components/DataToolbar/SearchInput.jsx';
import SortControls from '../../../shared/components/DataToolbar/SortControls.jsx';
import Button from '../../../shared/components/ui/Button.jsx';

import TeacherForm from '../components/TeacherForm';
import TeacherAssignmentsModal from '../components/TeacherAssignmentsModal';
import TeacherTable from '../components/TeacherTable.jsx';
import { on as onEvent, off as offEvent, EVENTS } from '../../../utils/events';

export default function TeachersPage() {
	const { auth, hasPermission } = useAuth();
	const isAdmin = String(auth?.user?.role || '').toLowerCase() === 'admin';
	const canAddTeacher = isAdmin || hasPermission('teachers', 'add');
	const canEditTeacher = isAdmin || hasPermission('teachers', 'edit');
	const canAssignTeacher = isAdmin || hasPermission('teachers', 'assign');
	const canDeactivateTeacher = isAdmin || hasPermission('teachers', 'deactivate');
	const canReactivateTeacher = isAdmin || hasPermission('teachers', 'reactivate');
	const canResetTeacherPassword = isAdmin || hasPermission('teachers', 'resetPassword');

	const navigate = useNavigate();
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [showForm, setShowForm] = useState(false);
	const [editing, setEditing] = useState(null);
	const [search, setSearch] = useState('');
	const [showAssign, setShowAssign] = useState(false);
	const [assignTeacher, setAssignTeacher] = useState(null);
	const [sortBy, setSortBy] = useState('createdAt');
	const [sortDir, setSortDir] = useState('desc');
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);
	const [statusOverrides, setStatusOverrides] = useState({});
	const [pendingById, setPendingById] = useState({});

	const fetchTeachers = useCallback(async ({ silent = false } = {}) => {
		if (!silent) setLoading(true);
		if (!silent) setError(null);
		try {
			const data = await listTeachers({ search });
			setItems(Array.isArray(data) ? data : (data.items || data?.data || []));
		} catch {
			if (!silent) setError('Failed to load teachers');
		} finally {
			if (!silent) setLoading(false);
		}
	}, [search]);

	useEffect(() => {
		fetchTeachers();
	}, [fetchTeachers]);

	// Live refresh: when bell actions mark a teacher active/inactive
	useEffect(() => {
		const handler = () => fetchTeachers({ silent: Array.isArray(items) && items.length > 0 });
		onEvent(EVENTS.TEACHERS_CHANGED, handler);
		return () => offEvent(EVENTS.TEACHERS_CHANGED, handler);
	}, [fetchTeachers, items]);

	const viewItems = React.useMemo(() => {
		if (!Array.isArray(items)) return [];
		return items.map((t) => {
			const id = t?._id || t?.id;
			if (!id) return t;
			const override = statusOverrides[id];
			return override ? { ...t, status: override } : t;
		});
	}, [items, statusOverrides]);

	const sortedItems = React.useMemo(() => {
		const arr = [...viewItems];
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
	}, [viewItems, sortBy, sortDir]);

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
		setPage(1);
		setLimit(10);
	};

	const onAdd = () => {
		if (!canAddTeacher) {
			toast.error('You do not have permission to add teachers');
			return;
		}
		setEditing(null);
		setShowForm(true);
	};
	const onEdit = (row) => {
		if (!canEditTeacher) {
			toast.error('You do not have permission to edit teachers');
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
			toast.error('You do not have permission to deactivate teachers');
			return;
		}
		if (nextStatus === 'active' && !canReactivateTeacher) {
			toast.error('You do not have permission to reactivate teachers');
			return;
		}
		const verb = nextStatus === 'inactive' ? 'Deactivate' : 'Reactivate';
		if (!confirm(`${verb} this teacher?`)) return;

		setPendingById((prev) => ({ ...prev, [id]: true }));
		setStatusOverrides((prev) => ({ ...prev, [id]: nextStatus }));
		try {
			if (nextStatus === 'inactive') await deactivateTeacher(id);
			else await reactivateTeacher(id);
			setItems((prev) => prev.map((x) => ((x._id || x.id) === id ? { ...x, status: nextStatus } : x)));
			setStatusOverrides((prev) => {
				const copy = { ...prev };
				delete copy[id];
				return copy;
			});
			toast.success(nextStatus === 'inactive' ? 'Teacher deactivated' : 'Teacher reactivated');
		} catch (e) {
			setStatusOverrides((prev) => {
				const copy = { ...prev };
				delete copy[id];
				return copy;
			});
			toast.error(e?.message || 'Update failed');
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
			toast.error('You do not have permission to reset passwords');
			return;
		}
		const id = row?._id || row?.id;
		if (!id) return;
		if (pendingById[id]) return;
		if (String(row?.status || '').toLowerCase() === 'inactive') return;
		if (!confirm('Reset this teacher\'s password to the default password and clear the 24h lock/cooldown?')) return;

		setPendingById((prev) => ({ ...prev, [id]: true }));
		try {
			await resetTeacherPassword(id);
			toast.success('Password reset to default. Teacher must change it after login.');
		} catch (e) {
			toast.error(e?.data?.message || e?.message || 'Reset failed');
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

	const onSave = async (payload) => {
		try {
			if (editing) {
				const id = editing._id || editing.id;
				const updated = await updateTeacher(id, payload);
				const row = updated?.data || updated;
				setItems((prev) => prev.map((x) => ((x._id || x.id) === id ? { ...x, ...row } : x)));
				toast.success('Teacher updated');
			} else {
				const created = await createTeacher(payload);
				const row = created?.data || created;
				setItems((prev) => [row, ...prev]);
				toast.success('Teacher created');
			}
			setShowForm(false);
			setEditing(null);
		} catch (e) {
			const msg = e?.message || 'Save failed';
			toast.error(msg);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center">
				<h1 className="text-2xl font-semibold">Teacher Management</h1>
				{canAddTeacher && (
					<Button variant="brand" size="lg" onClick={onAdd} className="ml-auto">
						Add New Teacher
					</Button>
				)}
			</div>
			<DataToolbar
				searchSlot={<SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search teachers..." />}
				sortSlot={<SortControls currentField={sortBy} currentDir={sortDir} fields={[{ field: 'fullName', label: 'Name' }, { field: 'teacherId', label: 'ID' }, { field: 'createdAt', label: 'Created' }]} onSort={onSort} />}
				onReset={onReset}
			/>

			<TeacherTable
				items={sortedItems}
				rows={currentRows}
				isLoading={loading}
				error={error}
				sortBy={sortBy}
				sortDir={sortDir}
				onSort={onSort}
				meta={{ page, totalPages, limit, total }}
				onPage={setPage}
				onLimit={(v) => { setLimit(v); setPage(1); }}
				onView={(t) => {
					const id = t?._id || t?.id;
					if (!id) return;
					navigate(`/teachers/${id}`);
				}}
				onAssign={(t) => {
					if (!canAssignTeacher) {
						toast.error('You do not have permission to assign teachers');
						return;
					}
					setAssignTeacher(t);
					setShowAssign(true);
				}}
				onEdit={onEdit}
				onToggleStatus={onToggleStatus}
				onResetPassword={onResetPassword}
				pendingById={pendingById}
			/>

			<Modal isOpen={showForm} onClose={() => {
				setShowForm(false);
				setEditing(null);
			}} title={editing ? 'Edit Teacher' : 'Add Teacher'}>
				<TeacherForm initialValue={editing} onCancel={() => {
					setShowForm(false);
					setEditing(null);
				}} onSave={onSave} />
			</Modal>

			<TeacherAssignmentsModal key={assignTeacher?._id || assignTeacher?.id || 'teacher-assignments'} isOpen={showAssign} onClose={() => {
				setShowAssign(false);
				setAssignTeacher(null);
			}} teacher={assignTeacher || {}} />
		</div>
	);
}
