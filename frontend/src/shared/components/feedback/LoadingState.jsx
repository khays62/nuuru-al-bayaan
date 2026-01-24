// LoadingState.jsx
// Waxay muujisaa fariin loading ah ama spinner placeholder (hadda plain text).
import React from 'react';
import Spinner from './Spinner';
import UiLoadingState from '../ui/LoadingState.jsx';
import Skeleton from '../ui/Skeleton.jsx';

// Variants:
//  - spinner: central spinner + message
//  - table: skeleton rows (used while loading tables)
//  - inline: small inline spinner only
export default function LoadingState({
  message = 'Loading...',
  variant = 'spinner',
  rows = 6,            // tirada skeleton rows ee table
  columns = 5,         // qiyaasta columns placeholder
  className = ''
}) {
  if (variant === 'inline') {
    return <Spinner size={20} className={className} />;
  }

  if (variant === 'table') {
    return (
      <div className={`w-full ${className}`}>
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
        <div className="flex justify-center mt-4 text-xs text-slate-500">{message}</div>
      </div>
    );
  }

  // default spinner
  return <UiLoadingState label={message} className={className} />;
}
