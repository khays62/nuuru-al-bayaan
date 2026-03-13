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
import { useI18n } from '../../../i18n/useI18n';

import GradeSetupForm from '../components/GradeSetupForm.jsx';

import { setupKeys } from '../queryKeys.js';
import {
  listSetupGrades,
  createSetupGrade,
  updateSetupGrade,
  deleteSetupGrade,
} from '../api/setup.js';

export default function GradesSetupPage() {
  const qc = useQueryClient();
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('order');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const query = useQuery({
    queryKey: setupKeys.grades(),
    queryFn: listSetupGrades,
  });

  const grades = useMemo(() => {
    const raw = query.data?.grades;
    return Array.isArray(raw) ? raw : [];
  }, [query.data]);

  const filtered = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return grades;
    return grades.filter((g) => String(g?.gradeName || '').toLowerCase().includes(q));
  }, [grades, search]);

  const sorted = useMemo(() => {
    const dir = String(sortDir || '').toLowerCase() === 'desc' ? -1 : 1;
    const by = String(sortBy || 'order');

    const copy = [...filtered];
    copy.sort((a, b) => {
      if (by === 'order') {
        const ao = Number.isFinite(Number(a?.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
        const bo = Number.isFinite(Number(b?.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return (ao - bo) * dir;
        return String(a?.gradeName || '').localeCompare(String(b?.gradeName || ''), undefined, { sensitivity: 'base' }) * dir;
      }
      if (by === 'gradeName') {
        return String(a?.gradeName || '').localeCompare(String(b?.gradeName || ''), undefined, { sensitivity: 'base' }) * dir;
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

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sorted.length / Math.max(1, limit))), [sorted.length, limit]);

  const currentRows = useMemo(() => {
    const lim = Math.max(1, Number(limit) || 20);
    const p = Math.min(Math.max(1, Number(page) || 1), totalPages);
    const start = (p - 1) * lim;
    return sorted.slice(start, start + lim);
  }, [sorted, page, limit, totalPages]);

  const createMut = useMutation({
    mutationFn: createSetupGrade,
    onSuccess: async () => {
      toast.success(t('setup.grades.toasts.created', { defaultValue: 'Grade created' }));
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: setupKeys.grades() });
    },
    onError: (e) => toast.error(String(
      e?.data?.message || e?.data?.error || e?.message || t('common.errors.failedToCreate', { defaultValue: 'Failed to create' })
    )),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => updateSetupGrade(id, payload),
    onSuccess: async () => {
      toast.success(t('setup.grades.toasts.updated', { defaultValue: 'Grade updated' }));
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: setupKeys.grades() });
    },
    onError: (e) => toast.error(String(
      e?.data?.message || e?.data?.error || e?.message || t('common.errors.failedToUpdate', { defaultValue: 'Failed to update' })
    )),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteSetupGrade(id),
    onSuccess: async () => {
      toast.success(t('setup.grades.toasts.deleted', { defaultValue: 'Grade deleted' }));
      await qc.invalidateQueries({ queryKey: setupKeys.grades() });
    },
    onError: (e) => {
      const data = e?.data;
      if (data?.inUse) {
        const refs = data?.refs || {};
        const parts = [];
        if ((refs.gradeSections ?? 0) > 0) parts.push(`${t('setup.grades.refs.gradeSections', { defaultValue: 'Grade Sections' })}: ${refs.gradeSections}`);
        if ((refs.enrollments ?? 0) > 0) parts.push(`${t('setup.grades.refs.enrollments', { defaultValue: 'Enrollments' })}: ${refs.enrollments}`);
        if ((refs.subjects ?? 0) > 0) parts.push(`${t('setup.grades.refs.subjects', { defaultValue: 'Subjects' })}: ${refs.subjects}`);
        const suffix = parts.length ? ` (${parts.join(', ')})` : '';
        toast.error(t('setup.grades.errors.cannotDeleteInUse', {
          defaultValue: 'Cannot delete: Grade is in use{{suffix}}',
          suffix,
        }));
        return;
      }
      const msg = data?.error || data?.message || e?.message || t('common.errors.failedToDelete', { defaultValue: 'Failed to delete' });
      toast.error(String(msg));
    },
  });

  const columns = useMemo(
    () => [
      { key: 'gradeName', label: t('setup.grades.columns.grade', { defaultValue: 'Grade' }), sortable: true, field: 'gradeName', tdClassName: 'px-6 py-4 text-sm font-medium text-(--nb-color-fg) border-x border-(--nb-color-border)' },
      { key: 'order', label: t('common.table.order', { defaultValue: 'Order' }), sortable: true, field: 'order', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-(--nb-color-fg) border-x border-(--nb-color-border)' },
      { key: 'updatedAt', label: t('common.table.updated', { defaultValue: 'Updated' }), sortable: true, field: 'updatedAt', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-(--nb-color-fg) border-x border-(--nb-color-border)' },
      { key: 'actions', label: t('common.table.actions', { defaultValue: 'Actions' }), align: 'right', noPrint: true, locked: false, tdClassName: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium border-x border-(--nb-color-border) no-print' },
    ],
    [t]
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
    if (!window.confirm(t('setup.grades.confirms.delete', { defaultValue: 'Delete this grade? This is only allowed if not in use.' }))) return;
    deleteMut.mutate(row._id);
  };

  const isLoading = Boolean(query.isLoading && query.data == null);
  const canExport = Boolean(!isLoading && Array.isArray(sorted) && sorted.length > 0);
  const buildExportPayload = async () => {
    if (!canExport) return null;

    // Export should match the currently visible table columns (excluding actions).
    const STORAGE_KEY = 'setup:grades:columns:v1';
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
      { key: 'gradeName', label: t('setup.grades.columns.grade', { defaultValue: 'Grade' }), get: (g) => g?.gradeName || '' },
      { key: 'order', label: t('common.table.order', { defaultValue: 'Order' }), get: (g) => (Number.isFinite(Number(g?.order)) ? String(g.order) : '') },
      { key: 'updatedAt', label: t('common.table.updated', { defaultValue: 'Updated' }), get: (g) => (g?.updatedAt ? dtf.format(new Date(g.updatedAt)) : '') },
      // actions are UI-only; never export
    ].filter((c) => isVisible(c.key));

    const headers = cols.map((c) => c.label);
    const rows = (sorted || []).map((g) => cols.map((c) => c.get(g)));

    return {
      filename: 'setup-grades.pdf',
      sheetName: t('setup.grades.sheetName', { defaultValue: 'Grades' }),
      title: '',
      subtitle: t('common.export.subtitle', {
        defaultValue: 'Total: {{count}} - Generated: {{date}}',
        count: sorted.length,
        date: new Date().toLocaleString(),
      }),
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
    setSortBy('order');
    setSortDir('asc');
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
                  placeholder={t('setup.grades.searchPlaceholder', { defaultValue: 'Search grades...' })}
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
                  {t('setup.grades.actions.add', { defaultValue: 'Add Grade' })}
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
                  onClick={onReset}
                >
                  {t('common.actions.reset', { defaultValue: 'Reset' })}
                </ActionButton>
              </div>
            </div>
          </div>
        </Card>
      )}
    >
      <div className="space-y-6 with-print-header with-print-footer">
        <PrintHeader />
        <PrintFooter left={t('common.generatedBy', { defaultValue: 'Generated by Nuuru Al-Bayaan' })} />

        <StandardTable
          isLoading={query.isLoading && grades.length === 0}
          error={query.error}
          items={sorted}
          loadingMessage={t('setup.grades.loading', { defaultValue: 'Loading grades...' })}
          loadingVariant="table"
          loadingRows={6}
          loadingColumns={3}
          emptyTitle={t('setup.grades.emptyTitle', { defaultValue: 'No grades found' })}
          emptyDescription={search
            ? t('common.emptyStates.tryDifferentSearch', { defaultValue: 'Try a different search.' })
            : t('setup.grades.emptyCreateFirst', { defaultValue: 'Create your first grade.' })
          }
          emptyActionLabel={t('setup.grades.actions.add', { defaultValue: 'Add Grade' })}
          onEmptyAction={onAdd}
          onRetry={() => query.refetch()}

          rows={currentRows}
          columns={columns}
          storageKey="setup:grades:columns:v1"
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
          getRowKey={(g) => g._id}
          renderCell={(g, col) => {
            switch (col.key) {
              case 'gradeName':
                return g?.gradeName || '-';
              case 'order':
                return Number.isFinite(Number(g?.order)) ? String(g.order) : '-';
              case 'updatedAt':
                return g?.updatedAt ? new Date(g.updatedAt).toLocaleDateString() : '-';
              case 'actions':
                return (
                  <RowActionButtons
                    actions={[
                      {
                        key: 'edit',
                        label: t('common.actions.edit', { defaultValue: 'Edit' }),
                        title: t('setup.grades.rowActions.editTitle', { defaultValue: 'Edit grade' }),
                        tone: 'edit',
                        icon: <Pencil size={16} />,
                        disabled: createMut.isPending || updateMut.isPending,
                        onClick: () => onEdit(g),
                      },
                      {
                        key: 'delete',
                        label: t('common.actions.delete', { defaultValue: 'Delete' }),
                        title: t('setup.grades.rowActions.deleteTitle', { defaultValue: 'Delete grade' }),
                        tone: 'delete',
                        icon: <Trash2 size={16} />,
                        disabled: deleteMut.isPending,
                        onClick: () => onDelete(g),
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
        title={editing
          ? t('setup.grades.modal.editTitle', { defaultValue: 'Edit Grade' })
          : t('setup.grades.modal.addTitle', { defaultValue: 'Add Grade' })
        }
      >
        <GradeSetupForm
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
