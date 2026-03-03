import React, { useMemo, useState, useEffect } from 'react';
import SearchInput from '../../../shared/components/DataToolbar/SearchInput.jsx';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import FilterDropdownSelect from '../../../shared/components/DataToolbar/FilterDropdownSelect.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import { Plus, Printer, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useEntityList } from '../../../hooks/useEntityList';
import { listCohorts, createCohort, updateCohort, deleteCohort, archiveCohort, activateCohort } from '../api/cohorts';
import { getAcademicYears } from '../../lookups/api/lookups';
import { useClientSort } from '../../../shared/hooks/useClientSort';
import Button from '../../../shared/components/ui/Button.jsx';
import Card from '../../../shared/components/ui/Card.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import PdfDownloadButton from '../../../shared/components/exports/downloadButtons/PdfDownloadButton.jsx';
import ExcelDownloadButton from '../../../shared/components/exports/downloadButtons/ExcelDownloadButton.jsx';
import CsvDownloadButton from '../../../shared/components/exports/downloadButtons/CsvDownloadButton.jsx';
import CopyTableButton from '../../../shared/components/exports/downloadButtons/CopyTableButton.jsx';
import PrintHeader from '../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../shared/components/print/PrintFooter.jsx';
import CohortForm from '../components/CohortForm.jsx';
import CohortTable from '../components/CohortTable.jsx';
import { cohortsKeys } from '../queryKeys';
import { useCohortsRealtimeInvalidation } from '../useCohortsRealtimeInvalidation';
import { useAuth } from '../../../auth/AuthContext';
import headerImg from '../../../assets/nuuruBayaanHeader.png';
import { useI18n } from '../../../i18n/useI18n';

