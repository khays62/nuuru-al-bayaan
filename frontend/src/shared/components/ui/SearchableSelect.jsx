import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

import { cn } from '../../utils/cn';
import { useI18n } from '../../../i18n/I18nProvider';

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  disabled = false,
  className = '',
  placeholder,
  id,
  name,
  maxVisible = 5,
  searchPlaceholder,
  buttonProps = {},
  hideSelectedOption = true,
  clearable = true,
  clearLabel,
}) {
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);

  const resolvedPlaceholder = placeholder ?? t('common.select.placeholder', { defaultValue: 'Select…' });
  const resolvedSearchPlaceholder = searchPlaceholder ?? t('common.select.searchPlaceholder', { defaultValue: 'Type to search…' });
  const resolvedClearLabel = clearLabel ?? t('common.actions.clear', { defaultValue: 'Clear' });
  const resolvedNoOptionsFound = t('common.select.noOptionsFound', { defaultValue: 'No options found.' });
  const resolvedTypeToSearchMore = t('common.select.typeToSearchMore', { defaultValue: 'Type to search more…' });

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

  const listOptions = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    const v = String(value || '');
    const limit = Math.max(1, Number(maxVisible) || 5);

    // Default view (no query): show up to maxVisible options, excluding the selected option.
    if (!q) {
      const out = [];
      for (const o of safeOptions) {
        if (hideSelectedOption && v && o.value === v) continue;
        out.push(o);
        if (out.length >= limit) break;
      }
      return out;
    }

    // Search view: filter by query, then optionally hide selected.
    const searched = safeOptions.filter((o) => o.label.toLowerCase().includes(q));
    if (!hideSelectedOption || !v) return searched;
    return searched.filter((o) => o.value !== v);
  }, [safeOptions, query, maxVisible, hideSelectedOption, value]);

  const onPick = (next) => {
    onChange?.(next);
    setOpen(false);
    setQuery('');
  };

  const canClear = clearable && String(value || '') !== '';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        name={name}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full inline-flex items-center justify-between gap-2',
          'px-3 py-2 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-md shadow-sm text-sm text-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...buttonProps}
      >
        <span className={cn('truncate', selectedLabel ? 'text-gray-800' : 'text-gray-500')}>
          {selectedLabel || resolvedPlaceholder}
        </span>
        <ChevronDown size={18} className="text-gray-500" />
      </button>

      {open && !disabled ? (
        <div
          className={cn(
            'absolute right-0 left-0 mt-2 overflow-hidden z-50',
            'rounded-md border border-gray-200 bg-white shadow-lg'
          )}
        >
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2">
                <Search size={16} className="text-gray-400" />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={resolvedSearchPlaceholder}
                className={cn(
                  'w-full pl-8 pr-2 py-2 text-sm',
                  'border border-gray-300 rounded-md',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                )}
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-auto">
            {canClear ? (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => onPick('')}
              >
                {resolvedClearLabel}
              </button>
            ) : null}

            {listOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">{resolvedNoOptionsFound}</div>
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

            {String(query || '').trim() === '' && safeOptions.length > (Number(maxVisible) || 5) ? (
              <div className="px-3 py-2 text-xs text-gray-500">{resolvedTypeToSearchMore}</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
