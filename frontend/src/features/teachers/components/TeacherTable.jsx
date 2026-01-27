import React, { useMemo } from 'react';
import { Eye, KeyRound, ListChecks, Pencil, RotateCcw, Trash2 } from 'lucide-react';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';

export default function TeacherTable({
  items = [],
  rows = [],
  isLoading = false,
  error = null,
  sortBy,
  sortDir,
  onSort,
  meta,
  onPage,
  onLimit,
  onView,
  onAssign,
  onEdit,
  onToggleStatus,
  onResetPassword,
  pendingById,
}) {
  const STORAGE_KEY = 'teachers:columns:v1';

  const columns = useMemo(() => ([
    { key: 'name', label: 'Name', sortable: true, field: 'fullName', tdClassName: 'px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200' },
    { key: 'teacherId', label: 'Teacher ID', sortable: true, field: 'teacherId' },
    { key: 'email', label: 'Email', sortable: true, field: 'email' },
    { key: 'phone', label: 'Phone', sortable: true, field: 'phone' },
    { key: 'createdAt', label: 'Created', sortable: true, field: 'createdAt' },
    { key: 'status', label: 'Status', sortable: true, field: 'status', tdClassName: 'px-6 py-4 whitespace-nowrap border-x border-gray-200' },
    { key: 'actions', label: 'Actions', align: 'right', noPrint: true, locked: false, tdClassName: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium border-x border-gray-200 no-print' },
  ]), []);

  return (
    <StandardTable
      isLoading={isLoading}
      error={error}
      items={items}
      loadingMessage="Loading teachers..."
      loadingVariant="table"
      loadingRows={6}
      loadingColumns={7}
      emptyTitle="No teachers."
      emptyDescription="Try adjusting search or add a new teacher."

      rows={rows}
      columns={columns}
      storageKey={STORAGE_KEY}
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={onSort}
      controlsProps={
        meta
          ? {
              limit: meta.limit,
              total: meta.total,
              onLimit: (v) => onLimit?.(v),
              limits: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 'all'],
            }
          : undefined
      }
      getRowKey={(t) => t._id || t.id}
      renderCell={(t, col) => {
        switch (col.key) {
          case 'name':
            return t.fullName || `${t.firstName || ''} ${t.lastName || ''}`.trim() || '-';
          case 'teacherId':
            return t.teacherId || '-';
          case 'email':
            return t.email || '-';
          case 'phone':
            return t.phone || '-';
          case 'createdAt':
            return t.createdAt
              ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(t.createdAt))
              : '-';
          case 'status':
            return (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ring-1 ${t.status === 'active' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-slate-50 text-slate-700 ring-slate-200'}`}>{t.status || '-'}</span>
            );
          case 'actions':
            return (
              <RowActionButtons
                actions={[
                  {
                    key: 'view',
                    label: 'View',
                    title: 'View teacher profile & audit history',
                    tone: 'view',
                    icon: <Eye size={16} />,
                    onClick: () => onView?.(t),
                  },
                  {
                    key: 'resetPassword',
                    label: 'Reset Password',
                    title: 'Reset password to default (clears 24h lock/cooldown)',
                    tone: 'edit',
                    icon: <KeyRound size={16} />,
                    disabled: Boolean(pendingById?.[t._id || t.id]) || String(t.status || '').toLowerCase() === 'inactive',
                    onClick: () => onResetPassword?.(t),
                  },
                  {
                    key: 'assign',
                    label: 'Assignments',
                    title: 'Assignments',
                    tone: 'view',
                    showLabel: true,
                    icon: <ListChecks size={16} />,
                    onClick: () => onAssign?.(t),
                  },
                  {
                    key: 'edit',
                    label: 'Edit',
                    title: 'Edit Teacher',
                    tone: 'edit',
                    icon: <Pencil size={16} />,
                    onClick: () => onEdit?.(t),
                  },
                  t.status === 'inactive'
                    ? {
                        key: 'reactivate',
                        label: 'Reactivate',
                        title: 'Reactivate Teacher',
                        tone: 'view',
                        icon: <RotateCcw size={16} />,
                        disabled: Boolean(pendingById?.[t._id || t.id]),
                        onClick: () => onToggleStatus?.(t),
                      }
                    : {
                        key: 'deactivate',
                        label: 'Deactivate',
                        title: 'Deactivate Teacher',
                        tone: 'delete',
                        icon: <Trash2 size={16} />,
                        disabled: Boolean(pendingById?.[t._id || t.id]),
                        onClick: () => onToggleStatus?.(t),
                      },
                ]}
              />
            );
          default:
            return '';
        }
      }}

      meta={meta}
      onPage={onPage}
      onLimit={onLimit}
      showRowsSelector={false}
      paginationProps={{ className: 'no-print', infoVariant: 'page' }}
    />
  );
}
