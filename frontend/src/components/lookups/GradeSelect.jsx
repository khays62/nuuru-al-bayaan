// GradeSelect.jsx
import React, { useEffect, useState } from 'react';
import { getGrades } from '../../api';

export default function GradeSelect({ value, onChange, disabled = false, className = '', placeholder = 'Any', id, name, ...rest }) {
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

  return (
    <select id={id} name={name} {...rest} value={value} onChange={(e)=>onChange?.(e.target.value)} disabled={disabled || loading} className={`border rounded px-2 py-1 ${className}`}>
      <option value="">{placeholder}</option>
      {sortedItems.map(g => <option key={g._id} value={g._id}>{g.gradeName}</option>)}
    </select>
  );
}
