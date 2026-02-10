import React from 'react';
import { cn } from '../../utils/cn';

export default function Card({ className = '', children, noPadding, ...rest }) {
  void noPadding;
  return (
    <div
      className={cn(
        'bg-white border border-slate-200 rounded-(--nb-radius-md) shadow-(--nb-shadow-md)',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
