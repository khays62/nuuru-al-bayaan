import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  primary: 'border-blue-200 bg-blue-50 text-blue-700',
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
