import React from 'react';
import { Archive, ArchiveRestore, Edit, Trash2 } from 'lucide-react';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import { useAuth } from '../../../auth/AuthContext';
import { useI18n } from '../../../i18n/I18nProvider';

export default function CohortTable({
  isLoading,
  error,
  items,
  rows,
  meta,
  sortBy,
  sortDir,
  onSort,
  onRetry,
  onEmptyAction,
  onEdit,
  onArchive,
  onActivate,
  onDelete,
  onPage,
  onLimit,
}) {
  const { t } = useI18n();
  const { auth, hasPermission } = useAuth();
  const roleLower = String(auth?.user?.role || '').toLowerCase();
  const isAdmin = roleLower === 'admin';

  const canAdd = isAdmin || hasPermission('cohorts', 'add');
  const canEdit = isAdmin || hasPermission('cohorts', 'edit');
  const canDelete = isAdmin || hasPermission('cohorts', 'delete');

  return (
    <StandardTable
      isLoading={isLoading}
      error={error}
      items={items}
      loadingMessage={t('common.loading', { defaultValue: 'Loading…' })}
      loadingVariant="table"
      loadingRows={6}
      loadingColumns={5}
      emptyTitle={t('cohorts.table.emptyTitle', { defaultValue: 'No cohorts found' })}
      emptyDescription={t('cohorts.table.emptyDescription', { defaultValue: 'Try adjusting filters or create a new cohort.' })}
      emptyActionLabel={canAdd ? t('cohorts.actions.add', { defaultValue: 'Add Cohort' }) : undefined}
      onEmptyAction={canAdd ? onEmptyAction : undefined}
      onRetry={onRetry}
      topSlot={
        <div className="flex justify-between items-center mb-2 text-sm text-gray-600 no-print">
          <div>
            {t('common.pagination.pageSummary', {
              defaultValue: 'Page {{page}} of {{pages}} — {{total}} total',
              page: meta.page,
              pages: meta.totalPages || meta.pages || 1,
              total: meta.total,
            })}
          </div>
        </div>
      }
      rows={rows}
      storageKey="cohorts:columns:v1"
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={onSort}
      controlsProps={{
        limit: meta.limit,
        total: meta.total,
        onLimit,
      }}
      columns={[
        {
          key: 'name',
          label: t('cohorts.table.columns.name', { defaultValue: 'Name' }),
          sortable: true,
          field: 'name',
          tdClassName: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-x border-gray-200',
        },
        { key: 'status', label: t('common.filters.status', { defaultValue: 'Status' }), sortable: true, field: 'status' },
        { key: 'startAy', label: t('cohorts.table.columns.startAy', { defaultValue: 'AY (Start)' }), sortable: true, field: 'startAcademicYear' },
        { key: 'createdAt', label: t('common.table.created', { defaultValue: 'Created' }), sortable: true, field: 'createdAt' },
        {
          key: 'actions',
          label: t('common.table.actions', { defaultValue: 'Actions' }),
          align: 'right',
          noPrint: true,
          tdClassName: 'px-6 py-4 whitespace-nowrap text-right font-medium border-x border-gray-200 no-print',
        },
      ]}
      getRowKey={(row) => row._id}
      renderCell={(row, col) => {
        switch (col.key) {
          case 'name':
            return row.name;
          case 'status':
            return (
              <span
                className={`text-xs px-2 py-1 rounded ${
                  row.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {row.status === 'active'
                  ? t('common.status.active', { defaultValue: 'Active' })
                  : t('cohorts.status.archived', { defaultValue: 'Archived' })}
              </span>
            );
          case 'startAy':
            return row.startAcademicYear?.yearName || row.startAcademicYearName || '-';
          case 'createdAt':
            return row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-';
          case 'actions': {
            const actions = [
              canEdit
                ? {
                    key: 'edit',
                    label: t('common.actions.edit', { defaultValue: 'Edit' }),
                    title: t('common.actions.edit', { defaultValue: 'Edit' }),
                    tone: 'edit',
                    icon: <Edit size={16} />,
                    onClick: () => onEdit(row),
                  }
                : null,
              canEdit
                ? (row.status === 'active'
                    ? {
                        key: 'archive',
                        label: t('common.actions.archive', { defaultValue: 'Archive' }),
                        title: t('common.actions.archive', { defaultValue: 'Archive' }),
                        tone: 'neutral',
                        icon: <Archive size={16} />,
                        onClick: () => onArchive(row),
                      }
                    : {
                        key: 'activate',
                        label: t('common.actions.activate', { defaultValue: 'Activate' }),
                        title: t('common.actions.activate', { defaultValue: 'Activate' }),
                        tone: 'neutral',
                        icon: <ArchiveRestore size={16} />,
                        onClick: () => onActivate(row),
                      })
                : null,
              canDelete
                ? {
                    key: 'delete',
                    label: t('common.actions.delete', { defaultValue: 'Delete' }),
                    title: t('common.actions.delete', { defaultValue: 'Delete' }),
                    tone: 'delete',
                    icon: <Trash2 size={16} />,
                    onClick: () => onDelete(row),
                  }
                : null,
            ];

            return <RowActionButtons actions={actions} />;
          }
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
