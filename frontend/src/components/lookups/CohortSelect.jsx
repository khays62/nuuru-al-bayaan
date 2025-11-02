// CohortSelect.jsx
import React, { useEffect, useState } from 'react';
import { listCohorts } from '../../api';
import { getCachedCohorts, setCachedCohorts, getPendingCohorts, setPendingCohorts, clearPendingCohorts } from './cohortsCache';


export default function CohortSelect({ value, onChange, disabled = false, className = '', placeholder = 'None', id, name, status = 'active', refreshKey, ...rest }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const key = String(status || 'active');
        // Only fetch if refreshKey > 0 (i.e. after cohort creation)
        if (typeof refreshKey === 'number' && refreshKey > 0) {
          const res = await listCohorts({ status, limit: 1000, sortBy: 'startAcademicYear', sortDir: 'asc' });
          const list = res?.data || [];
          setCachedCohorts(key, list);
          if (!ignore) setItems(list);
        } else {
          // 1) Serve from cache immediately when available
          const cached = getCachedCohorts(key);
          if (cached && !ignore) {
            setItems(cached);
            setLoading(false);
            return; // no fetch
          }
          // 2) If another component is already fetching, wait for it
          const inflight = getPendingCohorts(key);
          if (inflight) {
            const res = await inflight;
            if (!ignore) setItems(res?.data || []);
            setLoading(false);
            return;
          }
          // 3) Start a new fetch and publish the promise for dedupe
          const p = listCohorts({ status, limit: 1000, sortBy: 'startAcademicYear', sortDir: 'asc' });
          setPendingCohorts(key, p);
          const res = await p;
          const list = res?.data || [];
          setCachedCohorts(key, list);
          if (!ignore) setItems(list);
        }
      } catch {
        if (!ignore) setItems([]);
      } finally {
        const key = String(status || 'active');
        clearPendingCohorts(key);
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [status, refreshKey]);

  return (
    <select id={id} name={name} {...rest} value={value} onChange={(e)=>onChange?.(e.target.value)} disabled={disabled || loading} className={`border rounded px-2 py-1 ${className}`}>
      <option value="">{placeholder}</option>
      {items.map(c => (
        <option key={c._id} value={c._id}>
          {c.name}{c.startAcademicYear?.yearName ? ` — ${c.startAcademicYear.yearName}` : ''}
        </option>
      ))}
    </select>
  );
}
