import React, { useMemo, useState, useEffect } from 'react';
import DataToolbar from '../../../shared/components/DataToolbar/DataToolbar.jsx';
import SearchInput from '../../../shared/components/DataToolbar/SearchInput.jsx';
import SortControls from '../../../shared/components/DataToolbar/SortControls.jsx';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import FilterDropdownSelect from '../../../shared/components/DataToolbar/FilterDropdownSelect.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import { Plus, Edit, Trash2, Archive, ArchiveRestore } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useEntityList } from '../../../hooks/useEntityList';
import { listCohorts, createCohort, updateCohort, deleteCohort, archiveCohort, activateCohort } from '../api/cohorts';
import { getAcademicYears } from '../../lookups/api/lookups';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import { useClientSort } from '../../../shared/hooks/useClientSort';
import Button from '../../../shared/components/ui/Button.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Select from '../../../shared/components/ui/Select.jsx';

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
        <Input
          value={name}
          onChange={(e)=>setName(e.target.value)}
          required
          placeholder="e.g. Dufcada 1aad"
          disabled={submitting}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Start Academic Year</label>
          <Select
            value={startAY}
            onChange={(e)=>setStartAY(e.target.value)}
            required
            disabled={submitting}
          >
            <option value="" disabled>Select Academic Year</option>
            {ays.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <Select
            value={status}
            onChange={(e)=>setStatus(e.target.value)}
            disabled={submitting}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="neutral" onClick={onCancel} disabled={submitting}>Cancel</Button>
        <Button type="submit" variant="brand" disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  );
}

export default function CohortsPage() {
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
    searchTerm, setSearch, setFilter, setPage, setLimit, refresh, resetAndReload
  } = useEntityList({ fetchFn, initialSortBy: 'createdAt', initialSortDir: 'desc', initialLimit: 10, persistKey: 'cohorts', extraFilters: { status: statusFilter || undefined, startAcademicYear: ayFilter || undefined } });

  const {
    sortBy,
    sortDir,
    onSort,
    sortedRows: sortedItemsForView,
  } = useClientSort(items, {
    initialSortBy: 'createdAt',
    initialSortDir: 'desc',
    getValue: (row, field) => {
      switch (field) {
        case 'name':
          return String(row?.name || '').toLowerCase();
        case 'status':
          return String(row?.status || '').toLowerCase();
        case 'startAcademicYear': {
          const v = row?.startAcademicYear;
          return String(v?.yearName || v?.name || row?.startAcademicYearName || '').toLowerCase();
        }
        case 'createdAt':
        default:
          return new Date(row?.createdAt || 0).getTime();
      }
    },
  });

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
          <Button
            variant="brand"
            onClick={()=>{ setEditing(null); setShowModal(true); }}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Cohort
          </Button>
        </div>
      </div>

      <DataToolbar
        showReset={false}
        searchSlot={<SearchInput value={searchTerm} onChange={setSearch} placeholder="Search cohorts..." />}
        filtersSlot={
          <FilterRow>
            <FilterItem grow minWidthClass="min-w-32.5">
              <FilterDropdownSelect
                value={statusFilter}
                onChange={(v)=>{ setStatusFilter(v); setFilter('status', v || undefined); }}
                options={statuses}
                placeholder="Status"
              />
            </FilterItem>

            <FilterItem grow minWidthClass="min-w-37.5">
              <FilterDropdownSelect
                value={ayFilter}
                onChange={(v)=>{ setAyFilter(v); setFilter('startAcademicYear', v || undefined); }}
                options={ayOptions}
                placeholder="Start AY"
                searchable
                maxVisible={5}
                searchPlaceholder="Search academic years…"
              />
            </FilterItem>

            <FilterItem className="sm:ml-auto">
              <div className="flex items-center gap-2 flex-wrap">
                <SortControls currentField={sortBy} currentDir={sortDir} onSort={onSort} fields={[{ field: 'createdAt', label: 'Created' }, { field: 'startAcademicYear', label: 'Start AY' }]} />
                <Button
                  type="button"
                  variant="neutral"
                  onClick={() => { setStatusFilter(''); setAyFilter(''); resetAndReload({ filters: { status: undefined, startAcademicYear: undefined }, search: '' }); }}
                >
                  Reset
                </Button>
              </div>
            </FilterItem>
          </FilterRow>
        }
      />

      <StandardTable
        isLoading={isLoading}
        error={error}
        items={items}
        loadingMessage="Loading..."
        loadingVariant="table"
        loadingRows={6}
        loadingColumns={5}
        emptyTitle="No cohorts found"
        emptyDescription="Try adjusting filters or create a new cohort."
        emptyActionLabel="Add Cohort"
        onEmptyAction={() => { setEditing(null); setShowModal(true); }}
        onRetry={refresh}
        topSlot={
          <div className="flex justify-between items-center mb-2 text-sm text-gray-600">
            <div>
              Page {meta.page} of {meta.totalPages || meta.pages || 1} — {meta.total} total
            </div>
          </div>
        }
        rows={sortedItemsForView}
        storageKey="cohorts:columns:v1"
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        controlsProps={{
          limit: meta.limit,
          total: meta.total,
          onLimit: (v) => { setLimit(v); setPage(1); },
        }}
        columns={[
          { key: 'name', label: 'Name', sortable: true, field: 'name', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-x border-gray-200' },
          { key: 'status', label: 'Status', sortable: true, field: 'status' },
          { key: 'startAy', label: 'AY (Start)', sortable: true, field: 'startAcademicYear' },
          { key: 'createdAt', label: 'Created', sortable: true, field: 'createdAt' },
          { key: 'actions', label: 'Actions', align: 'right', noPrint: true, tdClassName: 'px-6 py-4 whitespace-nowrap text-right font-medium space-x-2 border-x border-gray-200 no-print' },
        ]}
        getRowKey={(row) => row._id}
        renderCell={(row, col) => {
          switch (col.key) {
            case 'name':
              return row.name;
            case 'status':
              return (
                <span className={`text-xs px-2 py-1 rounded ${row.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                  {row.status}
                </span>
              );
            case 'startAy':
              return row.startAcademicYear?.yearName || row.startAcademicYearName || '-';
            case 'createdAt':
              return row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-';
            case 'actions':
              return (
                <>
                  <ActionButton title="Edit" icon={<Edit size={16} />} onClick={() => { setEditing(row); setShowModal(true); }} />
                  {row.status === 'active' ? (
                    <ActionButton title="Archive" icon={<Archive size={16} />} onClick={() => handleArchive(row._id)} />
                  ) : (
                    <ActionButton title="Activate" icon={<ArchiveRestore size={16} />} onClick={() => handleActivate(row._id)} />
                  )}
                  <ActionButton variant="danger" title="Delete" icon={<Trash2 size={16} />} onClick={() => handleDelete(row._id)} />
                </>
              );
            default:
              return '';
          }
        }}
        meta={meta}
        onPage={setPage}
        onLimit={(v) => { setLimit(v); setPage(1); }}
        showRowsSelector={false}
      />

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
