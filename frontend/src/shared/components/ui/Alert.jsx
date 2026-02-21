import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  info: 'border-(--nb-color-accent-200) bg-(--nb-color-accent-50) text-(--nb-color-brand)',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  danger: 'border-orange-200 bg-orange-50 text-orange-950',
  neutral: 'border-(--nb-color-border) bg-(--nb-color-bg) text-(--nb-color-fg)',
};

export default function Alert({ variant = 'neutral', title, children, className = '', ...rest }) {
  return (
    <div
      className={cn(
        'rounded-(--nb-radius-md) border p-3 text-sm',
        variants[variant] || variants.neutral,
        className
      )}
      {...rest}
    >
      {title ? <div className="font-semibold">{title}</div> : null}
      {children ? <div className={title ? 'mt-1' : ''}>{children}</div> : null}
    </div>
  );
}
