import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { listTeachers, createTeacher, updateTeacher, deleteTeacher } from '../api/modules/teachers';
import TeacherForm from '../components/teacher/TeacherForm';
import Modal from '../components/common/Modal';
import TableShell from '../components/common/table/TableShell';
import DataToolbar from '../components/common/DataToolbar/DataToolbar';
import SearchInput from '../components/common/DataToolbar/SearchInput';
import SortControls from '../components/common/DataToolbar/SortControls';
import ActionButton from '../components/common/ActionButton';
import TeacherTable from '../components/teacher/TeacherTable';
import TeacherAssignmentsModal from '../components/teacher/TeacherAssignmentsModal';
import { useAuth } from '../contexts/AuthContext';

export default function TeachersPage() {
  const { hasPermission } = useAuth();
  const canAccessTeachers =
    hasPermission('teachers', 'view') ||
    hasPermission('teachers', 'add') ||
    hasPermission('teachers', 'edit') ||
    hasPermission('teachers', 'delete') ||
    hasPermission('teachers', 'assign');
  const canAddTeacher = hasPermission('teachers', 'add');
  const canEditTeacher = hasPermission('teachers', 'edit');
  const canDeleteTeacher = hasPermission('teachers', 'delete');
  const canAssignTeacher = hasPermission('teachers', 'assign');

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
    if (!canAccessTeachers) {
      setItems([]);
      setError('You do not have permission to access teachers');
      setLoading(false);
      return;
    }
    setLoading(true); setError(null);
    listTeachers({ search })
      .then(data => setItems(Array.isArray(data) ? data : (data.items || data?.data || [])))
      .catch(() => setError('Failed to load teachers'))
      .finally(() => setLoading(false));
  }, [search, canAccessTeachers]);

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
    if (sortBy === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortDir('asc'); }
  };

  const onReset = () => {
    setSearch('');
    setSortBy('createdAt');
    setSortDir('desc');
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
  const onDelete = async (row) => {
    if (!canDeleteTeacher) {
      toast.error('You do not have permission to delete teachers');
      return;
    }
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
        {canAddTeacher ? (
          <button
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-blue-600 bg-blue-600 text-white shadow-sm text-sm hover:bg-blue-700"
            onClick={onAdd}
          >
            Add New Teacher
          </button>
        ) : null}
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
        onAssign={canAssignTeacher ? (t) => { setAssignTeacher(t); setShowAssign(true); } : undefined}
        onEdit={canEditTeacher ? onEdit : undefined}
        onDelete={canDeleteTeacher ? onDelete : undefined}
      />

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? 'Edit Teacher' : 'Add Teacher'}>
        <TeacherForm initialValue={editing} onCancel={() => { setShowForm(false); setEditing(null); }} onSave={onSave} />
      </Modal>

      <TeacherAssignmentsModal
        isOpen={showAssign}
        onClose={() => { setShowAssign(false); setAssignTeacher(null); }}
        teacher={assignTeacher || {}}
        canAssign={canAssignTeacher}
      />
    </div>
  );
}