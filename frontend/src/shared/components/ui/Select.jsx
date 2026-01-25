import React from 'react';
import { cn } from '../../utils/cn';

const base =
  'w-full px-3 py-2 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-md shadow-sm text-sm text-gray-800 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const Select = React.forwardRef(function Select({ className = '', children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(base, className)} {...rest}>
      {children}
    </select>
  );
});

export default Select;
