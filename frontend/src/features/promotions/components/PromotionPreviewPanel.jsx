import React, { useMemo } from 'react';
import Card from '../../../shared/components/ui/Card.jsx';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import { useI18n } from '../../../i18n/I18nProvider';

export default function PromotionPreviewPanel({
  preview,
  formatFrom,
  formatTo,
}) {
  const { t } = useI18n();
  const previewColumns = useMemo(
    () => [
      { key: 'student', label: t('promotions.preview.columns.student', { defaultValue: 'Student' }), thClassName: 'p-2 text-left border-b border-gray-200', tdClassName: 'p-2' },
      { key: 'from', label: t('promotions.preview.columns.from', { defaultValue: 'From' }), thClassName: 'p-2 text-left border-b border-gray-200', tdClassName: 'p-2' },
      { key: 'to', label: t('promotions.preview.columns.to', { defaultValue: 'To' }), thClassName: 'p-2 text-left border-b border-gray-200', tdClassName: 'p-2' },
      { key: 'avg', label: t('promotions.preview.columns.avg', { defaultValue: 'Avg' }), thClassName: 'p-2 text-left border-b border-gray-200', tdClassName: 'p-2 text-xs' },
      { key: 'failed', label: t('promotions.preview.columns.failed', { defaultValue: 'Failed' }), thClassName: 'p-2 text-left border-b border-gray-200', tdClassName: 'p-2 text-xs' },
      { key: 'status', label: t('common.filters.status', { defaultValue: 'Status' }), thClassName: 'p-2 text-left border-b border-gray-200', tdClassName: 'p-2' },
    ],
    [t]
  );

  return (
    <Card className="p-3">
      <h3 className="font-semibold mb-2">{t('common.actions.preview', { defaultValue: 'Preview' })}</h3>

      {!preview ? (
        <div className="text-gray-500">{t('promotions.preview.empty', { defaultValue: 'Run Preview to see targets, auto-create needs, and graduations' })}</div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <div>{t('promotions.preview.summary.total', { defaultValue: 'Total' })}: <b>{preview.summary.total}</b></div>
            <div>{t('promotions.preview.summary.promotable', { defaultValue: 'Promotable' })}: <b className="text-emerald-700">{preview.summary.promotable}</b></div>
            <div>{t('promotions.preview.summary.graduates', { defaultValue: 'Graduates' })}: <b className="text-blue-700">{preview.summary.graduates}</b></div>
            <div>{t('promotions.preview.summary.missingTargets', { defaultValue: 'Missing Targets' })}: <b className="text-amber-700">{preview.summary.missingTargets}</b></div>
            <div>{t('promotions.preview.summary.capacityIssues', { defaultValue: 'Capacity Issues' })}: <b className="text-red-700">{preview.summary.capacityIssues}</b></div>
          </div>

          <div className="border rounded max-h-130 overflow-auto">
            <StandardTable
              isLoading={false}
              error={null}
              items={preview.items}
              isEmpty={false}
              rows={preview.items}
              columns={previewColumns}
              getRowKey={(_, idx) => idx}
              renderCell={(it, col) => {
                const from = it.fromGS || {};
                const target = it.target || {};

                switch (col.key) {
                  case 'student':
                    return `${it.studentId} — ${it.fullName}`;
                  case 'from':
                    return formatFrom(from) || '-';
                  case 'to':
                    return formatTo(target) || '-';
                  case 'avg':
                    return typeof it.overallAvg === 'number' ? it.overallAvg.toFixed(1) : '-';
                  case 'failed':
                    return typeof it.failedSubjects === 'number' ? it.failedSubjects : '-';
                  case 'status':
                    return it.action === 'graduate' ? (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{t('promotions.preview.status.graduate', { defaultValue: 'Graduate' })}</span>
                    ) : (Array.isArray(it.errors) && it.errors.includes('BELOW_MIN_AVG')) || it.action === 'stay' ? (
                      <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">{t('promotions.preview.status.notEligible', { defaultValue: 'Not eligible (avg < 60)' })}</span>
                    ) : !it.toGS ? (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">{t('promotions.preview.status.missingGs', { defaultValue: 'Missing GS (will be auto-created on promote)' })}</span>
                    ) : (
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded">{t('common.status.ok', { defaultValue: 'OK' })}</span>
                    );
                  default:
                    return '';
                }
              }}
              tableProps={{
                theadClassName: 'bg-gray-50',
                useDefaultHeaderStyles: false,
                baseRowClassName: 'border-b border-gray-200 hover:bg-gray-50 transition-colors',
                rowClassName: (it) => {
                  const failed = (Array.isArray(it.errors) && it.errors.includes('BELOW_MIN_AVG')) || it.action === 'stay';
                  const graduated = it.action === 'graduate';
                  return failed ? 'bg-red-50' : (graduated ? 'bg-blue-50' : 'bg-white');
                },
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
