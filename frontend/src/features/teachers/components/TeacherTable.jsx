import React, { useMemo } from 'react';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import DataTable from '../../../shared/components/table/DataTable.jsx';
import TableState from '../../../shared/components/table/TableState.jsx';

export default function TeacherTable({ items = [], loading = false, error = '', sortBy, sortDir, onSort, onAssign, onEdit, onDelete }) {
  const columns = useMemo(() => ([
    { key: 'name', label: 'Name', sortable: true, field: 'fullName', thClassName: 'text-left px-3 py-2 border-r border-white/20', tdClassName: 'px-3 py-2 border-r' },
    { key: 'teacherId', label: 'Teacher ID', sortable: true, field: 'teacherId', thClassName: 'text-left px-3 py-2 border-r border-white/20', tdClassName: 'px-3 py-2 border-r' },
    { key: 'email', label: 'Email', sortable: true, field: 'email', thClassName: 'text-left px-3 py-2 border-r border-white/20', tdClassName: 'px-3 py-2 border-r' },
    { key: 'phone', label: 'Phone', sortable: true, field: 'phone', thClassName: 'text-left px-3 py-2 border-r border-white/20', tdClassName: 'px-3 py-2 border-r' },
    { key: 'createdAt', label: 'Created', sortable: true, field: 'createdAt', thClassName: 'text-left px-3 py-2 border-r border-white/20', tdClassName: 'px-3 py-2 border-r' },
    { key: 'status', label: 'Status', sortable: true, field: 'status', thClassName: 'text-left px-3 py-2 border-r border-white/20', tdClassName: 'px-3 py-2 border-r' },
    { key: 'actions', label: '', thClassName: 'text-left px-3 py-2', tdClassName: 'px-3 py-2 text-right' },
  ]), []);

  return (
    <TableState
      isLoading={loading}
      error={error}
      items={items}
      loadingMessage="Loading…"
      loadingVariant="table"
      loadingRows={6}
      loadingColumns={7}
      emptyTitle="No teachers."
      emptyDescription=""
    >
      <DataTable
        rows={items}
        columns={columns}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        getRowKey={(t) => t._id || t.id}
        theadClassName=""
        headerRowClassName="bg-black text-white"
        baseRowClassName="border-t"
        useDefaultHeaderStyles={false}
        renderCell={(t, col) => {
          switch (col.key) {
            case 'name':
              return t.fullName || `${t.firstName || ''} ${t.lastName || ''}`.trim();
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
                <>
                  <ActionButton variant="info" onClick={() => onAssign && onAssign(t)}>Assignments</ActionButton>
                  <ActionButton className="ml-2" onClick={() => onEdit && onEdit(t)}>Edit</ActionButton>
                  <ActionButton variant="danger" className="ml-2" onClick={() => onDelete && onDelete(t)}>Delete</ActionButton>
                </>
              );
            default:
              return '';
          }
        }}
      />
    </TableState>
  );
}
