import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import ActionButton from '../../ui/ActionButton';
import { exportTableToClipboard } from '../../../../utils/exportTable';
import { useI18n } from '../../../../i18n/useI18n';

export default function CopyTableButton({ getPayload, disabled = false, className = '', size = 'md', variant = 'outline' }) {
  const { t } = useI18n();
  const label = t('common.actions.copy', { defaultValue: 'Copy' });
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const payload = await (typeof getPayload === 'function' ? getPayload() : null);
      if (!payload) return;

      // TSV works best for pasting into Excel.
      await exportTableToClipboard({
        headers: payload.headers || [],
        rows: payload.rows || [],
        tables: Array.isArray(payload.tables) ? payload.tables : null,
        includeMeta: true,
        delimiter: '\t',
      });
    } catch (e) {
      console.error('Copy failed:', e);
      toast.error(e?.message || t('common.errors.copyFailed', { defaultValue: 'Copy failed' }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ActionButton
      variant={variant}
      size={size}
      className={className}
      icon={<Copy size={16} />}
      disabled={disabled || busy}
      onClick={run}
      title={label}
      aria-label={label}
    >
      <span className="sr-only sm:not-sr-only">{label}</span>
    </ActionButton>
  );
}
