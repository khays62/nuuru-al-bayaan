import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  danger: 'border-orange-200 bg-orange-50 text-orange-950',
  neutral: 'border-slate-200 bg-slate-50 text-slate-900',
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
