import React from 'react';
import { cn } from '../../utils/cn';

const base =
  'w-full px-3 py-2 bg-(--nb-color-bg-card) border border-(--nb-color-border) rounded-md shadow-sm text-sm text-(--nb-color-fg) ' +
  'focus-visible:outline-none ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const Select = React.forwardRef(function Select({ className = '', children, ...rest }, ref) {
  const cls = String(className || '');
  const hasCustomFocusBorder = /\bfocus-visible:border-/.test(cls) || /\bfocus:border-/.test(cls);
  const hasBorderRed = /\bborder-red-\d{2,3}\b/.test(cls);
  const hasBorderGreen = /\bborder-green-\d{2,3}\b/.test(cls);

  const focusBorderClass = hasCustomFocusBorder
    ? ''
    : (hasBorderRed
      ? 'focus:border-red-500 focus-visible:border-red-500'
      : (hasBorderGreen
        ? 'focus:border-green-500 focus-visible:border-green-500'
        : 'focus:border-(--nb-color-focus) focus-visible:border-(--nb-color-focus)'));

  return (
    <select ref={ref} className={cn(base, focusBorderClass, className)} {...rest}>
      {children}
    </select>
  );
});

export default Select;
