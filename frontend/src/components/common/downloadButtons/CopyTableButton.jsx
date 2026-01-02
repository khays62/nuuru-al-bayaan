import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import ActionButton from '../ActionButton';
import { exportTableToClipboard } from '../../../utils/exportTable';

export default function CopyTableButton({ getPayload, disabled = false }) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const payload = await (typeof getPayload === 'function' ? getPayload() : null);
      if (!payload) return;

      // TSV works best for pasting into Excel.
      await exportTableToClipboard({
        title: payload.title || '',
        subtitle: payload.subtitle || '',
        headers: payload.headers || [],
        rows: payload.rows || [],
        delimiter: '\t',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ActionButton
      variant="neutral"
      className="!bg-blue-600 !text-white !border-blue-600 hover:!bg-blue-700 hover:!text-white"
      icon={<Copy size={16} />}
      disabled={disabled || busy}
      onClick={run}
      title="Copy"
    >
      Copy
    </ActionButton>
  );
}
