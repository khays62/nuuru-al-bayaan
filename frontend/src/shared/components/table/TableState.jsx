import React from 'react';
import LoadingState from '../ui/LoadingState.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import Button from '../ui/Button.jsx';
import Alert from '../ui/Alert.jsx';
import { useI18n } from '../../../i18n/I18nProvider';

export default function TableState({
  isLoading = false,
  error = null,
  items,
  isEmpty,

  loadingMessage,
  loadingVariant = 'table',
  loadingRows = 6,
  loadingColumns = 5,

  emptyTitle,
  emptyDescription = '',
  emptyActionLabel,
  onEmptyAction,

  onRetry,

  children,
}) {
  const { t } = useI18n();

  const computedEmpty = typeof isEmpty === 'boolean'
    ? isEmpty
    : (Array.isArray(items) ? items.length === 0 : false);

  const resolvedLoadingMessage = loadingMessage ?? t('common.loading', { defaultValue: 'Loading…' });
  const resolvedEmptyTitle = emptyTitle ?? t('common.emptyStates.noDataFound', { defaultValue: 'No data found' });

  if (isLoading) {
    return (
      <LoadingState
        variant={loadingVariant}
        message={resolvedLoadingMessage}
        rows={loadingRows}
        columns={loadingColumns}
      />
    );
  }

  if (error) {
    const message = typeof error === 'string'
      ? error
      : (error?.message || t('common.errors.somethingWentWrong', { defaultValue: 'Something went wrong.' }));

    return (
      <Alert variant="danger">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 break-words">{message}</span>
          {typeof onRetry === 'function' ? (
            <Button variant="neutral" size="sm" onClick={onRetry}>
              {t('common.retry', { defaultValue: 'Retry' })}
            </Button>
          ) : null}
        </div>
      </Alert>
    );
  }

  if (computedEmpty) {
    return (
      <EmptyState
        title={resolvedEmptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return <>{children}</>;
}
