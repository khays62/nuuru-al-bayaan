import React from 'react';

import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import { useI18n } from '../../../i18n/I18nProvider';

// Reusable single-select for enrollment status filtering across pages.
// Values supported (MVP): active, graduated, promoted, transferred, withdrawn, all.
// Optional includeInactive to surface 'inactive'.
export default function EnrollmentStatusSelect({ value, onChange, includeInactive = false, className = '', id, name, placeholder }) {
  const { t } = useI18n();

  const baseValues = ['active', 'graduated', 'promoted', 'transferred', 'withdrawn'];
  if (includeInactive) baseValues.splice(1, 0, 'inactive');

  const base = baseValues.map((v) => {
    const statusLabel = t(`students.enrollmentStatus.${v}`, { defaultValue: String(v) });
    return {
      value: v,
      label: t('common.onlyWithStatus', { status: statusLabel, defaultValue: '{{status}} only' }),
    };
  });

  const allOption = { value: 'all', label: t('common.allIncludeClosed', { defaultValue: 'All (include closed)' }) };
  const options = [...base, allOption];

  const resolvedPlaceholder = placeholder ?? t('common.filters.status', { defaultValue: 'Status' });
  return (
    <DropdownSelect
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={resolvedPlaceholder}
      className={className}
    />
  );
}
