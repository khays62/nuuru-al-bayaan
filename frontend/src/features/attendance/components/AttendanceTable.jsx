import { useMemo } from 'react';
import { useI18n } from '../../../i18n/useI18n';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import { displayText } from '../../../utils/displayText.js';
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
  const { t } = useI18n();
  const effectiveCanEdit = canEdit ?? canAct;

  const colCount = showAuditColumns ? 5 : 3;

  const columns = useMemo(() => {
    const base = [
      {
        key: 'studentId',
        label: t('attendance.marking.table.columns.studentId'),
        thClassName: 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)',
        tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-(--nb-color-fg) border-x border-(--nb-color-border)',
      },
      {
        key: 'fullName',
        label: t('attendance.marking.table.columns.fullName'),
        thClassName: 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)',
        tdClassName: 'px-6 py-4 text-sm font-medium text-(--nb-color-text) border-x border-(--nb-color-border)',
      },
    ];

    const audit = showAuditColumns
      ? [
          {
            key: 'marked',
            label: t('attendance.marking.table.columns.marked'),
            thClassName: 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)',
            tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-(--nb-color-fg) border-x border-(--nb-color-border)',
          },
          {
            key: 'updated',
            label: t('attendance.marking.table.columns.updated'),
            thClassName: 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)',
            tdClassName: 'px-6 py-4 whitespace-nowrap text-sm text-(--nb-color-fg) border-x border-(--nb-color-border)',
          },
        ]
      : [];

    const status = [
      {
        key: 'status',
        label: t('attendance.marking.table.columns.status'),
        thClassName: 'px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)',
        tdClassName: 'px-6 py-4 whitespace-normal border-x border-(--nb-color-border)',
      },
    ];

    return [...base, ...audit, ...status];
  }, [showAuditColumns, t]);

  if (!canAct) return null;

  return (
    <StandardTable
      isLoading={loading}
      items={rows}
      loadingMessage={t('attendance.marking.table.loading')}
      loadingVariant="table"
      loadingRows={7}
      loadingColumns={colCount}
      emptyTitle={t('attendance.marking.table.empty')}

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
                <div className="font-medium">{displayText(stu?.audit?.markedBy?.name, '-')}</div>
                <div className="text-xs text-(--nb-color-muted)">{displayText(stu?.audit?.markedBy?.role, '')}{stu?.audit?.markedAt ? ` - ${new Date(stu.audit.markedAt).toLocaleString()}` : ''}</div>
              </div>
            );
          case 'updated':
            return (
              <div className="leading-tight">
                <div className="font-medium">{displayText(stu?.audit?.updatedBy?.name, '-')}</div>
                <div className="text-xs text-(--nb-color-muted)">{displayText(stu?.audit?.updatedBy?.role, '')}{stu?.audit?.updatedAt ? ` - ${new Date(stu.audit.updatedAt).toLocaleString()}` : ''}</div>
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
        theadClassName: 'bg-(--nb-color-brand)',
        useDefaultHeaderStyles: false,
        baseRowClassName: 'border-t border-(--nb-color-border) odd:bg-(--nb-color-bg-card) even:bg-(--nb-color-bg) hover:bg-(--nb-color-bg-card) transition-colors',
      }}
    />
  );
}
