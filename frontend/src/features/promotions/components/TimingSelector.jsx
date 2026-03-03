import React from 'react';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import { useI18n } from '../../../i18n/useI18n';

export default function TimingSelector({ value, onChange }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3">
      <label className="font-medium">{t('promotions.timing.label', { defaultValue: 'Timing' })}</label>
      <div className="min-w-40">
        <DropdownSelect
          value={value}
          onChange={onChange}
          options={[
            { value: 'mid-year', label: t('promotions.timing.midYear', { defaultValue: 'Mid-Year' }) },
            { value: 'year-end', label: t('promotions.timing.yearEnd', { defaultValue: 'Year-End' }) },
          ]}
          placeholder={t('promotions.timing.placeholder', { defaultValue: 'Timing' })}
        />
      </div>
    </div>
  );
}
