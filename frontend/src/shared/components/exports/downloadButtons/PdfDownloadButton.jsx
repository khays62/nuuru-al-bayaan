import React, { useState } from 'react';
import { FileDown } from 'lucide-react';
import ActionButton from '../../ui/ActionButton';
import { exportTableToPDF } from '../../../../utils/exportTable';

export default function PdfDownloadButton({
  getPayload,
  disabled = false,
  className = '',
  orientation = 'landscape',
}) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const payload = await (typeof getPayload === 'function' ? getPayload() : null);
      if (!payload) return;
      await exportTableToPDF({ ...payload, orientation });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ActionButton
      variant="brand"
      className={className}
      icon={<FileDown size={16} />}
      disabled={disabled || busy}
      onClick={run}
      title="PDF"
    >
      PDF
    </ActionButton>
  );
}
