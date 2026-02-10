import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Repeat, RotateCcw, Trash2 } from 'lucide-react';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import StatusBadge from '../../../shared/components/ui/badges/StatusBadge.jsx';
import { useI18n } from '../../../i18n/I18nProvider';

export default function UserTable({
  isLoading,
  items,
  rows,
  allCount,
  sortBy,
  sortDir,
  onSort,
  page,
  totalPages,
  limit,
  onPage,
  onLimit,
  onEdit,
  onToggleStatus,
  onResetLockout,
  pendingById,
}) {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <StandardTable
      isLoading={isLoading}
      items={items}
      loadingMessage={t('users.table.loading')}
      loadingVariant="table"
      loadingRows={6}
      loadingColumns={7}
      emptyTitle={t('users.table.emptyTitle')}
      emptyDescription={t('users.table.emptyDescription')}
      rows={rows}
      columns={[
        {
          key: 'fullName',
          label: t('users.table.columns.fullName'),
          sortable: true,
          field: 'fullName',
          tdClassName: 'px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200',
        },
        { key: 'username', label: t('users.table.columns.username'), sortable: true, field: 'username' },
        { key: 'email', label: t('users.table.columns.email'), sortable: true, field: 'email' },
        { key: 'phone', label: t('users.table.columns.phone'), sortable: true, field: 'phone' },
        { key: 'salary', label: t('users.table.columns.salary'), sortable: false, field: 'salary' },
        { key: 'role', label: t('users.table.columns.role'), sortable: true, field: 'role' },
        {
          key: 'status',
          label: t('users.table.columns.status'),
          sortable: true,
          field: 'status',
          tdClassName: 'px-6 py-4 whitespace-nowrap border-x border-gray-200',
        },
        {
          key: 'actions',
          label: t('users.table.columns.actions'),
          align: 'right',
          noPrint: true,
          locked: false,
          tdClassName: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium border-x border-gray-200 no-print',
        },
      ]}
      storageKey="users:columns:v1"
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={onSort}
      controlsProps={{
        limit,
        total: allCount,
        onLimit: (newLimit) => onLimit(newLimit),
        limits: [5, 10, 20, 50, 100, 'all'],
      }}
      getRowKey={(u) => u._id}
      renderCell={(u, col) => {
        switch (col.key) {
          case 'fullName':
            return u.fullName;
          case 'username':
            return u.username;
          case 'email':
            return u.email;
          case 'phone':
            return u.phone;
          case 'salary':
            return Number(u?.salary || 0);
          case 'role':
            return u.role;
          case 'status':
            return <StatusBadge status={u.status} />;
          case 'actions': {
            const isPending = Boolean(pendingById?.[u._id]);
            const actions = [
              {
                key: 'view',
                label: t('users.table.actions.view'),
                title: t('users.table.actionTitles.view'),
                tone: 'view',
                icon: <Eye size={16} />,
                disabled: isPending,
                onClick: () => navigate(`/users/${u._id}`),
              },
              {
                key: 'edit',
                label: t('users.table.actions.edit'),
                title: t('users.table.actionTitles.edit'),
                tone: 'edit',
                icon: <Pencil size={16} />,
                disabled: isPending,
                onClick: () => onEdit(u),
              },
              {
                key: u.status === 'active' ? 'deactivate' : 'activate',
                label: u.status === 'active' ? t('users.table.actions.deactivate') : t('users.table.actions.activate'),
                title: u.status === 'active' ? t('users.table.actionTitles.deactivate') : t('users.table.actionTitles.activate'),
                tone: u.status === 'active' ? 'delete' : 'view',
                icon: u.status === 'active' ? <Trash2 size={16} /> : <RotateCcw size={16} />,
                disabled: isPending,
                onClick: () => onToggleStatus(u._id),
              },
              {
                key: 'resetLockout',
                label: t('users.table.actions.unlock'),
                title: t('users.table.actionTitles.unlock'),
                tone: 'neutral',
                icon: <Repeat size={16} />,
                disabled: isPending,
                onClick: () => onResetLockout(u._id),
              },
            ];

            return <RowActionButtons actions={actions} />;
          }
          default:
            return '';
        }
      }}
      page={page}
      totalPages={totalPages}
      limit={limit}
      onPage={onPage}
      onLimit={onLimit}
      showRowsSelector={false}
      paginationProps={{ className: 'no-print', infoVariant: 'page' }}
    />
  );
}
