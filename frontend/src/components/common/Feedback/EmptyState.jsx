// EmptyState.jsx
// Marka aan xog jirin + ikhtiyaar button ficil (Add New, iwm).
import React from 'react';

export default function EmptyState({ title = 'No data found', description = '', actionLabel, onAction }) {
  return (
    <div className="text-center py-10 text-gray-500 w-full">
      <h3 className="text-sm font-medium text-gray-700 mb-1">{title}</h3>
      {description && <p className="text-xs mb-3 text-gray-500">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >{actionLabel}</button>
      )}
    </div>
  );
}
