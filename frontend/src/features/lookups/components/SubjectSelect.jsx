// SubjectSelect.jsx
import React, { useEffect, useState } from 'react';
import { getSubjects } from '../../subjects/api/subjects';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';

export default function SubjectSelect({
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
        placeholder={placeholder}
        maxVisible={maxVisible}
        searchPlaceholder={searchPlaceholder}
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
      placeholder={placeholder}
      disabled={disabled || loading}
      className={className}
      id={id}
      name={name}
      {...rest}
    />
  );
}
