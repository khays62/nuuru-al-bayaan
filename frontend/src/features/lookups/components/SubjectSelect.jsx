// SubjectSelect.jsx
import React, { useEffect, useState } from 'react';
import { getSubjects } from '../../subjects/api/subjects';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import { useI18n } from '../../../i18n/I18nProvider';

export default function SubjectSelect({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder,
  id,
  name,
  searchable = false,
  maxVisible = 5,
  searchPlaceholder,
  ...rest
}) {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const resolvedPlaceholder = placeholder ?? t('common.filters.any', { defaultValue: 'Any' });
  const resolvedSearchPlaceholder = searchPlaceholder ?? t('common.select.searchPlaceholder', { defaultValue: 'Type to search…' });

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const res = await getSubjects();
        if (!ignore) setItems(Array.isArray(res) ? res : (res?.data || []));
      } catch {
        if (!ignore) setItems([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  const options = (items || []).map((s) => ({
    value: s._id,
    label: s.name,
  }));

  if (searchable) {
    return (
      <SearchableSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder={resolvedPlaceholder}
        maxVisible={maxVisible}
        searchPlaceholder={resolvedSearchPlaceholder}
        disabled={disabled || loading}
        className={className}
        id={id}
        name={name}
        {...rest}
      />
    );
  }

  return (
    <DropdownSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder={resolvedPlaceholder}
      disabled={disabled || loading}
      className={className}
      id={id}
      name={name}
      {...rest}
    />
  );
}
