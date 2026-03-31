import React, { useState } from 'react';
import { FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import ActionButton from '../../ui/ActionButton';
import { exportTableToPDF } from '../../../../utils/exportTable';
import { useI18n } from '../../../../i18n/useI18n';

export default function PdfDownloadButton({
  getPayload,
  disabled = false,
  className = '',
  size = 'md',
  orientation = 'landscape',
  variant = 'outline',
}) {
  const { t } = useI18n();
  const label = t('common.export.pdf', { defaultValue: 'PDF' });
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const payload = await (typeof getPayload === 'function' ? getPayload() : null);
      if (!payload) return;
      await exportTableToPDF({ ...payload, orientation });
    } catch (e) {
      console.error('PDF export failed:', e);
      toast.error(e?.message || t('common.export.pdfFailed', { defaultValue: 'PDF export failed' }));
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
