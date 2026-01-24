import React from 'react';
import { cn } from '../../utils/cn';

export default function Label({ className = '', children, ...rest }) {
  return (
    <label className={cn('block text-sm font-medium text-slate-700', className)} {...rest}>
      {children}
    </label>
  );
}
