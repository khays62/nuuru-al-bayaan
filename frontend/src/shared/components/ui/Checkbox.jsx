import React from 'react';
import { cn } from '../../utils/cn';

const Checkbox = React.forwardRef(function Checkbox({ className = '', ...rest }, ref) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border-slate-300 text-[color:var(--nb-color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--nb-color-brand)] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed',
        className
      )}
      {...rest}
    />
  );
});

export default Checkbox;
