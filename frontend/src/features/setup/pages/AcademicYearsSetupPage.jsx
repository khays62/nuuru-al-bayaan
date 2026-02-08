import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, RotateCcw, Printer } from 'lucide-react';
import { toast } from 'react-hot-toast';

import ListPageShell from '../../../shared/components/ui/ListPageShell.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Card from '../../../shared/components/ui/Card.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import SearchInput from '../../../shared/components/DataToolbar/SearchInput.jsx';
import PdfDownloadButton from '../../../shared/components/exports/downloadButtons/PdfDownloadButton.jsx';
import ExcelDownloadButton from '../../../shared/components/exports/downloadButtons/ExcelDownloadButton.jsx';
import CsvDownloadButton from '../../../shared/components/exports/downloadButtons/CsvDownloadButton.jsx';
import CopyTableButton from '../../../shared/components/exports/downloadButtons/CopyTableButton.jsx';
import headerImg from '../../../assets/nuuruBayaanHeader.png';
import PrintHeader from '../../../shared/components/print/PrintHeader.jsx';
import PrintFooter from '../../../shared/components/print/PrintFooter.jsx';

import AcademicYearSetupForm from '../components/AcademicYearSetupForm.jsx';

import { setupKeys } from '../queryKeys.js';
import {
  listSetupAcademicYears,
  createSetupAcademicYear,
  updateSetupAcademicYear,
  deleteSetupAcademicYear,
} from '../api/setup.js';

