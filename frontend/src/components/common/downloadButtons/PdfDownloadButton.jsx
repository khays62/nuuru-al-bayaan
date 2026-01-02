import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileDown, ChevronDown } from 'lucide-react';
import ActionButton from '../ActionButton';
import { exportTableToPDF } from '../../../utils/exportTable';

export default function PdfDownloadButton({
  getPayload,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef(null);

  const options = useMemo(() => ([
    { key: 'landscape', label: 'PDF (Landscape)', orientation: 'landscape' },
    { key: 'portrait', label: 'PDF (Portrait)', orientation: 'portrait' },
  ]), []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const run = async (orientation) => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const payload = await (typeof getPayload === 'function' ? getPayload() : null);
      if (!payload) return;
      await exportTableToPDF({ ...payload, orientation });
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <ActionButton
        variant="neutral"
        className="!bg-blue-600 !text-white !border-blue-600 hover:!bg-blue-700 hover:!text-white"
        icon={<FileDown size={16} />}
        disabled={disabled || busy}
        onClick={() => setOpen((v) => !v)}
        title="PDF"
      >
        <span className="inline-flex items-center gap-1">
          PDF <ChevronDown size={16} />
        </span>
      </ActionButton>

      {open && !disabled ? (
        <div className="absolute right-0 mt-2 w-44 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden z-50">
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => run(opt.orientation)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
