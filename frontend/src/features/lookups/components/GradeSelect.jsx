// GradeSelect.jsx
import React, { useEffect, useState } from 'react';
import { getGrades } from '../api/lookups';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';

export default function GradeSelect({
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
        const gs = await getGrades();
        if (!ignore) setItems(Array.isArray(gs) ? gs : (gs?.data || []));
      } catch {
        if (!ignore) setItems([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  // Sort grades by createdAt (MongoDB order)
  const sortedItems = [...items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (searchable) {
    const options = sortedItems.map((g) => ({ value: g._id, label: g.gradeName }));
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

  const options = sortedItems.map((g) => ({ value: g._id, label: g.gradeName }));

  return (
    <DropdownSelect
      id={id}
      name={name}
      value={value}
      onChange={(v) => onChange?.(v)}
      disabled={disabled || loading}
      options={options}
      placeholder={placeholder}
      className={className}
      buttonProps={rest}
    />
  );
}
