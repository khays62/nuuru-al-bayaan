// FilterSelect.jsx
// Select guud oo loogu talagalay filters kala duwan.
import React from 'react';
import Select from '../ui/Select.jsx';
import { useI18n } from '../../../i18n/useI18n';

export default function FilterSelect({ value, onChange, options = [], placeholder, className = '', multiple = false, disabled = false }) {
  const { t } = useI18n();
  const resolvedPlaceholder = placeholder ?? t('common.select.placeholder', { defaultValue: 'Selectâ€¦' });

  const handleChange = (e) => {
    if (multiple) {
      const sel = Array.from(e.target.selectedOptions).map(o => o.value);
      onChange(sel);
    } else {
      onChange(e.target.value);
    }
  };

  return (
    <Select
      value={multiple ? (Array.isArray(value) ? value : []) : (value ?? '')}
      onChange={handleChange}
      multiple={multiple}
      disabled={disabled}
      className={className}
    >
      {!multiple && resolvedPlaceholder ? (<option value="">{resolvedPlaceholder}</option>) : null}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </Select>
  );
}
