import React from 'react';
import { cn } from '../../utils/cn';

export default function EmptyState({
  title = 'No data',
  description,
  icon,
  action,
  className = '',
}) {
  return (
    <div className={cn('rounded-(--nb-radius-md) border border-slate-200 bg-white p-6', className)}>
      <div className="flex items-start gap-3">
        {icon ? <div className="mt-0.5 text-slate-500">{icon}</div> : null}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {description ? <div className="mt-1 text-sm text-slate-600">{description}</div> : null}
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
