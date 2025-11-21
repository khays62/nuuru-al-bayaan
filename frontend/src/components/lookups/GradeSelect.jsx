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
    <select
      id={id}
      name={name}
      {...rest}
      value={value}
      onChange={(e)=>onChange?.(e.target.value)}
      disabled={disabled || loading}
      className={`px-3 py-2 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${className}`}
    >
      <option value="">{placeholder}</option>
      {sortedItems.map(g => <option key={g._id} value={g._id}>{g.gradeName}</option>)}
    </select>
  );
}
