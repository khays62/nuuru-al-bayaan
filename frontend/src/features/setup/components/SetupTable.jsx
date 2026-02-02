import React from 'react';

import Card from '../../../shared/components/ui/Card.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Alert from '../../../shared/components/ui/Alert.jsx';
import LoadingState from '../../../shared/components/ui/LoadingState.jsx';
import EmptyState from '../../../shared/components/ui/EmptyState.jsx';

export default function SetupTable({
  title,
  isLoading,
  error,
  rows,
  columns,
  onAdd,
  onEdit,
  onDelete,
}) {
  if (isLoading) return <LoadingState variant="table" columns={(columns?.length || 3) + 1} rows={6} />;

  if (error) {
    return (
      <Alert
        variant="error"
        title="Failed to load"
        description={String(error?.message || error)}
        action={
          <Button type="button" variant="neutral" onClick={onAdd}>
            Try again
          </Button>
        }
      />
    );
  }

  const data = Array.isArray(rows) ? rows : [];

  if (data.length === 0) {
    return (
      <EmptyState
        title={`No ${title}`}
        description={`Create your first ${String(title || '').toLowerCase()} to get started.`}
        actionLabel={`Add ${title}`}
        onAction={onAdd}
      />
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {(columns || []).map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-600"
                >
                  {c.label}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.map((row) => (
              <tr key={row._id} className="hover:bg-slate-50">
                {(columns || []).map((c) => (
                  <td key={c.key} className="px-4 py-3 text-sm text-slate-800">
                    {typeof c.render === 'function' ? c.render(row) : (row?.[c.key] ?? '')}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button type="button" size="sm" variant="neutral" onClick={() => onEdit(row)}>
                      Edit
                    </Button>
                    <Button type="button" size="sm" variant="danger" onClick={() => onDelete(row)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
