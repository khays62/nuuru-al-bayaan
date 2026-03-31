import React, { useState } from 'react';
import { FileDown } from 'lucide-react';
import ActionButton from '../../ui/ActionButton';
import { exportTableToCSV } from '../../../../utils/exportTable';
import { useI18n } from '../../../../i18n/useI18n';

export default function CsvDownloadButton({ getPayload, disabled = false, className = '', size = 'md', variant = 'outline' }) {
  const { t } = useI18n();
  const label = t('common.export.csv', { defaultValue: 'CSV' });
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const payload = await (typeof getPayload === 'function' ? getPayload() : null);
      if (!payload) return;

      const filename = String(payload.filename || 'export.csv').replace(/\.pdf$/i, '.csv');
      if (Array.isArray(payload.tables) && payload.tables.length > 0) {
        exportTableToCSV({
          filename,
          tables: payload.tables,
        });
      } else {
        exportTableToCSV({
          filename,
          title: payload.title || '',
          subtitle: payload.subtitle || '',
          includeMetaRows: false,
          headers: payload.headers || [],
          rows: payload.rows || [],
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ActionButton
      variant={variant}
      size={size}
      className={className}
      icon={<FileDown size={16} />}
      disabled={disabled || busy}
      onClick={run}
      title={label}
      aria-label={label}
    >
      <span className="sr-only sm:not-sr-only">{label}</span>
    </ActionButton>
  );
}
