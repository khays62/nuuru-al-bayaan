import React, { useState } from 'react';
import { FileDown } from 'lucide-react';
import ActionButton from './ActionButton';
import { exportTableToCSV, exportTableToExcel, exportTableToPDF } from '../../utils/exportTable';

export default function ExportButtons({
  getPayload,
  disabled = false,
  className = '',
}) {
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const payload = await (typeof getPayload === 'function' ? getPayload() : null);
      if (!payload) return;
      fn(payload);
    } finally {
      setBusy(false);
    }
  };

  const baseBtn = ' !bg-blue-600 !text-white !border-blue-600 hover:!bg-blue-700 hover:!text-white ';

  return (
    <div className={`flex flex-row flex-wrap items-center gap-2 ${className}`}> 
      <ActionButton
        variant="neutral"
        className={baseBtn}
        icon={<FileDown size={16} />}
        disabled={disabled || busy}
        onClick={() => run(exportTableToPDF)}
        title="Export PDF"
      >
        PDF
      </ActionButton>
      <ActionButton
        variant="neutral"
        className={baseBtn}
        icon={<FileDown size={16} />}
        disabled={disabled || busy}
        onClick={() => run(exportTableToExcel)}
        title="Export Excel"
      >
        Excel
      </ActionButton>
      <ActionButton
        variant="neutral"
        className={baseBtn}
        icon={<FileDown size={16} />}
        disabled={disabled || busy}
        onClick={() => run(exportTableToCSV)}
        title="Export CSV"
      >
        CSV
      </ActionButton>
    </div>
  );
}
