import React, { useEffect, useRef, useState } from 'react';

export default function MultiSelectDropdown({ value = [], onChange, options = [], placeholder = 'Select...', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const toggle = () => setOpen(v => !v);
  const isChecked = (val) => Array.isArray(value) && value.includes(val);
  const toggleOption = (val) => {
    if (isChecked(val)) onChange(value.filter(v => v !== val));
    else onChange([...(value || []), val]);
  };
  const clearAll = () => onChange([]);

  const label = (Array.isArray(value) && value.length)
    ? options.filter(o => value.includes(o.value)).map(o => o.label).join(', ')
    : placeholder;

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button type="button" className="px-3 py-2 bg-white/90 border border-gray-300 rounded-md shadow-sm text-sm flex items-center gap-2" onClick={toggle}>
        <span>{label}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-70"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg p-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-500">Select days</span>
            <button type="button" className="text-xs text-blue-600" onClick={clearAll}>Clear</button>
          </div>
          <div className="max-h-48 overflow-auto space-y-1">
            {options.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                <input type="checkbox" checked={isChecked(opt.value)} onChange={() => toggleOption(opt.value)} />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
