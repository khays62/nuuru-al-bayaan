import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  neutral: 'border-(--nb-color-border) bg-(--nb-color-bg) text-(--nb-color-muted)',
  primary: 'border-(--nb-color-brand-200) bg-(--nb-color-brand-50) text-(--nb-color-brand)',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-orange-200 bg-orange-50 text-orange-700',
};

export default function Badge({ variant = 'neutral', className = '', children, ...rest }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        variants[variant] || variants.neutral,
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