export default function AcademicYearsSetupPage() {
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('yearName');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const query = useQuery({
    queryKey: setupKeys.academicYears(),
    queryFn: listSetupAcademicYears,
  });

  const years = useMemo(() => {
    const raw = query.data?.academicYears;
    return Array.isArray(raw) ? raw : [];
  }, [query.data]);

  const filtered = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return years;
    return years.filter((y) => String(y?.yearName || '').toLowerCase().includes(q));
  }, [years, search]);

  const sorted = useMemo(() => {
    const dir = String(sortDir || '').toLowerCase() === 'asc' ? 1 : -1;
    const by = String(sortBy || 'yearName');
    const copy = [...filtered];
    copy.sort((a, b) => {
      if (by === 'yearName') {
        return String(a?.yearName || '').localeCompare(String(b?.yearName || ''), undefined, { sensitivity: 'base' }) * dir;
      }
      if (by === 'updatedAt') {
        const at = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bt = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return (at - bt) * dir;
      }
      return 0;
    });
    return copy;
  }, [filtered, sortBy, sortDir]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sorted.length / Math.max(1, limit))),
    [sorted.length, limit]
  );

  const currentRows = useMemo(() => {
    const lim = Math.max(1, Number(limit) || 20);
    const p = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const start = (p - 1) * lim;
    return sorted.slice(start, start + lim);
  }, [sorted, page, limit, totalPages]);

  const createMut = useMutation({
    mutationFn: createSetupAcademicYear,
    onSuccess: async () => {
      toast.success('Academic year created');
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: setupKeys.academicYears() });
    },
    onError: (e) => toast.error(String(e?.data?.message || e?.data?.error || e?.message || 'Failed to create')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => updateSetupAcademicYear(id, payload),
    onSuccess: async () => {
      toast.success('Academic year updated');
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: setupKeys.academicYears() });
    },
    onError: (e) => toast.error(String(e?.data?.message || e?.data?.error || e?.message || 'Failed to update')),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteSetupAcademicYear(id),
    onSuccess: async () => {
      toast.success('Academic year deleted');
      await qc.invalidateQueries({ queryKey: setupKeys.academicYears() });
    },
    onError: (e) => {
      const data = e?.data;
      if (data?.inUse) {
        const refs = data?.refs || {};
        const parts = [];
        if ((refs.enrollments ?? 0) > 0) parts.push(`Enrollments: ${refs.enrollments}`);
        if ((refs.exams ?? 0) > 0) parts.push(`Exams: ${refs.exams}`);
        if ((refs.lessonPlans ?? 0) > 0) parts.push(`Lesson Plans: ${refs.lessonPlans}`);
        if ((refs.cohorts ?? 0) > 0) parts.push(`Cohorts: ${refs.cohorts}`);
        if ((refs.teachers ?? 0) > 0) parts.push(`Teachers: ${refs.teachers}`);
        const suffix = parts.length ? ` (${parts.join(', ')})` : '';
        toast.error(`Cannot delete: Academic year is in use${suffix}`);
        return;
      }
      const msg = data?.error || data?.message || e?.message || 'Failed to delete';
      toast.error(String(msg));
    },
  });

  const columns = useMemo(
    () => [
      { key: 'yearName', label: 'Academic Year', sortable: true, field: 'yearName', tdClassName: 'px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200' },
      { key: 'updatedAt', label: 'Updated', sortable: true, field: 'updatedAt', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200' },
      { key: 'actions', label: 'Actions', align: 'right', noPrint: true, locked: false, tdClassName: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium border-x border-gray-200 no-print' },
    ],
    []
  );

  const onAdd = () => {
    setEditing(null);
    setOpen(true);
  };

  const onEdit = (row) => {
    setEditing(row);
    setOpen(true);
  };

  const onDelete = async (row) => {
    if (!row?._id) return;
    if (!window.confirm('Delete this academic year? This is only allowed if not in use.')) return;
    deleteMut.mutate(row._id);
  };

  const outlineBtn = '!bg-white !text-blue-700 !border-blue-400 hover:!bg-blue-50';
  const isLoading = Boolean(query.isLoading && query.data == null);
  const canExport = Boolean(!isLoading && Array.isArray(sorted) && sorted.length > 0);
  const buildExportPayload = async () => {
    if (!canExport) return null;

    // Export should match the currently visible table columns (excluding actions).
    const STORAGE_KEY = 'setup:academicYears:columns:v1';
    let visible = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') visible = parsed;
      }
    } catch { /* ignore */ }
    const isVisible = (key) => visible?.[String(key)] !== false;

    const dtf = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
    const cols = [
      { key: 'yearName', label: 'Academic Year', get: (y) => y?.yearName || '' },
      { key: 'updatedAt', label: 'Updated', get: (y) => (y?.updatedAt ? dtf.format(new Date(y.updatedAt)) : '') },
      // actions are UI-only; never export
    ].filter((c) => isVisible(c.key));

    const headers = cols.map((c) => c.label);
    const rows = (sorted || []).map((y) => cols.map((c) => c.get(y)));

    return {
      filename: 'setup-academic-years.pdf',
      sheetName: 'AcademicYears',
      title: '',
      subtitle: `Total: ${sorted.length} • Generated: ${new Date().toLocaleString()}`,
      headerImageSrc: headerImg,
      headers,
      rows,
    };
  };

  const handlePrint = () => {
    if (!canExport) return;
    setTimeout(() => window.print(), 0);
  };

  const onSort = (field) => {
    const nextField = String(field || '');
    if (!nextField) return;
    setPage(1);
    setSortDir((prevDir) => {
      const prevField = String(sortBy || '');
      if (prevField !== nextField) {
        setSortBy(nextField);
        return 'asc';
      }
      return String(prevDir || '').toLowerCase() === 'asc' ? 'desc' : 'asc';
    });
    setSortBy((prev) => (String(prev || '') === nextField ? prev : nextField));
  };

  const onReset = () => {
    setSearch('');
    setSortBy('yearName');
    setSortDir('desc');
    setPage(1);
    setLimit(20);
  };

  return (
    <ListPageShell
      title={null}
      actions={null}
      toolbar={(
        <Card className="p-4 no-print">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="w-full lg:max-w-lg">
                <SearchInput
                  value={search}
                  onChange={(v) => {
                    setSearch(v);
                    setPage(1);
                  }}
                  placeholder="Search academic years..."
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full sm:w-auto">
                <Button
                  variant="brand"
                  size="lg"
                  className="w-full sm:w-auto justify-center"
                  onClick={onAdd}
                  icon={<Plus size={20} />}
                >
                  Add Academic Year
                </Button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <ActionButton
                  variant="brand"
                  className={outlineBtn}
                  icon={<Printer size={16} />}
                  disabled={!canExport}
                  onClick={handlePrint}
                  title="Print"
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
                  icon={<RotateCcw size={16} />}
                  onClick={onReset}
                >
                  Reset
                </ActionButton>
              </div>
            </div>
          </div>
        </Card>
      )}
    >
      <div className="space-y-6 with-print-header with-print-footer">
        <PrintHeader />
        <PrintFooter left="Generated by Nuuru Al-Bayaan" />

        <StandardTable
          isLoading={query.isLoading && years.length === 0}
          error={query.error}
          items={sorted}
          loadingMessage="Loading academic years..."
          loadingVariant="table"
          loadingRows={6}
          loadingColumns={2}
          emptyTitle="No academic years found"
          emptyDescription={search ? 'Try a different search.' : 'Create your first academic year.'}
          emptyActionLabel="Add Academic Year"
          onEmptyAction={onAdd}
          onRetry={() => query.refetch()}

          rows={currentRows}
          columns={columns}
          storageKey="setup:academicYears:columns:v1"
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={onSort}
          controlsProps={{
            limit,
            total: sorted.length,
            onLimit: (v) => {
              const next = Math.max(1, Number(v) || 20);
              setLimit(next);
              setPage(1);
            },
            limits: [10, 20, 30, 50, 100, 'all'],
          }}
          getRowKey={(y) => y._id}
          renderCell={(y, col) => {
            switch (col.key) {
              case 'yearName':
                return y?.yearName || '-';
              case 'updatedAt':
                return y?.updatedAt ? new Date(y.updatedAt).toLocaleDateString() : '-';
              case 'actions':
                return (
                  <RowActionButtons
                    actions={[
                      {
                        key: 'edit',
                        label: 'Edit',
                        title: 'Edit academic year',
                        tone: 'edit',
                        icon: <Pencil size={16} />,
                        disabled: createMut.isPending || updateMut.isPending,
                        onClick: () => onEdit(y),
                      },
                      {
                        key: 'delete',
                        label: 'Delete',
                        title: 'Delete academic year',
                        tone: 'delete',
                        icon: <Trash2 size={16} />,
                        disabled: deleteMut.isPending,
                        onClick: () => onDelete(y),
                      },
                    ]}
                  />
                );
              default:
                return '';
            }
          }}

          page={page}
          totalPages={totalPages}
          limit={limit}
          total={sorted.length}
          onPage={(p) => setPage(p)}
          onLimit={(v) => {
            const next = Math.max(1, Number(v) || 20);
            setLimit(next);
            setPage(1);
          }}
          showRowsSelector={false}
          paginationProps={{ className: 'no-print', infoVariant: 'page' }}
        />
      </div>

      <Modal
        isOpen={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edit Academic Year' : 'Add Academic Year'}
      >
        <AcademicYearSetupForm
          initial={editing || {}}
          isSubmitting={createMut.isPending || updateMut.isPending}
          onCancel={() => {
            setOpen(false);
            setEditing(null);
          }}
          onSubmit={async (payload) => {
            if (editing?._id) updateMut.mutate({ id: editing._id, payload });
            else createMut.mutate(payload);
          }}
        />
      </Modal>
    </ListPageShell>
  );
}
