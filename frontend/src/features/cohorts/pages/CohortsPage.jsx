import React, { useMemo, useState, useEffect } from 'react';
import DataToolbar from '../../../shared/components/DataToolbar/DataToolbar.jsx';
import SearchInput from '../../../shared/components/DataToolbar/SearchInput.jsx';
import SortControls from '../../../shared/components/DataToolbar/SortControls.jsx';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import FilterDropdownSelect from '../../../shared/components/DataToolbar/FilterDropdownSelect.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import { Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useEntityList } from '../../../hooks/useEntityList';
import { listCohorts, createCohort, updateCohort, deleteCohort, archiveCohort, activateCohort } from '../api/cohorts';
import { getAcademicYears } from '../../lookups/api/lookups';
import { useClientSort } from '../../../shared/hooks/useClientSort';
import Button from '../../../shared/components/ui/Button.jsx';
import CohortForm from '../components/CohortForm.jsx';
import CohortTable from '../components/CohortTable.jsx';

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

      <CohortTable
        isLoading={isLoading}
        error={error}
        items={items}
        rows={sortedItemsForView}
        meta={meta}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        onRetry={refresh}
        onEmptyAction={() => {
          setEditing(null);
          setShowModal(true);
        }}
        onEdit={(row) => {
          setEditing(row);
          setShowModal(true);
        }}
        onArchive={(row) => handleArchive(row._id)}
        onActivate={(row) => handleActivate(row._id)}
        onDelete={(row) => handleDelete(row._id)}
        onPage={setPage}
        onLimit={(v) => {
          setLimit(v);
          setPage(1);
        }}
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
