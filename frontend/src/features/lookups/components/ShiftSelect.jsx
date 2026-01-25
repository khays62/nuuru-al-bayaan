// ShiftSelect.jsx
import React, { useEffect, useState } from 'react';
import { getShifts } from '../api/lookups';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';

export default function ShiftSelect({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'Any',
  id,
  name,
  searchable = false,
  maxVisible = 5,
  searchPlaceholder = 'Type to search…',
  ...rest
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const res = await getShifts();
        if (!ignore) setItems(Array.isArray(res) ? res : (res?.data || []));
      } catch {
        if (!ignore) setItems([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  if (searchable) {
    const options = (items || []).map((s) => ({ value: s._id, label: s.shiftName }));
    return (
      <SearchableSelect
        id={id}
        name={name}
        value={value}
        onChange={(v) => onChange?.(v)}
        disabled={disabled || loading}
        options={options}
        placeholder={placeholder}
        maxVisible={maxVisible}
        searchPlaceholder={searchPlaceholder}
        className={className}
        buttonProps={rest}
      />
    );
  }

  const options = (items || []).map((s) => ({ value: s._id, label: s.shiftName }));

  return (
    <DropdownSelect
      id={id}
      name={name}
      value={value}
      onChange={(v) => onChange?.(v)}
      disabled={disabled || loading}
      options={options}
      placeholder={loading ? 'Loading…' : placeholder}
      className={className}
      buttonProps={rest}
    />
  );
}
