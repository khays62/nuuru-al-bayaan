import React from 'react';
import Spinner from './Spinner';
import { useI18n } from '../../../i18n/useI18n';
import Skeleton from '../ui/Skeleton.jsx';

export default function PageLoading({ title, subtitle = '' }) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t('common.loading', { defaultValue: 'Loadingâ€¦' });

  return (
    <div className="min-h-[50vh] w-full rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg-card) shadow-(--nb-shadow-sm) overflow-hidden">
      <div className="px-4 py-3 bg-(--nb-color-brand) text-white">
        <div className="font-semibold">{resolvedTitle}</div>
        {subtitle ? <div className="text-xs text-white/80 mt-0.5">{subtitle}</div> : null}
      </div>

      <div className="p-6">
        <div className="flex items-center gap-3">
          <Spinner size={22} />
          <div className="text-sm text-(--nb-color-muted)">{t('common.pleaseWait', { defaultValue: 'Please waitâ€¦' })}</div>
        </div>

        <div className="mt-5 space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/5" />
          <div className="h-32 rounded-(--nb-radius-sm) border border-(--nb-color-border) bg-(--nb-color-bg)" />
        </div>
      </div>
    </div>
  );
}
