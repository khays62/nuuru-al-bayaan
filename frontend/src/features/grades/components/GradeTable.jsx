import React, { useMemo } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';
import { useAuth } from '../../../auth/AuthContext';
import { useI18n } from '../../../i18n/useI18n';

// GradeTable shows section + grade + shift + subjects count; no AY/Cohort columns
const GradeTable = ({
  items,
  rows,
  meta,
  isLoading,
  error,
  onRetry,
  onAdd,
  onEdit,
  onDelete,
  onView,
  sortBy,
  sortDir,
  onSort,
  onPage,
  onLimit,
}) => {
  const { t } = useI18n();
  const STORAGE_KEY = 'gradeSections:columns:v1';

  const { auth, hasPermission } = useAuth();
  const roleLower = String(auth?.user?.role || '').toLowerCase();
  const isAdmin = roleLower === 'admin';
  const canAdd = isAdmin || hasPermission('grades', 'add');
  const canView = isAdmin || hasPermission('grades', 'view');
  const canEdit = isAdmin || hasPermission('grades', 'edit');
  const canDelete = isAdmin || hasPermission('grades', 'delete');

  const columns = useMemo(() => ([
    { key: 'section', label: t('common.filters.section', { defaultValue: 'Section' }), sortable: true, field: 'section', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200' },
    { key: 'grade', label: t('common.filters.grade', { defaultValue: 'Grade' }), sortable: true, field: 'gradeName', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200' },
    { key: 'shift', label: t('common.filters.shift', { defaultValue: 'Shift' }), tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200' },
    { key: 'subjects', label: t('gradeSections.columns.subjects', { defaultValue: 'Subjects' }), tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200' },
    { key: 'capacity', label: t('gradeSections.columns.capacity', { defaultValue: 'Capacity' }), tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200' },
    { key: 'actions', label: t('common.table.actions', { defaultValue: 'Actions' }), align: 'right', noPrint: true, locked: false, tdClassName: 'px-6 py-4 whitespace-nowrap text-right font-medium space-x-2 border-x border-gray-200 no-print' },
  ]), [t]);

  return (
    <StandardTable
      isLoading={isLoading && (items || []).length === 0}
      error={error}
      items={items}
      loadingMessage={t('gradeSections.table.loading', { defaultValue: 'Loading...' })}
      loadingVariant="table"
      loadingRows={6}
      loadingColumns={5}
      emptyTitle={t('gradeSections.table.emptyTitle', { defaultValue: 'No grade sections found' })}
      emptyDescription={t('gradeSections.table.emptyDescription', { defaultValue: 'Try adjusting filters or create a new one.' })}
      emptyActionLabel={canAdd ? t('common.actions.add', { defaultValue: 'Add' }) : undefined}
      onEmptyAction={canAdd ? onAdd : undefined}
      onRetry={onRetry}

      rows={rows}
      storageKey={STORAGE_KEY}
      columns={columns}
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={onSort}
      getRowKey={(cls) => cls._id}
      controlsProps={{
        limit: meta?.limit || 10,
        total: meta?.total || 0,
        onLimit: (v) => onLimit?.(v),
        limits: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 'all'],
      }}
      renderCell={(cls, col) => {
        const gradeName = cls.grade?.gradeName || cls.grade?.name || cls.grade || 'â€”';
        const shiftName = cls.shift?.shiftName || cls.shift?.name || 'â€”';

        switch (col.key) {
          case 'section':
            return cls.section || '1';
          case 'grade':
            return gradeName;
          case 'shift':
            return shiftName;
          case 'subjects':
            return (cls.subjects || []).length;
          case 'capacity':
            return cls.capacity ?? 'â€”';
          case 'actions':
            return (
              <RowActionButtons
                actions={[
                  canView
                    ? {
                        key: 'view',
                        label: t('common.actions.view', { defaultValue: 'View' }),
                        title: t('gradeSections.rowActions.viewStudentsTitle', { defaultValue: 'View Students' }),
                        tone: 'view',
                        icon: <Eye size={18} />,
                        onClick: () => onView?.(cls),
                      }
                    : null,
                  canEdit
                    ? {
                        key: 'edit',
                        label: t('common.actions.edit', { defaultValue: 'Edit' }),
                        tone: 'edit',
                        icon: <Pencil size={18} />,
                        onClick: () => onEdit?.(cls),
                      }
                    : null,
                  canDelete
                    ? {
                        key: 'delete',
                        label: t('common.actions.delete', { defaultValue: 'Delete' }),
                        tone: 'delete',
                        icon: <Trash2 size={18} />,
                        onClick: () => onDelete?.(cls._id),
                      }
                    : null,
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
};

export default GradeTable;
