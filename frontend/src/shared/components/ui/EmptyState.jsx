import React from 'react';
import { cn } from '../../utils/cn';
import Button from './Button.jsx';
import { useI18n } from '../../../i18n/useI18n';

export default function EmptyState({
  title,
  description,
  icon,
  action,
  actionLabel,
  onAction,
  className = '',
}) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t('common.emptyStates.noData', { defaultValue: 'No data' });

  const computedAction = action ?? (
    actionLabel && typeof onAction === 'function' ? (
      <Button variant="brand" size="md" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null
  );

  return (
    <div className={cn('rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg-card) p-6', className)}>
      <div className="flex items-start gap-3">
        {icon ? <div className="mt-0.5 text-(--nb-color-muted)">{icon}</div> : null}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-(--nb-color-fg)">{resolvedTitle}</div>
          {description ? <div className="mt-1 text-sm text-(--nb-color-muted)">{description}</div> : null}
          {computedAction ? <div className="mt-3">{computedAction}</div> : null}
        </div>
      </div>
    </div>
  );
}
