import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function DropdownSelect({
  value,
  onChange,
  options = [],
  disabled = false,
  className = '',
  placeholder = 'Select…',
  id,
  name,
  maxHeightClassName = 'max-h-64',
  buttonProps = {},
  hideSelectedOption = true,
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

  const safeOptions = useMemo(() => (Array.isArray(options) ? options : []).map((o) => ({
    value: String(o?.value ?? ''),
    label: String(o?.label ?? ''),
  })), [options]);

  const selectedLabel = useMemo(() => {
    const v = String(value || '');
    if (!v) return '';
    const found = safeOptions.find((o) => o.value === v);
    return found?.label || '';
  }, [safeOptions, value]);

  const onPick = (next) => {
    onChange?.(next);
    setOpen(false);
  };

  const listOptions = useMemo(() => {
    if (!hideSelectedOption) return safeOptions;
    const v = String(value || '');
    if (!v) return safeOptions;
    return safeOptions.filter((o) => o.value !== v);
  }, [safeOptions, value, hideSelectedOption]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={
          `w-full inline-flex items-center justify-between gap-2 border border-gray-300 rounded-md shadow-sm bg-white/90 px-3 py-2 text-sm ` +
          `focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 ` +
          className
        }
        {...buttonProps}
      >
        <span className={`truncate ${selectedLabel ? 'text-gray-800' : 'text-gray-500'}`}>{selectedLabel || placeholder}</span>
        <ChevronDown size={18} className="text-gray-500" />
      </button>

      {open && !disabled ? (
        <div className="absolute right-0 left-0 mt-2 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden z-50">
          <div className={`${maxHeightClassName} overflow-auto`}>
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => onPick('')}
            >
              {placeholder}
            </button>

            {listOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No options.</div>
            ) : (
              listOptions.map((o) => {
                const active = String(value || '') === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    className={
                      `w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ` +
                      (active ? 'bg-gray-100 text-gray-900' : 'text-gray-700')
                    }
                    onClick={() => onPick(o.value)}
                  >
                    {o.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
