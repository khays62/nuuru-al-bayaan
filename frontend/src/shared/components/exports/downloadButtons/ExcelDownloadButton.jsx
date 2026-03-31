import React, { useState } from 'react';
import { FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import ActionButton from '../../ui/ActionButton';
import { exportTableToExcel } from '../../../../utils/exportTable';
import { useI18n } from '../../../../i18n/useI18n';

export default function ExcelDownloadButton({ getPayload, disabled = false, className = '', size = 'md', variant = 'outline' }) {
  const { t } = useI18n();
  const label = t('common.export.excel', { defaultValue: 'Excel' });
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const payload = await (typeof getPayload === 'function' ? getPayload() : null);
      if (!payload) return;

      const filename = String(payload.filename || 'export.pdf').replace(/\.pdf$/i, '.xlsx');
      // Support multi-sheet exports when payload provides `sheets`.
      if (Array.isArray(payload.sheets) && payload.sheets.length > 0) {
        await exportTableToExcel({
          filename,
          headerImageSrc: payload.headerImageSrc || '',
          sheets: payload.sheets,
        });
      } else {
        await exportTableToExcel({
          filename,
          sheetName: payload.sheetName || 'Sheet1',
          title: payload.title || '',
          subtitle: payload.subtitle || '',
          headerImageSrc: payload.headerImageSrc || '',
          headers: payload.headers || [],
          rows: payload.rows || [],
        });
      }
    } catch (e) {
      // Most common cause of â€œno downloadâ€: runtime exception while building XLSX.
      // Surface the error so we can fix it quickly.
      console.error('Excel export failed:', e);
      toast.error(e?.message || t('common.export.excelFailed', { defaultValue: 'Excel export failed' }));
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
