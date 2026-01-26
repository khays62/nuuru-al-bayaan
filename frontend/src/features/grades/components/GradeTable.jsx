import React, { useMemo } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import RowActionButtons from '../../../shared/components/table/RowActionButtons.jsx';

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
  const STORAGE_KEY = 'gradeSections:columns:v1';

  const columns = useMemo(() => ([
    { key: 'section', label: 'Section', sortable: true, field: 'section', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200' },
    { key: 'grade', label: 'Grade', sortable: true, field: 'gradeName', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200' },
    { key: 'shift', label: 'Shift', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200' },
    { key: 'subjects', label: 'Subjects', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200' },
    { key: 'capacity', label: 'Capacity', tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200' },
    { key: 'actions', label: 'Actions', align: 'right', noPrint: true, locked: false, tdClassName: 'px-6 py-4 whitespace-nowrap text-right font-medium space-x-2 border-x border-gray-200 no-print' },
  ]), []);

  return (
    <StandardTable
      isLoading={isLoading && (items || []).length === 0}
      error={error}
      items={items}
      loadingMessage="Loading..."
      loadingVariant="table"
      loadingRows={6}
      loadingColumns={5}
      emptyTitle="No grade sections found"
      emptyDescription="Try adjusting filters or create a new one."
      emptyActionLabel="Add"
      onEmptyAction={onAdd}
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
        const gradeName = cls.grade?.gradeName || cls.grade?.name || cls.grade || '—';
        const shiftName = cls.shift?.shiftName || cls.shift?.name || '—';

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
            return cls.capacity ?? '—';
          case 'actions':
            return (
              <RowActionButtons
                actions={[
                  {
                    key: 'view',
                    label: 'View',
                    title: 'View Students',
                    tone: 'view',
                    icon: <Eye size={18} />,
                    onClick: () => onView?.(cls),
                  },
                  {
                    key: 'edit',
                    label: 'Edit',
                    tone: 'edit',
                    icon: <Pencil size={18} />,
                    onClick: () => onEdit?.(cls),
                  },
                  {
                    key: 'delete',
                    label: 'Delete',
                    tone: 'delete',
                    icon: <Trash2 size={18} />,
                    onClick: () => onDelete?.(cls._id),
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
};

export default GradeTable;
