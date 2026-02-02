import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

import ListPageShell from '../../../shared/components/ui/ListPageShell.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import DataToolbar from '../../../shared/components/DataToolbar/DataToolbar.jsx';
import SearchInput from '../../../shared/components/DataToolbar/SearchInput.jsx';
import ExportButtons from '../../../shared/components/exports/ExportButtons.jsx';

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
      toast.success('Grade created');
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: setupKeys.grades() });
    },
    onError: (e) => toast.error(String(e?.data?.message || e?.data?.error || e?.message || 'Failed to create')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => updateSetupGrade(id, payload),
    onSuccess: async () => {
      toast.success('Grade updated');
      setOpen(false);
      setEditing(null);
      await qc.invalidateQueries({ queryKey: setupKeys.grades() });
    },
    onError: (e) => toast.error(String(e?.data?.message || e?.data?.error || e?.message || 'Failed to update')),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteSetupGrade(id),
    onSuccess: async () => {
      toast.success('Grade deleted');
      await qc.invalidateQueries({ queryKey: setupKeys.grades() });
    },
    onError: (e) => {
      const data = e?.data;
      if (data?.inUse) {
        const refs = data?.refs || {};
        const parts = [];
        if ((refs.gradeSections ?? 0) > 0) parts.push(`Grade Sections: ${refs.gradeSections}`);
        if ((refs.enrollments ?? 0) > 0) parts.push(`Enrollments: ${refs.enrollments}`);
        if ((refs.subjects ?? 0) > 0) parts.push(`Subjects: ${refs.subjects}`);
        const suffix = parts.length ? ` (${parts.join(', ')})` : '';
        toast.error(`Cannot delete: Grade is in use${suffix}`);
        return;
      }
      const msg = data?.error || data?.message || e?.message || 'Failed to delete';
      toast.error(String(msg));
    },
  });

  const columns = useMemo(
    () => [
      { key: 'gradeName', label: 'Grade', sortable: true, field: 'gradeName', tdClassName: 'px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200' },
      { key: 'order', label: 'Order', sortable: true, field: 'order', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200' },
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
    if (!window.confirm('Delete this grade? This is only allowed if not in use.')) return;
    deleteMut.mutate(row._id);
  };

  const exportPayload = async () => {
    const headers = ['Grade', 'Order', 'Updated'];
    const rows = (sorted || []).map((g) => ([
      g?.gradeName || '',
      Number.isFinite(Number(g?.order)) ? String(g.order) : '',
      g?.updatedAt ? new Date(g.updatedAt).toLocaleDateString() : '',
    ]));

    return {
      filename: 'setup-grades',
      title: 'Setup • Grades',
      subtitle: `Total: ${sorted.length} • Generated: ${new Date().toLocaleString()}`,
      headers,
      rows,
    };
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

  return (
    <ListPageShell
      title="Setup • Grades"
      actions={
        <Button variant="brand" icon={<Plus className="h-4 w-4" />} onClick={onAdd}>
          Add Grade
        </Button>
      }
      toolbar={(
        <DataToolbar
          searchSlot={(
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search grades..."
            />
          )}
          actionsSlot={(
            <ExportButtons
              getPayload={exportPayload}
              disabled={query.isLoading || sorted.length === 0}
            />
          )}
          onReset={() => {
            setSearch('');
            setSortBy('order');
            setSortDir('asc');
            setPage(1);
            setLimit(20);
          }}
        />
      )}
    >
      <StandardTable
        isLoading={query.isLoading && grades.length === 0}
        error={query.error}
        items={sorted}
        loadingMessage="Loading grades..."
        loadingVariant="table"
        loadingRows={6}
        loadingColumns={3}
        emptyTitle="No grades found"
        emptyDescription={search ? 'Try a different search.' : 'Create your first grade.'}
        emptyActionLabel="Add Grade"
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
                      label: 'Edit',
                      title: 'Edit grade',
                      tone: 'edit',
                      icon: <Pencil size={16} />,
                      disabled: createMut.isPending || updateMut.isPending,
                      onClick: () => onEdit(g),
                    },
                    {
                      key: 'delete',
                      label: 'Delete',
                      title: 'Delete grade',
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

      <Modal
        isOpen={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edit Grade' : 'Add Grade'}
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
