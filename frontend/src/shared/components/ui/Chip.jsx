import React from 'react';
import { cn } from '../../utils/cn';
import { useI18n } from '../../../i18n/useI18n';

const variants = {
  // Back-compat: keep `indigo` key but map it to our brand/accent palette.
  indigo: 'border-(--nb-color-accent-200) bg-(--nb-color-accent-50) text-(--nb-color-brand)',
  accent: 'border-(--nb-color-accent-200) bg-(--nb-color-accent-50) text-(--nb-color-brand)',
  neutral: 'border-(--nb-color-border) bg-(--nb-color-bg) text-(--nb-color-muted)',
  brand: 'border-(--nb-color-brand) bg-(--nb-color-brand) text-white',
};

export default function Chip({
  variant = 'accent',
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
        variants[variant] || variants.accent,
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
            variant === 'brand' ? 'bg-white/20 hover:bg-white/25' : 'hover:bg-(--nb-color-brand-a08)'
          )}
          aria-label={resolvedRemoveLabel}
          title={resolvedRemoveLabel}
        >
          Ã—
        </button>
      ) : null}
    </span>
  );
}
