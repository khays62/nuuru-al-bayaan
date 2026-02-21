import React from 'react';
import { cn } from '../../utils/cn';

const base =
  'w-full px-3 py-2 bg-(--nb-color-bg-card) border border-(--nb-color-border) rounded-md shadow-sm text-sm text-(--nb-color-fg) ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nb-color-brand) focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const Select = React.forwardRef(function Select({ className = '', children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(base, className)} {...rest}>
      {children}
    </select>
  );
});

export default Select;
