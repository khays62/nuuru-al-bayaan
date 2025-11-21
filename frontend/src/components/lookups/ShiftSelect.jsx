// ShiftSelect.jsx
import React, { useEffect, useState } from 'react';
import { getShifts } from '../../api';

export default function ShiftSelect({ value, onChange, disabled = false, className = '', placeholder = 'Any', id, name, ...rest }) {
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
      {items.map(s => <option key={s._id} value={s._id}>{s.shiftName}</option>)}
    </select>
  );
}