export default function CohortsPage() {
  const { t } = useI18n();
  useCohortsRealtimeInvalidation();
  const { auth, hasPermission } = useAuth();
  const roleLower = String(auth?.user?.role || '').toLowerCase();
  const isAdmin = roleLower === 'admin';
  const canView = isAdmin || hasPermission('cohorts', 'view');

  const [statusFilter, setStatusFilter] = useState('');
  const [ayFilter, setAyFilter] = useState('');
  const [ayOptions, setAyOptions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    (async () => {
      const items = await getAcademicYears();
      const opts = (items || []).map(ay => ({ value: ay._id, label: ay.yearName || ay.name || t('common.filters.academicYearShort', { defaultValue: 'AY' }) }));
      setAyOptions(opts);
    })();
  }, [t]);

  const fetchFn = async (params) => {
    const { search, page, limit, sortBy, sortDir, status, startAcademicYear } = params;
    const res = await listCohorts({ q: search, page, limit, sortBy: sortBy || 'createdAt', sortDir: sortDir || 'desc', status, startAcademicYear });
    // Normalized output consumed by hook
    return { data: res.data, meta: res.meta };
  };

  const {
    items, meta, isLoading, error,
    searchTerm, setSearch, setFilter, setPage, setLimit, refresh, resetAndReload
  } = useEntityList({
    fetchFn,
    initialSortBy: 'createdAt',
    initialSortDir: 'desc',
    initialLimit: 10,
    persistKey: 'cohorts',
    extraFilters: { status: statusFilter || undefined, startAcademicYear: ayFilter || undefined },
    queryKeyBase: cohortsKeys.listBase(),
  });

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
    if (!ok) return toast.error(err || t('common.errors.failedToCreate', { defaultValue: 'Failed to create' }));
    toast.success(t('cohorts.toasts.created', { defaultValue: 'Cohort created' }));
    setShowModal(false);
    setEditing(null);
    await refresh();
  };
  const handleUpdate = async (id, payload) => {
    const { ok, error: err } = await updateCohort(id, payload);
    if (!ok) return toast.error(err || t('common.errors.failedToUpdate', { defaultValue: 'Failed to update' }));
    toast.success(t('cohorts.toasts.updated', { defaultValue: 'Cohort updated' }));
    setShowModal(false);
    setEditing(null);
    await refresh();
  };
  const handleDelete = async (id) => {
    if (!confirm(t('cohorts.confirms.delete', { defaultValue: 'Delete this cohort? This is only allowed if not in use.' }))) return;
    const { ok, error: err } = await deleteCohort(id);
    if (!ok) return toast.error(err || t('common.errors.failedToDelete', { defaultValue: 'Failed to delete' }));
    toast.success(t('cohorts.toasts.deleted', { defaultValue: 'Cohort deleted' }));
    await refresh();
  };
  const handleArchive = async (id) => {
    const { ok, error: err } = await archiveCohort(id);
    if (!ok) return toast.error(err || t('common.errors.somethingWentWrong', { defaultValue: 'Something went wrong.' }));
    toast.success(t('cohorts.toasts.archived', { defaultValue: 'Archived' }));
    await refresh();
  };
  const handleActivate = async (id) => {
    const { ok, error: err } = await activateCohort(id);
    if (!ok) return toast.error(err || t('common.errors.somethingWentWrong', { defaultValue: 'Something went wrong.' }));
    toast.success(t('cohorts.toasts.activated', { defaultValue: 'Activated' }));
    await refresh();
  };

  const statuses = useMemo(
    () => ([
      { value: 'active', label: t('common.status.active', { defaultValue: 'Active' }) },
      { value: 'archived', label: t('cohorts.status.archived', { defaultValue: 'Archived' }) },
    ]),
    [t]
  );
  const isPageLoading = Boolean(isLoading);
  const canExport = Boolean(canView && !isPageLoading && Array.isArray(sortedItemsForView) && sortedItemsForView.length > 0);

  const handlePrint = () => {
    if (!canView) {
      toast.error(t('cohorts.permissions.noExport', { defaultValue: 'You do not have permission to export/print cohorts' }));
      return;
    }
    setTimeout(() => window.print(), 0);
  };

  const buildExportPayload = async () => {
    if (!canExport) return null;

    // Export should match the currently visible table columns (and exclude action buttons).
    const STORAGE_KEY = 'cohorts:columns:v1';
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
      isVisible('name') ? { key: 'name', label: t('cohorts.table.columns.name', { defaultValue: 'Name' }) } : null,
      isVisible('status') ? { key: 'status', label: t('common.filters.status', { defaultValue: 'Status' }) } : null,
      isVisible('startAy') ? { key: 'startAy', label: t('cohorts.table.columns.startAy', { defaultValue: 'AY (Start)' }) } : null,
      isVisible('createdAt') ? { key: 'createdAt', label: t('common.table.created', { defaultValue: 'Created' }) } : null,
    ].filter(Boolean);

    const headers = cols.map((c) => c.label);
    const rows = (sortedItemsForView || []).map((c) => cols.map((col) => {
      switch (col.key) {
        case 'name':
          return c?.name || '';
        case 'status':
          return c?.status || '';
        case 'startAy':
          return c?.startAcademicYear?.yearName || c?.startAcademicYearName || '';
        case 'createdAt':
          return c?.createdAt ? new Date(c.createdAt).toLocaleDateString() : '';
        default:
          return '';
      }
    }));

    return {
      filename: 'cohorts',
      title: t('modules.cohorts', { defaultValue: 'Cohorts' }),
      subtitle: t('common.export.subtitle', {
        defaultValue: 'Total: {{count}} â€¢ Generated: {{date}}',
        count: sortedItemsForView.length,
        date: new Date().toLocaleString(),
      }),
      headerImageSrc: headerImg,
      headers,
      rows,
    };
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 no-print">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full lg:max-w-lg">
              <SearchInput
                value={searchTerm}
                onChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                placeholder={t('cohorts.searchPlaceholder', { defaultValue: 'Search cohorts...' })}
              />
            </div>
            <div className="w-full lg:max-w-2xl">
              <FilterRow align="end">
                <FilterItem grow minWidthClass="min-w-32.5">
                  <FilterDropdownSelect
                    value={statusFilter}
                    onChange={(v) => {
                      setStatusFilter(v);
                      setFilter('status', v || undefined);
                      setPage(1);
                    }}
                    options={statuses}
                    placeholder={t('common.filters.status', { defaultValue: 'Status' })}
                  />
                </FilterItem>

                <FilterItem grow minWidthClass="min-w-37.5">
                  <FilterDropdownSelect
                    value={ayFilter}
                    onChange={(v) => {
                      setAyFilter(v);
                      setFilter('startAcademicYear', v || undefined);
                      setPage(1);
                    }}
                    options={ayOptions}
                    placeholder={t('cohorts.filters.startAy', { defaultValue: 'Start AY' })}
                    searchable
                    maxVisible={5}
                    searchPlaceholder={t('common.searchPlaceholders.academicYears', { defaultValue: 'Search academic yearsâ€¦' })}
                  />
                </FilterItem>

              </FilterRow>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-auto">
              <Button
                variant="brand"
                size="lg"
                className="w-full sm:w-auto justify-center"
                onClick={() => {
                  setEditing(null);
                  setShowModal(true);
                }}
                icon={<Plus size={20} />}
              >
                {t('cohorts.actions.add', { defaultValue: 'Add Cohort' })}
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <ActionButton
                variant="outline"
                icon={<Printer size={16} />}
                disabled={!canExport}
                onClick={handlePrint}
                title={t('common.actions.print', { defaultValue: 'Print' })}
              >
                {t('common.actions.print', { defaultValue: 'Print' })}
              </ActionButton>
              <PdfDownloadButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
              <ExcelDownloadButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
              <CsvDownloadButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
              <CopyTableButton getPayload={buildExportPayload} disabled={!canExport} variant="outline" />
              <ActionButton
                variant="outline"
                icon={<RotateCcw size={16} />}
                onClick={() => {
                  setStatusFilter('');
                  setAyFilter('');
                  resetAndReload({ filters: { status: undefined, startAcademicYear: undefined }, search: '' });
                }}
              >
                {t('common.actions.reset', { defaultValue: 'Reset' })}
              </ActionButton>
            </div>
          </div>
        </div>
      </Card>

      <div className="with-print-header with-print-footer">
        <PrintHeader />

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

        <PrintFooter />
      </div>

      <Modal
        isOpen={showModal}
        onClose={()=>{ setShowModal(false); setEditing(null); }}
        title={editing ? t('cohorts.modal.editTitle', { defaultValue: 'Edit Cohort' }) : t('cohorts.modal.addTitle', { defaultValue: 'Add Cohort' })}
      >
        <CohortForm
          initial={editing || {}}
          onCancel={()=>{ setShowModal(false); setEditing(null); }}
          onSubmit={(payload)=> editing ? handleUpdate(editing._id, payload) : handleCreate(payload)}
        />
      </Modal>
    </div>
  );
}
