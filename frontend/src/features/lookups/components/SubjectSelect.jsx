// SubjectSelect.jsx
import React, { useEffect, useState } from 'react';
import { getSubjects } from '../../subjects/api/subjects';

export default function SubjectSelect({ value, onChange, disabled = false, className = '', placeholder = 'Any' }) {
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

  return (
    <select value={value} onChange={(e)=>onChange?.(e.target.value)} disabled={disabled || loading} className={`border rounded px-2 py-1 ${className}`}>
      <option value="">{placeholder}</option>
      {items.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
    </select>
  );
}
