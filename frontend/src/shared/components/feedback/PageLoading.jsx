import React from 'react';
import Spinner from './Spinner';
import { useI18n } from '../../../i18n/I18nProvider';

export default function PageLoading({ title, subtitle = '' }) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t('common.loading', { defaultValue: 'Loading…' });

  return (
    <div className="min-h-[50vh] w-full rounded-lg border border-blue-100 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-800 text-white">
        <div className="font-semibold">{resolvedTitle}</div>
        {subtitle ? <div className="text-xs text-white/80 mt-0.5">{subtitle}</div> : null}
      </div>

      <div className="p-6">
        <div className="flex items-center gap-3">
          <Spinner size={22} />
          <div className="text-sm text-gray-700">{t('common.pleaseWait', { defaultValue: 'Please wait…' })}</div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="h-4 bg-gray-100 rounded w-2/3" />
          <div className="h-4 bg-gray-100 rounded w-5/6" />
          <div className="h-4 bg-gray-100 rounded w-3/5" />
          <div className="h-32 bg-gray-50 rounded border border-gray-100" />
        </div>
      </div>
    </div>
  );
}
