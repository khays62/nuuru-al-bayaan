import React from 'react';
import { cn } from '../../utils/cn';

const base =
  'w-full rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg-card) px-3 py-2 text-sm text-(--nb-color-fg) shadow-(--nb-shadow-sm) ' +
  'placeholder:text-(--nb-color-muted) ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nb-color-brand) focus-visible:ring-offset-2 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

const Input = React.forwardRef(function Input(
  { className = '', type = 'text', ...rest },
  ref
) {
  return <input ref={ref} type={type} className={cn(base, className)} {...rest} />;
});

export default Input;
