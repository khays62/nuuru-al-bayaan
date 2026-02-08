import React from 'react';
import { cn } from '../../utils/cn';
import Skeleton from './Skeleton.jsx';
import { useI18n } from '../../../i18n/I18nProvider';

function InlineSpinner({ className = '' }) {
  return (
    <span
      className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600', className)}
      aria-hidden="true"
    />
  );
}

// Variants:
//  - card: centered spinner + message (default)
//  - table: skeleton rows (used while loading tables)
//  - inline: small spinner only
export default function LoadingState({
  label,
  message,
  variant = 'card',
  rows = 6,
  columns = 5,
  className = '',
}) {
  const { t } = useI18n();
  const text = message ?? label ?? t('common.loading', { defaultValue: 'Loading…' });

  // Back-compat: older code used 'spinner' to mean the default loading card.
  const v = variant === 'spinner' ? 'card' : variant;

  if (v === 'inline') {
    return <InlineSpinner className={className} />;
  }

  if (v === 'table') {
    return (
      <div className={cn('w-full', className)}>
        <div className="rounded-(--nb-radius-md) border border-slate-200 divide-y divide-slate-100 bg-white">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex items-center">
              {Array.from({ length: columns }).map((__, c) => (
                <div
                  key={c}
                  className="h-10 flex-1 px-4 flex items-center"
                  style={{ maxWidth: c === 0 ? '140px' : '100%' }}
                >
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ))}
        </div>
        {text ? (
          <div className="flex justify-center mt-4 text-xs text-slate-500">{text}</div>
        ) : null}
      </div>
    );
  }

  // default 'card'
  return (
    <div className={cn('flex items-center justify-center gap-2 rounded-(--nb-radius-md) border border-slate-200 bg-white p-6', className)}>
      <InlineSpinner />
      <span className="text-sm text-slate-700">{text}</span>
    </div>
  );
}
