import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Repeat, RotateCcw, Trash2 } from 'lucide-react';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import StatusBadge from '../../../shared/components/ui/badges/StatusBadge.jsx';

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

  return (
    <StandardTable
      isLoading={isLoading}
      items={items}
      loadingMessage="Loading users..."
      loadingVariant="table"
      loadingRows={6}
      loadingColumns={7}
      emptyTitle="No users found"
      emptyDescription="Try adjusting filters or add a new user."
      rows={rows}
      columns={[
        {
          key: 'fullName',
          label: 'Full Name',
          sortable: true,
          field: 'fullName',
          tdClassName: 'px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200',
        },
        { key: 'username', label: 'Username', sortable: true, field: 'username' },
        { key: 'email', label: 'Email', sortable: true, field: 'email' },
        { key: 'phone', label: 'Phone', sortable: true, field: 'phone' },
        { key: 'role', label: 'Role', sortable: true, field: 'role' },
        {
          key: 'status',
          label: 'Status',
          sortable: true,
          field: 'status',
          tdClassName: 'px-6 py-4 whitespace-nowrap border-x border-gray-200',
        },
        {
          key: 'actions',
          label: 'Actions',
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
          case 'role':
            return u.role;
          case 'status':
            return <StatusBadge status={u.status} />;
          case 'actions': {
            const isPending = Boolean(pendingById?.[u._id]);
            const actions = [
              {
                key: 'view',
                label: 'View',
                title: 'View user',
                tone: 'view',
                icon: <Eye size={16} />,
                disabled: isPending,
                onClick: () => navigate(`/users/${u._id}`),
              },
              {
                key: 'edit',
                label: 'Edit',
                title: 'Edit user',
                tone: 'edit',
                icon: <Pencil size={16} />,
                disabled: isPending,
                onClick: () => onEdit(u),
              },
              {
                key: u.status === 'active' ? 'deactivate' : 'activate',
                label: u.status === 'active' ? 'Deactivate' : 'Activate',
                title: u.status === 'active' ? 'Deactivate user' : 'Activate user',
                tone: u.status === 'active' ? 'delete' : 'view',
                icon: u.status === 'active' ? <Trash2 size={16} /> : <RotateCcw size={16} />,
                disabled: isPending,
                onClick: () => onToggleStatus(u._id),
              },
              {
                key: 'resetLockout',
                label: 'Unlock',
                title: 'Unlock login (clear lockout)',
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
    />
  );
}
