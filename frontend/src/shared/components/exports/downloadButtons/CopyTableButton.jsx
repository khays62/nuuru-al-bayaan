import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import ActionButton from '../../ui/ActionButton';
import { exportTableToClipboard } from '../../../../utils/exportTable';

export default function CopyTableButton({ getPayload, disabled = false, className = '' }) {
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
      // eslint-disable-next-line no-console
      console.error('Copy failed:', e);
      toast.error(e?.message || 'Copy failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ActionButton
      variant="brand"
      className={className}
      icon={<Copy size={16} />}
      disabled={disabled || busy}
      onClick={run}
      title="Copy"
    >
      Copy
    </ActionButton>
  );
}
