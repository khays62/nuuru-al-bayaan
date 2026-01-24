import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

import { createTeacher, deleteTeacher, listTeachers, updateTeacher } from '../api/teachersApi';

import Modal from '../../../shared/components/ui/Modal.jsx';
import DataToolbar from '../../../shared/components/DataToolbar/DataToolbar.jsx';
import SearchInput from '../../../shared/components/DataToolbar/SearchInput.jsx';
import SortControls from '../../../shared/components/DataToolbar/SortControls.jsx';
import Button from '../../../shared/components/ui/Button.jsx';

import TeacherForm from '../components/TeacherForm';
import TeacherTable from '../components/TeacherTable';
import TeacherAssignmentsModal from '../components/TeacherAssignmentsModal';

export default function TeachersPage() {
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

	useEffect(() => {
		setLoading(true);
		setError(null);
		listTeachers({ search })
			.then((data) => setItems(Array.isArray(data) ? data : (data.items || data?.data || [])))
			.catch(() => setError('Failed to load teachers'))
			.finally(() => setLoading(false));
	}, [search]);

	const sortedItems = React.useMemo(() => {
		const arr = [...items];
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
	}, [items, sortBy, sortDir]);

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
	};

	const onAdd = () => {
		setEditing(null);
		setShowForm(true);
	};
	const onEdit = (row) => {
		setEditing(row);
		setShowForm(true);
	};
	const onDelete = async (row) => {
		if (!confirm('Delete this teacher?')) return;
		try {
			await deleteTeacher(row._id || row.id);
			setItems((prev) => prev.filter((x) => (x._id || x.id) !== (row._id || row.id)));
			toast.success('Teacher deleted');
		} catch (e) {
			const msg = e?.message || 'Delete failed';
			toast.error(msg);
		}
	};

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
				<Button variant="brand" size="lg" onClick={onAdd} className="ml-auto">
					Add New Teacher
				</Button>
			</div>
			<DataToolbar
				searchSlot={<SearchInput value={search} onChange={setSearch} placeholder="Search teachers..." />}
				sortSlot={<SortControls currentField={sortBy} currentDir={sortDir} fields={[{ field: 'fullName', label: 'Name' }, { field: 'teacherId', label: 'ID' }, { field: 'createdAt', label: 'Created' }]} onSort={onSort} />}
				onReset={onReset}
			/>
			<TeacherTable
				items={sortedItems}
				loading={loading}
				error={error}
				sortBy={sortBy}
				sortDir={sortDir}
				onSort={onSort}
				onAssign={(t) => {
					setAssignTeacher(t);
					setShowAssign(true);
				}}
				onEdit={onEdit}
				onDelete={onDelete}
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

			<TeacherAssignmentsModal isOpen={showAssign} onClose={() => {
				setShowAssign(false);
				setAssignTeacher(null);
			}} teacher={assignTeacher || {}} />
		</div>
	);
}
