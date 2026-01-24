// EmptyState.jsx
// Marka aan xog jirin + ikhtiyaar button ficil (Add New, iwm).
import React from 'react';
import UiEmptyState from '../ui/EmptyState.jsx';
import Button from '../ui/Button.jsx';

export default function EmptyState({ title = 'No data found', description = '', actionLabel, onAction }) {
  return (
    <UiEmptyState
      className="w-full"
      title={title}
      description={description}
      action={
        actionLabel && onAction ? (
          <Button variant="brand" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null
      }
    />
  );
}
