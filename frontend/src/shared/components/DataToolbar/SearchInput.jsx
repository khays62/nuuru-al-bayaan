// SearchInput.jsx
// Input raadinta guud. Waxay wacdaa onChange marka la qoro.
import React from 'react';
import Input from '../ui/Input.jsx';
import { useI18n } from '../../../i18n/I18nProvider';

export default function SearchInput({ value, onChange, placeholder, className = '' }) {
  const { t } = useI18n();
  const resolvedPlaceholder = placeholder ?? t('common.search', { defaultValue: 'Search…' });
  return (
    <div className={`relative ${className} min-w-55 grow`}>
      <Input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={resolvedPlaceholder} />
    </div>
  );
}
