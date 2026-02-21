import React from 'react';
import { cn } from '../../utils/cn';

export default function Card({ className = '', children, noPadding, ...rest }) {
  void noPadding;
  return (
    <div
      className={cn(
        'bg-(--nb-color-bg-card) text-(--nb-color-fg) border border-(--nb-color-border) rounded-(--nb-radius-md) shadow-(--nb-shadow-md)',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
