import React from 'react';
import { cn } from '../../utils/cn';

const base =
  'w-full rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg-card) px-3 py-2 text-sm text-(--nb-color-fg) shadow-(--nb-shadow-sm) ' +
  'placeholder:text-(--nb-color-muted) ' +
  'focus-visible:outline-none ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

const Input = React.forwardRef(function Input(
  { className = '', type = 'text', ...rest },
  ref
) {
  const cls = String(className || '');
  const hasCustomFocusBorder = /\bfocus-visible:border-/.test(cls) || /\bfocus:border-/.test(cls);
  const hasBorderRed = /\bborder-red-\d{2,3}\b/.test(cls);
  const hasBorderGreen = /\bborder-green-\d{2,3}\b/.test(cls);

  // Use a single colored focus border (not rings) to avoid “double” outlines.
  // If caller already provides focus border classes, don't inject anything.
  const focusBorderClass = hasCustomFocusBorder
    ? ''
    : (hasBorderRed
      ? 'focus:border-red-500 focus-visible:border-red-500'
      : (hasBorderGreen
        ? 'focus:border-green-500 focus-visible:border-green-500'
        : 'focus:border-(--nb-color-focus) focus-visible:border-(--nb-color-focus)'));

  return <input ref={ref} type={type} className={cn(base, focusBorderClass, className)} {...rest} />;
});

export default Input;
