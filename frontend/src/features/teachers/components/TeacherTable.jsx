import React, { useMemo } from 'react';
import { Eye, KeyRound, ListChecks, Pencil, RotateCcw, Trash2 } from 'lucide-react';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import { useAuth } from '../../../auth/AuthContext';
import { useI18n } from '../../../i18n/I18nProvider';

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

  const { t } = useI18n();

  const { auth, hasPermission } = useAuth();
  const roleLower = String(auth?.user?.role || '').toLowerCase();
  const isAdmin = roleLower === 'admin';

  const canView = isAdmin || hasPermission('teachers', 'view');
  const canAssign = isAdmin || hasPermission('teachers', 'assign');
  const canEdit = isAdmin || hasPermission('teachers', 'edit');
  const canDeactivate = isAdmin || hasPermission('teachers', 'deactivate');
  const canReactivate = isAdmin || hasPermission('teachers', 'reactivate');
  const canResetPassword = isAdmin || hasPermission('teachers', 'resetPassword');

  const columns = useMemo(() => ([
    { key: 'name', label: t('teachers.table.columns.name'), sortable: true, field: 'fullName', tdClassName: 'px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200' },
    { key: 'teacherId', label: t('teachers.table.columns.teacherId'), sortable: true, field: 'teacherId' },
    { key: 'email', label: t('teachers.table.columns.email'), sortable: true, field: 'email' },
    { key: 'phone', label: t('teachers.table.columns.phone'), sortable: true, field: 'phone' },
    { key: 'createdAt', label: t('teachers.table.columns.createdAt'), sortable: true, field: 'createdAt' },
    { key: 'status', label: t('teachers.table.columns.status'), sortable: true, field: 'status', tdClassName: 'px-6 py-4 whitespace-nowrap border-x border-gray-200' },
    { key: 'actions', label: t('teachers.table.columns.actions'), align: 'right', noPrint: true, locked: false, tdClassName: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium border-x border-gray-200 no-print' },
  ]), [t]);

  return (
    <StandardTable
      isLoading={isLoading}
      error={error}
      items={items}
      loadingMessage={t('teachers.table.loading')}
      loadingVariant="table"
      loadingRows={6}
      loadingColumns={7}
      emptyTitle={t('teachers.table.emptyTitle')}
      emptyDescription={t('teachers.table.emptyDescription')}

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
      getRowKey={(row) => row?._id || row?.id}
      renderCell={(row, col) => {
        switch (col.key) {
          case 'name':
            return row.fullName || `${row.firstName || ''} ${row.lastName || ''}`.trim() || '-';
          case 'teacherId':
            return row.teacherId || '-';
          case 'email':
            return row.email || '-';
          case 'phone':
            return row.phone || '-';
          case 'createdAt':
            return row.createdAt
              ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(row.createdAt))
              : '-';
          case 'status':
            {
              const statusNorm = String(row.status || '').toLowerCase();
              const label =
                statusNorm === 'active'
                  ? t('common.status.active')
                  : statusNorm === 'inactive'
                    ? t('common.status.inactive')
                    : (row.status || '-');
            return (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ring-1 ${row.status === 'active' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-slate-50 text-slate-700 ring-slate-200'}`}>{label}</span>
            );
            }
          case 'actions':
            return (
              <RowActionButtons
                actions={[
                  canView
                    ? {
                        key: 'view',
                        label: t('teachers.table.actions.view'),
                        title: t('teachers.table.actionTitles.viewProfile'),
                        tone: 'view',
                        icon: <Eye size={16} />,
                        onClick: () => onView?.(row),
                      }
                    : null,
                  canResetPassword
                    ? {
                        key: 'resetPassword',
                        label: t('teachers.table.actions.resetPassword'),
                        title: t('teachers.table.actionTitles.resetPasswordDefault'),
                        tone: 'edit',
                        icon: <KeyRound size={16} />,
                        disabled:
                          Boolean(pendingById?.[row._id || row.id]) ||
                          String(row.status || '').toLowerCase() === 'inactive',
                        onClick: () => onResetPassword?.(row),
                      }
                    : null,
                  canAssign
                    ? {
                        key: 'assign',
                        label: t('teachers.table.actions.assignments'),
                        title: t('teachers.table.actions.assignments'),
                        tone: 'view',
                        showLabel: true,
                        icon: <ListChecks size={16} />,
                        onClick: () => onAssign?.(row),
                      }
                    : null,
                  canEdit
                    ? {
                        key: 'edit',
                        label: t('teachers.table.actions.edit'),
                        title: t('teachers.table.actionTitles.editTeacher'),
                        tone: 'edit',
                        icon: <Pencil size={16} />,
                        onClick: () => onEdit?.(row),
                      }
                    : null,
                  row.status === 'inactive'
                    ? (canReactivate
                        ? {
                            key: 'reactivate',
                            label: t('teachers.table.actions.reactivate'),
                            title: t('teachers.table.actionTitles.reactivateTeacher'),
                            tone: 'view',
                            icon: <RotateCcw size={16} />,
                            disabled: Boolean(pendingById?.[row._id || row.id]),
                            onClick: () => onToggleStatus?.(row),
                          }
                        : null)
                    : (canDeactivate
                        ? {
                            key: 'deactivate',
                            label: t('teachers.table.actions.deactivate'),
                            title: t('teachers.table.actionTitles.deactivateTeacher'),
                            tone: 'delete',
                            icon: <Trash2 size={16} />,
                            disabled: Boolean(pendingById?.[row._id || row.id]),
                            onClick: () => onToggleStatus?.(row),
                          }
                        : null),
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
