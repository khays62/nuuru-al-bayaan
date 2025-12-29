import React, { useMemo, useState, useEffect } from 'react';
import DataToolbar from '../components/common/DataToolbar/DataToolbar';
import SearchInput from '../components/common/DataToolbar/SearchInput';
import FilterSelect from '../components/common/DataToolbar/FilterSelect';
import SortControls from '../components/common/DataToolbar/SortControls';
import PaginationControls from '../components/common/Pagination/PaginationControls';
import ActionButton from '../components/common/ActionButton';
import Modal from '../components/common/Modal';
import { Plus, Edit, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useEntityList } from '../hooks/useEntityList';
import { listCohorts, createCohort, updateCohort, deleteCohort, archiveCohort, activateCohort } from '../api';
import { getAcademicYears } from '../api';
import LoadingState from '../components/common/Feedback/LoadingState';
import EmptyState from '../components/common/Feedback/EmptyState';
import TableShell from '../components/common/table/TableShell';
import { useAuth } from '../contexts/AuthContext';

function CohortForm({ initial = {}, onSubmit, onCancel }) {
  const [name, setName] = useState(initial.name || '');
  const [startAY, setStartAY] = useState(() => {
    const v = initial.startAcademicYear;
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v._id) return v._id;
    return '';
  });
  const [status, setStatus] = useState(initial.status || 'active');
  const [ays, setAys] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const items = await getAcademicYears();
      const opts = (items || []).map(ay => ({ value: ay._id, label: ay.yearName || ay.name || 'AY' }));
      setAys(opts);
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !startAY) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ name, startAcademicYear: startAY, status });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input value={name} onChange={(e)=>setName(e.target.value)} required className="w-full border rounded px-3 py-2 bg-white disabled:opacity-60" placeholder="e.g. Dufcada 1aad" disabled={submitting} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Start Academic Year</label>
          <select value={startAY} onChange={(e)=>setStartAY(e.target.value)} className="w-full border rounded px-3 py-2 bg-white disabled:opacity-60" required disabled={submitting}>
            <option value="" disabled>Select Academic Year</option>
            {ays.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select value={status} onChange={(e)=>setStatus(e.target.value)} className="w-full border rounded px-3 py-2 bg-white disabled:opacity-60" disabled={submitting}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded border bg-slate-50" disabled={submitting}>Cancel</button>
        <button type="submit" className="px-3 py-2 rounded border bg-blue-600 text-white disabled:opacity-60" disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function CohortsPage() {
  const { hasPermission } = useAuth();
  const canAdd = hasPermission('cohorts', 'add');
  const canEdit = hasPermission('cohorts', 'edit');
  const canDelete = hasPermission('cohorts', 'delete');

  const [statusFilter, setStatusFilter] = useState('');
  const [ayFilter, setAyFilter] = useState('');
  const [ayOptions, setAyOptions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    (async () => {
      const items = await getAcademicYears();
      const opts = (items || []).map(ay => ({ value: ay._id, label: ay.yearName || ay.name || 'AY' }));
      setAyOptions(opts);
    })();
  }, []);

  const fetchFn = async (params) => {
    const { search, page, limit, sortBy, sortDir, status, startAcademicYear } = params;
    const res = await listCohorts({ q: search, page, limit, sortBy: sortBy || 'createdAt', sortDir: sortDir || 'desc', status, startAcademicYear });
    // Normalized output consumed by hook
    return { data: res.data, meta: res.meta };
  };

  const {
    items, meta, isLoading, error,
    searchTerm, setSearch, setFilter, setPage, setLimit, toggleSort, refresh, resetAndReload
  } = useEntityList({ fetchFn, initialSortBy: 'createdAt', initialSortDir: 'desc', initialLimit: 10, persistKey: 'cohorts', extraFilters: { status: statusFilter || undefined, startAcademicYear: ayFilter || undefined } });

  const handleCreate = async (payload) => {
    const { ok, error: err } = await createCohort(payload);
    if (!ok) return toast.error(err || 'Failed to create');
    toast.success('Cohort created');
    setShowModal(false);
    setEditing(null);
    await refresh();
  };
  const handleUpdate = async (id, payload) => {
    const { ok, error: err } = await updateCohort(id, payload);
    if (!ok) return toast.error(err || 'Failed to update');
    toast.success('Cohort updated');
    setShowModal(false);
    setEditing(null);
    await refresh();
  };
  const handleDelete = async (id) => {
    if (!confirm('Delete this cohort? This is only allowed if not in use.')) return;
    const { ok, error: err } = await deleteCohort(id);
    if (!ok) return toast.error(err || 'Failed to delete');
    toast.success('Cohort deleted');
    await refresh();
  };
  const handleArchive = async (id) => { const { ok, error: err } = await archiveCohort(id); if (!ok) return toast.error(err || 'Failed'); toast.success('Archived'); await refresh(); };
  const handleActivate = async (id) => { const { ok, error: err } = await activateCohort(id); if (!ok) return toast.error(err || 'Failed'); toast.success('Activated'); await refresh(); };

  const statuses = useMemo(() => ([{ value: 'active', label: 'Active' }, { value: 'archived', label: 'Archived' }]), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cohort Management</h1>
          <p className="mt-1 text-sm text-gray-600">Manage student cohorts (dufcado) by start academic year and status.</p>
        </div>
        <div>
          <button
            onClick={()=>{ if (!canAdd) return; setEditing(null); setShowModal(true); }}
            disabled={!canAdd}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Cohort
          </button>
        </div>
      </div>

      <DataToolbar
        showReset={false}
        searchSlot={<SearchInput value={searchTerm} onChange={setSearch} placeholder="Search cohorts..." />}
        filtersSlot={<div className="flex flex-row flex-wrap gap-2 w-full items-center">
          <FilterSelect value={statusFilter} onChange={(v)=>{ setStatusFilter(v); setFilter('status', v || undefined); }} options={statuses} placeholder="Status" className="flex-1 min-w-[130px]" />
          <FilterSelect value={ayFilter} onChange={(v)=>{ setAyFilter(v); setFilter('startAcademicYear', v || undefined); }} options={ayOptions} placeholder="Start AY" className="flex-1 min-w-[150px]" />
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <SortControls currentField={meta.sortBy} currentDir={meta.sortDir} onSort={toggleSort} fields={[{ field: 'createdAt', label: 'Created' }, { field: 'startAcademicYear', label: 'Start AY' }]} />
            <button
              type="button"
              onClick={() => { setStatusFilter(''); setAyFilter(''); resetAndReload({ filters: { status: undefined, startAcademicYear: undefined }, search: '' }); }}
              className="px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-md border text-sm"
            >Reset</button>
          </div>
        </div>}
      />

      {isLoading ? (
        <LoadingState variant="table" message="Loading..." rows={6} columns={5} />
      ) : error ? (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded">
          {error} <button onClick={refresh} className="underline ml-2">Retry</button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No cohorts found"
          description="Try adjusting filters or create a new cohort."
          actionLabel="Add Cohort"
          onAction={()=>{ if (!canAdd) return; setEditing(null); setShowModal(true); }}
        />
      ) : (
        <>
          <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
            <div>
              Page {meta.page} of {meta.totalPages || meta.pages || 1} — {meta.total} total
            </div>
          </div>
          <TableShell>
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">AY (Start)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(row => (
                <tr key={row._id} className="odd:bg-white even:bg-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700 border-x border-gray-200 font-medium">{row.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700 border-x border-gray-200">
                    <span className={`text-xs px-2 py-1 rounded ${row.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{row.status}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700 border-x border-gray-200">{row.startAcademicYear?.yearName || row.startAcademicYearName || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700 border-x border-gray-200">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right font-medium space-x-2 border-x border-gray-200">
                    <ActionButton title="Edit" icon={<Edit size={16}/>} onClick={()=>{ if (!canEdit) return; setEditing(row); setShowModal(true); }} disabled={!canEdit} />
                    {row.status === 'active' ? (
                      <ActionButton title="Archive" icon={<Archive size={16}/>} onClick={()=>{ if (!canEdit) return; handleArchive(row._id); }} disabled={!canEdit} />
                    ) : (
                      <ActionButton title="Activate" icon={<ArchiveRestore size={16}/>} onClick={()=>{ if (!canEdit) return; handleActivate(row._id); }} disabled={!canEdit} />
                    )}
                    <ActionButton variant="danger" title="Delete" icon={<Trash2 size={16}/>} onClick={()=>{ if (!canDelete) return; handleDelete(row._id); }} disabled={!canDelete} />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <PaginationControls
            page={meta.page}
            totalPages={meta.totalPages || meta.pages || 1}
            limit={meta.limit}
            onPage={setPage}
            onLimit={setLimit}
          />
        </>
      )}

      <Modal isOpen={showModal} onClose={()=>{ setShowModal(false); setEditing(null); }} title={editing ? 'Edit Cohort' : 'Add Cohort'}>
        <CohortForm
          initial={editing || {}}
          onCancel={()=>{ setShowModal(false); setEditing(null); }}
          onSubmit={(payload)=> editing ? handleUpdate(editing._id, payload) : handleCreate(payload)}
        />
      </Modal>
    </div>
  );
}
