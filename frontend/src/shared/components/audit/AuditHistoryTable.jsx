import React, { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';

import StandardTable from '../table/StandardTable.jsx';
import Modal from '../ui/Modal.jsx';
import ActionButton from '../ui/ActionButton.jsx';
import Card from '../ui/Card.jsx';
import { useClientSort } from '../../hooks/useClientSort.js';
import { formatAuditDescription, formatDeviceDisplay, formatIpDisplay, prettifyAuditAction } from '../../utils/auditFormat.js';

export default function AuditHistoryTable({
  logs = [],
  isLoading = false,
  error = null,
  meta = null,
  onPage,
  onLimit,
  showRowsSelector = false,
  storageKey = 'audit:history:columns:v1',
  emptyTitle = 'No audit history.',
  emptyDescription = 'No recorded actions yet.',
  paginationProps,
}) {
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
          return String(prettifyAuditAction(row?.action) || row?.action || '').toLowerCase();
        case 'ip':
          return String(formatIpDisplay(row?.ip) || row?.ip || '').toLowerCase();
        case 'device':
          return String(formatDeviceDisplay(row?.device) || row?.device || '').toLowerCase();
        case 'timestamp':
        default:
          return new Date(row?.timestamp || 0).getTime();
      }
    },
  });

  const columns = useMemo(() => ([
    { key: 'action', label: 'Action', sortable: true, field: 'action', tdClassName: 'px-6 py-4 text-sm font-medium text-gray-900 border-x border-gray-200' },
    { key: 'description', label: 'Description', sortable: false, field: 'description' },
    { key: 'ip', label: 'IP', sortable: true, field: 'ip' },
    { key: 'device', label: 'Device', sortable: true, field: 'device' },
    { key: 'timestamp', label: 'Time', sortable: true, field: 'timestamp' },
    { key: 'view', label: '', sortable: false, field: 'view', align: 'right', noPrint: true, tdClassName: 'px-6 py-4 whitespace-nowrap text-right text-sm font-medium border-x border-gray-200 no-print' },
  ]), []);

  const openRow = (row) => {
    setSelected(row || null);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setSelected(null);
  };

  const selectedPrettyAction = selected ? (prettifyAuditAction(selected.action) || selected.action || '-') : '-';
  const selectedPrettyDesc = selected ? (formatAuditDescription(selected) || selected.description || '-') : '-';
  const selectedPrettyIp = selected ? (formatIpDisplay(selected.ip) || selected.ip || '-') : '-';
  const selectedPrettyDevice = selected ? (formatDeviceDisplay(selected.device) || selected.device || 'Unknown device') : 'Unknown device';
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
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
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
                  {prettifyAuditAction(r?.action) || r?.action || '-'}
                </span>
              );
            case 'description':
              return (
                <span title={String(r?.description || '')} className="block max-w-180 truncate">
                  {formatAuditDescription(r) || r?.description || '-'}
                </span>
              );
            case 'ip':
              return (
                <span title={String(r?.ip || '')} className="font-mono text-xs break-all">
                  {formatIpDisplay(r?.ip) || r?.ip || '-'}
                </span>
              );
            case 'device':
              return (
                <span title={String(r?.device || '')} className="block max-w-90 truncate">
                  {formatDeviceDisplay(r?.device) || r?.device || 'Unknown device'}
                </span>
              );
            case 'timestamp':
              return r?.timestamp ? new Date(r.timestamp).toLocaleString() : '-';
            case 'view':
              return (
                <ActionButton
                  variant="neutral"
                  title="View details"
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
        title="Audit Details"
        panelClassName="max-w-3xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="text-xs text-slate-500 mb-1">Action</div>
            <div className="font-medium">{selectedPrettyAction}</div>
            <div className="mt-2 text-xs text-slate-500">Raw</div>
            <div className="font-mono text-xs break-all">{String(selected?.action || '-')}</div>
          </Card>

          <Card className="p-4">
            <div className="text-xs text-slate-500 mb-1">Time</div>
            <div className="font-medium">{selectedTime}</div>
          </Card>

          <Card className="p-4">
            <div className="text-xs text-slate-500 mb-1">IP</div>
            <div className="font-mono text-sm break-all">{selectedPrettyIp}</div>
            <div className="mt-2 text-xs text-slate-500">Raw</div>
            <div className="font-mono text-xs break-all">{String(selected?.ip || '-')}</div>
          </Card>

          <Card className="p-4">
            <div className="text-xs text-slate-500 mb-1">Device</div>
            <div className="font-medium">{selectedPrettyDevice}</div>
            <div className="mt-2 text-xs text-slate-500">Raw</div>
            <div className="font-mono text-xs break-all">{String(selected?.device || 'Unknown device')}</div>
          </Card>

          <Card className="p-4 md:col-span-2">
            <div className="text-xs text-slate-500 mb-1">Description</div>
            <div className="text-sm">{selectedPrettyDesc}</div>
            <div className="mt-2 text-xs text-slate-500">Raw</div>
            <div className="font-mono text-xs break-all whitespace-pre-wrap">{String(selected?.description || '-')}</div>
          </Card>
        </div>
      </Modal>
    </>
  );
}
