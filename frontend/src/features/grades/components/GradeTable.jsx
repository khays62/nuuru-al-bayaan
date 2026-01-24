import React, { useMemo } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import DataTable from '../../../shared/components/table/DataTable.jsx';

// GradeTable shows section + grade + shift + subjects count; no AY/Cohort columns
const GradeTable = ({ classes, onEdit, onDelete, onView, sortBy, sortDir, onSort, limit, total, onLimit }) => {
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
    <DataTable
      rows={classes}
      columns={columns}
      storageKey={STORAGE_KEY}
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={onSort}
      getRowKey={(cls) => cls._id}
      controlsProps={{
        limit,
        total,
        onLimit,
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
              <>
                <button onClick={() => onView?.(cls)} className="text-blue-700 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100 transition-colors" title="View Students">
                  <Eye size={18} />
                </button>
                <button onClick={() => onEdit(cls)} className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-100 transition-colors" title="Edit">
                  <Pencil size={18} />
                </button>
                <button onClick={() => onDelete(cls._id)} className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 transition-colors" title="Delete">
                  <Trash2 size={18} />
                </button>
              </>
            );
          default:
            return '';
        }
      }}
    />
  );
};

export default GradeTable;
