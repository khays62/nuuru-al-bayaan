import { useMemo } from 'react';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import AttendanceStatusPills from './AttendanceStatusPills';

export default function AttendanceTable({
  canAct,
  canEdit,
  loading,
  rows,
  showAuditColumns,
  onChangeStatus,
  onChangeRemarks,
  onPickExtraStatus,
}) {
  const effectiveCanEdit = canEdit ?? canAct;

  const colCount = showAuditColumns ? 5 : 3;

  const columns = useMemo(() => {
    const base = [
      {
        key: 'studentId',
        label: 'Student ID',
        thClassName: 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700',
        tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200',
      },
      {
        key: 'fullName',
        label: 'Full Name',
        thClassName: 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700',
        tdClassName: 'px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200',
      },
    ];

    const audit = showAuditColumns
      ? [
          {
            key: 'marked',
            label: 'Marked',
            thClassName: 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700',
            tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200',
          },
          {
            key: 'updated',
            label: 'Updated',
            thClassName: 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700',
            tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200',
          },
        ]
      : [];

    const status = [
      {
        key: 'status',
        label: 'Status',
        thClassName: 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-gray-700',
        tdClassName: 'px-6 py-4 whitespace-normal border-x border-gray-200',
      },
    ];

    return [...base, ...audit, ...status];
  }, [showAuditColumns]);

  if (!canAct) return null;

  return (
    <StandardTable
      isLoading={loading}
      items={rows}
      loadingMessage="Loading students..."
      loadingVariant="table"
      loadingRows={7}
      loadingColumns={colCount}
      emptyTitle="No students found for this selection."

      rows={rows}
      columns={columns}
      getRowKey={(stu) => stu._id || stu.studentId}
      renderCell={(stu, col) => {
        switch (col.key) {
          case 'studentId':
            return stu.studentId;
          case 'fullName':
            return stu.fullName;
          case 'marked':
            return (
              <div className="leading-tight">
                <div className="font-medium">{stu?.audit?.markedBy?.name || '—'}</div>
                <div className="text-xs text-gray-500">{stu?.audit?.markedBy?.role || ''}{stu?.audit?.markedAt ? ` • ${new Date(stu.audit.markedAt).toLocaleString()}` : ''}</div>
              </div>
            );
          case 'updated':
            return (
              <div className="leading-tight">
                <div className="font-medium">{stu?.audit?.updatedBy?.name || '—'}</div>
                <div className="text-xs text-gray-500">{stu?.audit?.updatedBy?.role || ''}{stu?.audit?.updatedAt ? ` • ${new Date(stu.audit.updatedAt).toLocaleString()}` : ''}</div>
              </div>
            );
          case 'status':
            return (
              <AttendanceStatusPills
                value={stu.status}
                remarks={stu.remarks}
                disabled={!effectiveCanEdit}
                onChange={(next) => onChangeStatus(stu._id, next)}
                onChangeRemarks={(val) => onChangeRemarks(stu._id, val)}
                onPickExcusedPreset={(label) => onPickExtraStatus(stu._id, label)}
              />
            );
          default:
            return '';
        }
      }}
      tableProps={{
        theadClassName: 'bg-gray-800',
        useDefaultHeaderStyles: false,
        baseRowClassName: 'odd:bg-white even:bg-gray-50 hover:bg-gray-50 transition-colors',
      }}
    />
  );
}
