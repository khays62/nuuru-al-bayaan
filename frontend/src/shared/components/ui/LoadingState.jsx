import React from 'react';
import { cn } from '../../utils/cn';

export default function LoadingState({ label = 'Loading…', className = '' }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 rounded-(--nb-radius-md) border border-slate-200 bg-white p-6', className)}>
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"
        aria-hidden="true"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </div>
  );
}
