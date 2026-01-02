import React, { useState } from 'react';
import { FileDown } from 'lucide-react';
import ActionButton from '../ActionButton';
import { exportTableToCSV } from '../../../utils/exportTable';

export default function CsvDownloadButton({ getPayload, disabled = false }) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const payload = await (typeof getPayload === 'function' ? getPayload() : null);
      if (!payload) return;

      const filename = String(payload.filename || 'export.pdf').replace(/\.pdf$/i, '.csv');
      exportTableToCSV({
        filename,
        title: payload.title || '',
        subtitle: payload.subtitle || '',
        includeMetaRows: false,
        headers: payload.headers || [],
        rows: payload.rows || [],
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ActionButton
      variant="neutral"
      className="!bg-blue-600 !text-white !border-blue-600 hover:!bg-blue-700 hover:!text-white"
      icon={<FileDown size={16} />}
      disabled={disabled || busy}
      onClick={run}
      title="CSV"
    >
      CSV
    </ActionButton>
  );
}
