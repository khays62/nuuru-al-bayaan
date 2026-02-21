import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Columns, Check, ChevronDown } from 'lucide-react';
import ActionButton from '../ui/ActionButton.jsx';
import Card from '../ui/Card.jsx';
import { useI18n } from '../../../i18n/I18nProvider';

export default function ColumnVisibilityMenu({
  columns = [],
  visible = {},
  onToggle,
  className = '',
  buttonClassName = '',
}) {
  const { t } = useI18n();
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
        title={t('common.chooseColumns', { defaultValue: 'Choose columns' })}
        icon={<Columns size={16} />}
        className={
          (`bg-(--nb-color-bg-card)! text-(--nb-color-brand)! border-(--nb-color-brand)! hover:bg-(--nb-color-accent-50)! ` + buttonClassName).trim()
        }
      >
        <span>{t('common.columns', { defaultValue: 'Columns' })}</span>
        <ChevronDown size={16} className="text-(--nb-color-accent)" />
      </ActionButton>

      {open ? (
        <Card className="absolute right-0 mt-2 w-64 overflow-hidden z-50">
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
                    (`w-full px-3 py-2 text-sm flex items-center justify-between hover:bg-(--nb-color-brand-50) ` +
                      (disabled ? 'opacity-60 cursor-not-allowed ' : 'cursor-pointer ')).trim()
                  }
                  onClick={() => {
                    if (disabled) return;
                    onToggle?.(key);
                  }}
                >
                  <span className="text-(--nb-color-fg)">{c.label}</span>
                  <span className={checked ? 'text-(--nb-color-accent)' : 'text-transparent'}>
                    <Check size={16} />
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
