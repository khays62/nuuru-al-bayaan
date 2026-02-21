import React from 'react';

import Card from '../../../shared/components/ui/Card.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Alert from '../../../shared/components/ui/Alert.jsx';
import LoadingState from '../../../shared/components/ui/LoadingState.jsx';
import EmptyState from '../../../shared/components/ui/EmptyState.jsx';
import DataTable from '../../../shared/components/table/DataTable.jsx';
import { useI18n } from '../../../i18n/I18nProvider';

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
  const { t } = useI18n();

  if (isLoading) return <LoadingState variant="table" columns={(columns?.length || 3) + 1} rows={6} />;

  if (error) {
    return (
      <Alert
        variant="error"
        title={t('common.errors.failedToLoad', { defaultValue: 'Failed to load' })}
        description={String(error?.message || error)}
        action={
          <Button type="button" variant="neutral" onClick={onAdd}>
            {t('common.retry', { defaultValue: 'Try again' })}
          </Button>
        }
      />
    );
  }

  const data = Array.isArray(rows) ? rows : [];

  if (data.length === 0) {
    return (
      <EmptyState
        title={t('setup.table.emptyTitle', { defaultValue: 'No {{title}}', title: String(title || '') })}
        description={t('setup.table.emptyDescription', { defaultValue: 'Create your first {{title}} to get started.', title: String(title || '') })}
        actionLabel={t('setup.table.emptyAction', { defaultValue: 'Add {{title}}', title: String(title || '') })}
        onAction={onAdd}
      />
    );
  }

  const tableColumns = [
    ...(columns || []).map((c) => ({
      key: c.key,
      label: c.label,
      render: (row) => (typeof c.render === 'function' ? c.render(row) : (row?.[c.key] ?? '')),
    })),
    {
      key: '__actions',
      label: t('common.table.actions', { defaultValue: 'Actions' }),
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Button type="button" size="sm" variant="neutral" onClick={() => onEdit(row)}>
            {t('common.actions.edit', { defaultValue: 'Edit' })}
          </Button>
          <Button type="button" size="sm" variant="danger" onClick={() => onDelete(row)}>
            {t('common.actions.delete', { defaultValue: 'Delete' })}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card className="p-0">
      <DataTable rows={data} columns={tableColumns} />
    </Card>
  );
}
