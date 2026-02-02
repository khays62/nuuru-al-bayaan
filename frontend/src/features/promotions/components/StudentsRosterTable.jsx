import React, { useMemo } from 'react';
import Card from '../../../shared/components/ui/Card.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox';
import Chip from '../../../shared/components/ui/Chip.jsx';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';

export default function StudentsRosterTable({
  filtersReady,
  students,
  studentsLoading,
  studentsError,
  selectedIds,
  setSelectedIds,
  formatCurrent,
}) {
  const safeStudents = Array.isArray(students) ? students : [];

  const allSelected = useMemo(
    () => safeStudents.length > 0 && selectedIds?.size === safeStudents.length,
    [safeStudents, selectedIds]
  );

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(safeStudents.map((s) => s._id)));
  };

  const toggleSelected = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const studentsColumns = useMemo(
    () => [
      {
        key: 'select',
        label: '',
        thClassName: 'p-2 border-b border-gray-200 w-10',
        tdClassName: 'p-2',
      },
      {
        key: 'student',
        label: 'Student',
        thClassName: 'p-2 text-left border-b border-gray-200',
        tdClassName: 'p-2 whitespace-nowrap font-medium text-gray-700',
      },
      {
        key: 'current',
        label: 'Current',
        thClassName: 'p-2 text-left border-b border-gray-200',
        tdClassName: 'p-2 text-xs text-gray-600',
      },
      {
        key: 'cohort',
        label: 'Cohort',
        thClassName: 'p-2 text-left border-b border-gray-200',
        tdClassName: 'p-2',
      },
    ],
    []
  );

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Students</h3>
        <label className="inline-flex items-center gap-2 text-sm">
          <Checkbox
            checked={allSelected}
            onChange={toggleSelectAll}
            disabled={!filtersReady || safeStudents.length === 0}
          />
          <span>Select All</span>
        </label>
      </div>

      <div className="max-h-130 overflow-auto">
        <StandardTable
          isLoading={studentsLoading}
          error={studentsError}
          items={safeStudents}
          isEmpty={!studentsLoading && !studentsError && (!filtersReady || safeStudents.length === 0)}
          loadingMessage="Loading students..."
          loadingVariant="table"
          loadingRows={7}
          loadingColumns={4}
          emptyTitle={!filtersReady ? 'Select filters to load students' : 'No students found'}
          emptyDescription={!filtersReady ? 'Select AY, Grade, Shift, Section and Cohort.' : ''}
          rows={safeStudents}
          columns={studentsColumns}
          getRowKey={(s) => s._id}
          renderCell={(s, col) => {
            switch (col.key) {
              case 'select':
                return (
                  <Checkbox
                    checked={selectedIds.has(s._id)}
                    onChange={() => toggleSelected(s._id)}
                    disabled={!filtersReady}
                  />
                );
              case 'student':
                return (
                  <span className="whitespace-nowrap">
                    {s.studentId} — {s.fullName}
                  </span>
                );
              case 'current':
                return formatCurrent(s.current || {}) || '-';
              case 'cohort':
                return <Chip>{s.current?.cohort || '-'}</Chip>;
              default:
                return '';
            }
          }}
          tableProps={{
            theadClassName: 'bg-gray-50',
            useDefaultHeaderStyles: false,
            baseRowClassName: 'border-b border-gray-200 hover:bg-gray-50 transition-colors',
          }}
        />
      </div>
    </Card>
  );
}
