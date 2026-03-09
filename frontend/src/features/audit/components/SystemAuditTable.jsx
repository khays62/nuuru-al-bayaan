import React, { useEffect, useMemo, useState } from 'react';
import { Eye } from 'lucide-react';

import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import Modal from '../../../shared/components/ui/Modal.jsx';
import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import Card from '../../../shared/components/ui/Card.jsx';
import { useClientSort } from '../../../shared/hooks/useClientSort.js';
import {
  formatAuditDescription,
  formatDeviceDisplay,
  formatIpDisplay,
  prettifyAuditAction,
} from '../../../shared/utils/auditFormat.js';
import { useI18n } from '../../../i18n/useI18n';

const actorLabel = (row) => {
  const a = row?.actor;
  const name = String(a?.fullName || '').trim();
  const username = String(a?.username || '').trim();
  return name || username || '-';
};

const actorRole = (row) => {
  const r = String(row?.actor?.role || '').trim().toLowerCase();
  return r || '-';
};

export default function SystemAuditTable({
  logs = [],
  isLoading = false,
  error = null,
  meta = null,
  onPage,
  onLimit,
  storageKey = 'audit:system:columns:v1',
  emptyTitle,
  emptyDescription,
  paginationProps,
  loadingMessage = '',
  enableRowDetails = true,
  detailPanelClassName = 'max-w-5xl',
  detailOverlayClassName = '',
}) {
  const { t } = useI18n();

  const resolvedEmptyTitle = emptyTitle ?? t('common.audit.system.emptyTitle', { defaultValue: 'No activity.' });
  const resolvedEmptyDescription = emptyDescription ?? t('common.audit.system.emptyDescription', { defaultValue: 'No recorded events for this range.' });

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
        case 'actor':
          return actorLabel(row).toLowerCase();
        case 'action':
          return String(prettifyAuditAction(row?.action, { t }) || row?.action || '').toLowerCase();
        case 'timestamp':
        default:
          return new Date(row?.timestamp || 0).getTime();
      }
    },
  });

  const labels = useMemo(() => {
    const unknownDevice = t('common.audit.unknownDevice', { defaultValue: 'Unknown device' });

    return {
      actor: t('common.audit.labels.user', { defaultValue: 'User' }),
      action: t('common.audit.labels.action', { defaultValue: 'Action' }),
      description: t('common.audit.labels.description', { defaultValue: 'Description' }),
      ip: t('common.audit.labels.ip', { defaultValue: 'IP' }),
      device: t('common.audit.labels.device', { defaultValue: 'Device' }),
      time: t('common.audit.labels.time', { defaultValue: 'Time' }),
      viewDetails: t('common.audit.viewDetails', { defaultValue: 'View details' }),
      detailsTitle: t('common.audit.detailsTitle', { defaultValue: 'Audit Details' }),
      raw: t('common.audit.labels.raw', { defaultValue: 'Raw' }),
      role: t('common.audit.labels.role', { defaultValue: 'Role' }),
      unknownDevice,
    };
  }, [t]);

  const columns = useMemo(() => ([
    { key: 'actor', label: labels.actor, sortable: true, field: 'actor' },
    { key: 'action', label: labels.action, sortable: true, field: 'action' },
    { key: 'description', label: labels.description, sortable: false, field: 'description' },
    { key: 'timestamp', label: labels.time, sortable: true, field: 'timestamp' },
    ...(enableRowDetails
      ? [{ key: 'view', label: '', sortable: false, field: 'view', align: 'right', noPrint: true, tdClassName: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium border-x border-(--nb-color-border) no-print' }]
      : []),
  ]), [enableRowDetails, labels]);

  const openRow = (row) => {
    setSelected(row || null);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setSelected(null);
  };

  useEffect(() => {
    setOpen(false);
    setSelected(null);
  }, [logs, meta?.page, meta?.limit, meta?.total]);

  const selectedActor = selected ? actorLabel(selected) : '-';
  const selectedRole = selected ? actorRole(selected) : '-';

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
        loadingMessage={loadingMessage}
        columns={columns}
        storageKey={storageKey}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
        controlsProps={controlsProps}
        meta={meta || undefined}
        onPage={onPage}
        onLimit={onLimit}
        paginationProps={effectivePaginationProps}
        getRowKey={(r) => `${r.timestamp || ''}-${r.action || ''}-${r.actor?.id || ''}`}
        renderCell={(r, col) => {
          switch (col.key) {
            case 'actor':
              return (
                <div className="min-w-0">
                  <div className="text-sm font-medium text-(--nb-color-text) truncate" title={actorLabel(r)}>
                    {actorLabel(r)}
                  </div>
                  <div className="text-[11px] text-(--nb-color-muted) truncate" title={actorRole(r)}>
                    {actorRole(r)}
                  </div>
                </div>
              );
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
            case 'timestamp':
              return r?.timestamp ? new Date(r.timestamp).toLocaleString() : '-';
            case 'view':
              return enableRowDetails ? (
                <ActionButton
                  variant="neutral"
                  title={labels.viewDetails}
                  icon={<Eye size={16} />}
                  onClick={() => openRow(r)}
                  className="px-2"
                />
              ) : null;
            default:
              return '';
          }
        }}
      />

      <Modal
        isOpen={open}
        onClose={close}
        title={labels.detailsTitle}
        overlayClassName={detailOverlayClassName}
        panelClassName={detailPanelClassName}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="text-xs text-(--nb-color-muted) mb-1">{labels.actor}</div>
            <div className="font-medium">{selectedActor}</div>
            <div className="mt-2 text-xs text-(--nb-color-muted) mb-1">{labels.role}</div>
            <div className="font-medium">{selectedRole}</div>
          </Card>

          <Card className="p-4">
            <div className="text-xs text-(--nb-color-muted) mb-1">{labels.time}</div>
            <div className="font-medium">{selectedTime}</div>
          </Card>

          <Card className="p-4">
            <div className="text-xs text-(--nb-color-muted) mb-1">{labels.action}</div>
            <div className="font-medium">{selectedPrettyAction}</div>
            <div className="mt-2 text-xs text-(--nb-color-muted)">{labels.raw}</div>
            <div className="font-mono text-xs break-all">{String(selected?.action || '-')}</div>
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
