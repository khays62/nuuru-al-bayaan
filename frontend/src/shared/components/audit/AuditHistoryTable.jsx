import React, { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';

import StandardTable from '../table/StandardTable.jsx';
import Modal from '../ui/Modal.jsx';
import ActionButton from '../ui/ActionButton.jsx';
import Card from '../ui/Card.jsx';
import { useClientSort } from '../../hooks/useClientSort.js';
import { formatAuditDescription, formatDeviceDisplay, formatIpDisplay, prettifyAuditAction } from '../../utils/auditFormat.js';
import { useI18n } from '../../../i18n/I18nProvider.jsx';

export default function AuditHistoryTable({
  logs = [],
  isLoading = false,
  error = null,
  meta = null,
  onPage,
  onLimit,
  showRowsSelector = false,
  storageKey = 'audit:history:columns:v1',
  emptyTitle,
  emptyDescription,
  paginationProps,
}) {
  const { t } = useI18n();

  const resolvedEmptyTitle = emptyTitle ?? t('common.audit.history.emptyTitle', { defaultValue: 'No audit history.' });
  const resolvedEmptyDescription = emptyDescription ?? t('common.audit.history.emptyDescription', { defaultValue: 'No recorded actions yet.' });

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const rows = Array.isArray(logs) ? logs : [];

  const {
    sortBy,
    sortDir,
    onSort,
    sortedRows,
  } = useClientSort(rows, {
    initialSortBy: 'timestamp',
    initialSortDir: 'desc',
    getValue: (row, field) => {
      switch (field) {
        case 'action':
          return String(prettifyAuditAction(row?.action, { t }) || row?.action || '').toLowerCase();
        case 'ip':
          return String(formatIpDisplay(row?.ip, { t }) || row?.ip || '').toLowerCase();
        case 'device':
          return String(formatDeviceDisplay(row?.device, { t }) || row?.device || '').toLowerCase();
        case 'timestamp':
        default:
          return new Date(row?.timestamp || 0).getTime();
      }
    },
  });

  const labels = useMemo(() => {
    const unknownDevice = t('common.audit.unknownDevice', { defaultValue: 'Unknown device' });

    return {
      action: t('common.audit.labels.action', { defaultValue: 'Action' }),
      description: t('common.audit.labels.description', { defaultValue: 'Description' }),
      ip: t('common.audit.labels.ip', { defaultValue: 'IP' }),
      device: t('common.audit.labels.device', { defaultValue: 'Device' }),
      time: t('common.audit.labels.time', { defaultValue: 'Time' }),
      viewDetails: t('common.audit.viewDetails', { defaultValue: 'View details' }),
      detailsTitle: t('common.audit.detailsTitle', { defaultValue: 'Audit Details' }),
      raw: t('common.audit.labels.raw', { defaultValue: 'Raw' }),
      unknownDevice,
    };
  }, [t]);

  const columns = useMemo(() => ([
    { key: 'action', label: labels.action, sortable: true, field: 'action', tdClassName: 'px-6 py-4 text-sm font-medium text-(--nb-color-text) border-x border-(--nb-color-border)' },
    { key: 'description', label: labels.description, sortable: false, field: 'description' },
    { key: 'ip', label: labels.ip, sortable: true, field: 'ip' },
    { key: 'device', label: labels.device, sortable: true, field: 'device' },
    { key: 'timestamp', label: labels.time, sortable: true, field: 'timestamp' },
    { key: 'view', label: '', sortable: false, field: 'view', align: 'right', noPrint: true, tdClassName: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium border-x border-(--nb-color-border) no-print' },
  ]), [labels]);

  const openRow = (row) => {
    setSelected(row || null);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setSelected(null);
  };

  const selectedPrettyAction = selected ? (prettifyAuditAction(selected.action, { t }) || selected.action || '-') : '-';
  const selectedPrettyDesc = selected ? (formatAuditDescription(selected, { t }) || selected.description || '-') : '-';
  const selectedPrettyIp = selected ? (formatIpDisplay(selected.ip, { t }) || selected.ip || '-') : '-';
  const selectedPrettyDevice = selected
    ? (formatDeviceDisplay(selected.device, { t }) || selected.device || labels.unknownDevice)
    : labels.unknownDevice;
  const selectedTime = selected?.timestamp ? new Date(selected.timestamp).toLocaleString() : '-';

  const hasMeta = Boolean(meta);
  const effectivePaginationProps = {
    className: 'no-print',
    infoVariant: hasMeta ? 'page' : 'count',
    ...(paginationProps || {}),
  };

  // Single source of truth for "Rows" selector should be the table's sticky controls (top-left),
  // not the pagination bar (bottom-right). We enable it here when server meta is available.
  const controlsProps = hasMeta
    ? {
        limit: meta?.limit,
        total: meta?.total,
        onLimit,
        limits: [10, 20, 30, 40, 50, 100, 'all'],
        showRows: typeof onLimit === 'function',
        showColumns: true,
      }
    : undefined;

  return (
    <>
      <StandardTable
        isLoading={isLoading}
        error={error}
        items={sortedRows}
        rows={sortedRows}
        emptyTitle={resolvedEmptyTitle}
        emptyDescription={resolvedEmptyDescription}
        loadingVariant="table"
        columns={columns}
        storageKey={storageKey}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        controlsProps={controlsProps}
        meta={meta || undefined}
        onPage={onPage}
        onLimit={onLimit}
        showRowsSelector={showRowsSelector}
        paginationProps={effectivePaginationProps}
        getRowKey={(r) => `${r.timestamp || ''}-${r.action || ''}-${r.ip || ''}`}
        renderCell={(r, col) => {
          switch (col.key) {
            case 'action':
              return (
                <span title={String(r?.action || '')}>
                  {prettifyAuditAction(r?.action, { t }) || r?.action || '-'}
                </span>
              );
            case 'description':
              return (
                <span title={String(r?.description || '')} className="block max-w-180 truncate">
                  {formatAuditDescription(r, { t }) || r?.description || '-'}
                </span>
              );
            case 'ip':
              return (
                <span title={String(r?.ip || '')} className="font-mono text-xs break-all">
                  {formatIpDisplay(r?.ip, { t }) || r?.ip || '-'}
                </span>
              );
            case 'device':
              return (
                <span title={String(r?.device || '')} className="block max-w-90 truncate">
                  {formatDeviceDisplay(r?.device, { t }) || r?.device || labels.unknownDevice}
                </span>
              );
            case 'timestamp':
              return r?.timestamp ? new Date(r.timestamp).toLocaleString() : '-';
            case 'view':
              return (
                <ActionButton
                  variant="neutral"
                  title={labels.viewDetails}
                  icon={<Eye size={16} />}
                  onClick={() => openRow(r)}
                  className="px-2"
                />
              );
            default:
              return '';
          }
        }}
      />

      <Modal
        isOpen={open}
        onClose={close}
        title={labels.detailsTitle}
        panelClassName="max-w-3xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="text-xs text-(--nb-color-muted) mb-1">{labels.action}</div>
            <div className="font-medium">{selectedPrettyAction}</div>
            <div className="mt-2 text-xs text-(--nb-color-muted)">{labels.raw}</div>
            <div className="font-mono text-xs break-all">{String(selected?.action || '-')}</div>
          </Card>

          <Card className="p-4">
            <div className="text-xs text-(--nb-color-muted) mb-1">{labels.time}</div>
            <div className="font-medium">{selectedTime}</div>
          </Card>

          <Card className="p-4">
            <div className="text-xs text-(--nb-color-muted) mb-1">{labels.ip}</div>
            <div className="font-mono text-sm break-all">{selectedPrettyIp}</div>
            <div className="mt-2 text-xs text-(--nb-color-muted)">{labels.raw}</div>
            <div className="font-mono text-xs break-all">{String(selected?.ip || '-')}</div>
          </Card>

          <Card className="p-4">
            <div className="text-xs text-(--nb-color-muted) mb-1">{labels.device}</div>
            <div className="font-medium">{selectedPrettyDevice}</div>
            <div className="mt-2 text-xs text-(--nb-color-muted)">{labels.raw}</div>
            <div className="font-mono text-xs break-all">{String(selected?.device || labels.unknownDevice)}</div>
          </Card>

          <Card className="p-4 md:col-span-2">
            <div className="text-xs text-(--nb-color-muted) mb-1">{labels.description}</div>
            <div className="text-sm">{selectedPrettyDesc}</div>
            <div className="mt-2 text-xs text-(--nb-color-muted)">{labels.raw}</div>
            <div className="font-mono text-xs break-all whitespace-pre-wrap">{String(selected?.description || '-')}</div>
          </Card>
        </div>
      </Modal>
    </>
  );
}
