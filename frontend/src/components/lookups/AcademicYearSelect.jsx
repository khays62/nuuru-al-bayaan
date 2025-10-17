// AcademicYearSelect.jsx
// Select reusable oo soo bandhiga Academic Years.
import React, { useEffect, useState } from 'react';
import { getAcademicYears } from '../../api';

export default function AcademicYearSelect({ value, onChange, disabled = false, className = '', placeholder = 'Any', id, name, ...rest }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const ys = await getAcademicYears();
        if (!ignore) setItems(Array.isArray(ys) ? ys : (ys?.data || []));
      } catch {
        if (!ignore) setItems([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  return (
    <select id={id} name={name} {...rest} value={value} onChange={(e)=>onChange?.(e.target.value)} disabled={disabled || loading} className={`border rounded px-2 py-1 ${className}`}>
      <option value="">{placeholder}</option>
      {items.map(y => <option key={y._id} value={y._id}>{y.yearName}</option>)}
    </select>
  );
}
