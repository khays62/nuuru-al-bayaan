import React from 'react';
import { cn } from '../../utils/cn';
import { useI18n } from '../../../i18n/I18nProvider';

const variants = {
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  brand: 'border-(--nb-color-brand) bg-(--nb-color-brand) text-white',
};

export default function Chip({
  variant = 'indigo',
  className = '',
  onRemove,
  removeLabel,
  children,
  ...rest
}) {
  const { t } = useI18n();

  const removable = typeof onRemove === 'function';
  const resolvedRemoveLabel = removeLabel ?? t('common.actions.remove', { defaultValue: 'Remove' });

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs',
        variants[variant] || variants.indigo,
        className
      )}
      {...rest}
    >
      <span className="min-w-0 truncate">{children}</span>
      {removable ? (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            'ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full',
            'opacity-80 hover:opacity-100',
            variant === 'brand' ? 'bg-white/20 hover:bg-white/25' : 'hover:bg-black/5'
          )}
          aria-label={resolvedRemoveLabel}
          title={resolvedRemoveLabel}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}
