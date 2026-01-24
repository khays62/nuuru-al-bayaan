import React from 'react';
import LoadingState from '../feedback/LoadingState.jsx';
import EmptyState from '../feedback/EmptyState.jsx';
import Button from '../ui/Button.jsx';
import Alert from '../ui/Alert.jsx';

export default function TableState({
  isLoading = false,
  error = null,
  items,
  isEmpty,

  loadingMessage = 'Loading…',
  loadingVariant = 'table',
  loadingRows = 6,
  loadingColumns = 5,

  emptyTitle = 'No data found',
  emptyDescription = '',
  emptyActionLabel,
  onEmptyAction,

  onRetry,

  children,
}) {
  const computedEmpty = typeof isEmpty === 'boolean'
    ? isEmpty
    : (Array.isArray(items) ? items.length === 0 : false);

  if (isLoading) {
    return (
      <LoadingState
        variant={loadingVariant}
        message={loadingMessage}
        rows={loadingRows}
        columns={loadingColumns}
      />
    );
  }

  if (error) {
    const message = typeof error === 'string'
      ? error
      : (error?.message || 'Something went wrong.');

    return (
      <Alert variant="danger">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 break-words">{message}</span>
          {typeof onRetry === 'function' ? (
            <Button variant="neutral" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      </Alert>
    );
  }

  if (computedEmpty) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return <>{children}</>;
}
