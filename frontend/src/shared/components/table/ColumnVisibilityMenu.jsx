import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Columns, Check, ChevronDown } from 'lucide-react';
import ActionButton from '../ui/ActionButton.jsx';

export default function ColumnVisibilityMenu({
  columns = [],
  visible = {},
  onToggle,
  className = '',
  buttonClassName = '',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const cols = useMemo(() => (Array.isArray(columns) ? columns : []).filter(Boolean), [columns]);

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <ActionButton
        variant="neutral"
        onClick={() => setOpen((v) => !v)}
        title="Choose columns"
        icon={<Columns size={16} />}
        className={
          (`bg-white! text-blue-700! border-blue-400! hover:bg-blue-50! ` + buttonClassName).trim()
        }
      >
        <span>Columns</span>
        <ChevronDown size={16} className="text-blue-700" />
      </ActionButton>

      {open ? (
        <div className="absolute right-0 mt-2 w-64 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden z-50">
          <div className="max-h-72 overflow-auto">
            {cols.map((c) => {
              const key = String(c.key);
              const checked = visible?.[key] !== false;
              const disabled = c.locked === true;
              return (
                <button
                  key={key}
                  type="button"
                  className={
                    (`w-full px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ` +
                      (disabled ? 'opacity-60 cursor-not-allowed ' : 'cursor-pointer ')).trim()
                  }
                  onClick={() => {
                    if (disabled) return;
                    onToggle?.(key);
                  }}
                >
                  <span className="text-gray-800">{c.label}</span>
                  <span className={checked ? 'text-blue-700' : 'text-transparent'}>
                    <Check size={16} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
