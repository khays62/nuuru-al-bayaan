import React, { useState } from 'react';
import { FileDown } from 'lucide-react';
import ActionButton from '../ui/ActionButton';
import { exportTableToCSV, exportTableToExcel, exportTableToPDF } from '../../../utils/exportTable';
import { useI18n } from '../../../i18n/useI18n';

function withExtension(filename, ext) {
  const base = String(filename || '').trim();
  const safeExt = String(ext || '').trim();
  if (!safeExt) return base;

  const withoutKnown = base.replace(/\.(pdf|xlsx|csv)$/i, '');
  const hasExact = base.toLowerCase().endsWith(safeExt.toLowerCase());
  if (hasExact) return base;
  return `${withoutKnown}${safeExt}`;
}

export default function ExportButtons({
  getPayload,
  disabled = false,
  className = '',
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const run = async (fn, ext) => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const payload = await (typeof getPayload === 'function' ? getPayload() : null);
      if (!payload) return;
      const next = ext ? { ...payload, filename: withExtension(payload.filename, ext) } : payload;
      await fn(next);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex flex-row flex-wrap items-center gap-2 ${className}`}> 
      <ActionButton
        variant="brand"
        icon={<FileDown size={16} />}
        disabled={disabled || busy}
        onClick={() => run(exportTableToPDF, '.pdf')}
        title={t('common.export.pdfTitle', { defaultValue: 'Export PDF' })}
      >
        PDF
      </ActionButton>
      <ActionButton
        variant="brand"
        icon={<FileDown size={16} />}
        disabled={disabled || busy}
        onClick={() => run(exportTableToExcel, '.xlsx')}
        title={t('common.export.excelTitle', { defaultValue: 'Export Excel' })}
      >
        Excel
      </ActionButton>
      <ActionButton
        variant="brand"
        icon={<FileDown size={16} />}
        disabled={disabled || busy}
        onClick={() => run(exportTableToCSV, '.csv')}
        title={t('common.export.csvTitle', { defaultValue: 'Export CSV' })}
      >
        CSV
      </ActionButton>
    </div>
  );
}
