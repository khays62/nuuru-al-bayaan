import React, { useEffect, useRef, useState } from 'react';
import Card from '../ui/Card.jsx';
import Checkbox from '../ui/Checkbox.jsx';
import { useI18n } from '../../../i18n/useI18n';

export default function MultiSelectDropdown({ value = [], onChange, options = [], placeholder, className = '' }) {
  const { t } = useI18n();
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

  const resolvedPlaceholder = placeholder ?? t('common.select.placeholder', { defaultValue: 'Selectâ€¦' });

  const label = (Array.isArray(value) && value.length)
    ? options.filter(o => value.includes(o.value)).map(o => o.label).join(', ')
    : resolvedPlaceholder;

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        className="px-3 py-2 bg-(--nb-color-bg-card) border border-(--nb-color-border) rounded-(--nb-radius-md) shadow-(--nb-shadow-sm) text-sm text-(--nb-color-fg) flex items-center gap-2"
        onClick={toggle}
      >
        <span>{label}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-70"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <Card className="absolute z-10 mt-1 w-56 p-2 shadow-(--nb-shadow-md)">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-(--nb-color-muted)">{t('common.selectDays', { defaultValue: 'Select days' })}</span>
            <button type="button" className="text-xs text-(--nb-color-brand)" onClick={clearAll}>{t('common.actions.clear', { defaultValue: 'Clear' })}</button>
          </div>
          <div className="max-h-48 overflow-auto space-y-1">
            {options.map((opt, idx) => (
              <label
                key={`${String(opt.value)}::${idx}`}
                className="flex items-center gap-2 px-2 py-1 hover:bg-(--nb-color-bg) rounded-(--nb-radius-sm) cursor-pointer"
              >
                <Checkbox checked={isChecked(opt.value)} onChange={() => toggleOption(opt.value)} />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
