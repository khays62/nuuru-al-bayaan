import React from 'react';
import { cn } from '../../utils/cn';

const Radio = React.forwardRef(function Radio({ className = '', ...rest }, ref) {
  return (
    <input
      ref={ref}
      type="radio"
      className={cn(
        'h-4 w-4 border-(--nb-color-border) text-(--nb-color-brand) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nb-color-brand) focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed',
        className
      )}
      {...rest}
    />
  );
});

export default Radio;
