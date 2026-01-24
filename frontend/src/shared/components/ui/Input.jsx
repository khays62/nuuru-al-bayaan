import React from 'react';
import { cn } from '../../utils/cn';

const base =
  'w-full rounded-(--nb-radius-md) border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-(--nb-shadow-sm) ' +
  'placeholder:text-slate-400 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--nb-color-brand)] focus-visible:ring-offset-2 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

const Input = React.forwardRef(function Input(
  { className = '', type = 'text', ...rest },
  ref
) {
  return <input ref={ref} type={type} className={cn(base, className)} {...rest} />;
});

export default Input;
