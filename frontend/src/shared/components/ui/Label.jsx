import React from 'react';
import { cn } from '../../utils/cn';

export default function Label({ className = '', children, ...rest }) {
  return (
    <label className={cn('block text-sm font-medium text-(--nb-color-fg)', className)} {...rest}>
      {children}
    </label>
  );
}
