// CohortSelect.jsx
import React, { useEffect, useState } from 'react';
import { listCohorts, getAvailableCohortsForPromotion } from '../../api';
import { getCachedCohorts, setCachedCohorts, getPendingCohorts, setPendingCohorts, clearPendingCohorts } from './cohortsCache';


export default function CohortSelect({ value, onChange, disabled = false, className = '', placeholder = 'None', id, name, status = 'active', refreshKey, mode, academicYear, gradeSectionId, gradeId, shiftId, section, ...rest }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        // Promotion mode: only load cohorts that have enrollments in the selected context
        if (mode === 'promotion') {
          // Require academicYear plus either gradeSectionId or (gradeId + shiftId + section)
          if (!academicYear || !(gradeSectionId || (gradeId && shiftId && section))) {
            if (!ignore) setItems([]);
            return;
          }
          const params = { academicYear };
          if (gradeSectionId) params.gradeSectionId = gradeSectionId;
          else {
            params.grade = gradeId;
            params.shift = shiftId;
            params.section = section;
          }
          const res = await getAvailableCohortsForPromotion(params);
          if (!ignore) setItems(res.data || []);
          return;
        }
        // Context mode: limit cohorts to selected Academic Year only (non-promotion editing scenarios)
        if (mode === 'context') {
          if (!academicYear) { if (!ignore) setItems([]); return; }
          const res = await listCohorts({ status, startAcademicYear: academicYear, limit: 100, sortBy: 'createdAt', sortDir: 'asc' });
          if (!ignore) setItems(res?.data || []);
          return;
        }
        // Default legacy mode: full cohort list with caching
        const key = String(status || 'active');
        if (typeof refreshKey === 'number' && refreshKey > 0) {
          const res = await listCohorts({ status, limit: 1000, sortBy: 'startAcademicYear', sortDir: 'asc' });
          const list = res?.data || [];
          setCachedCohorts(key, list);
          if (!ignore) setItems(list);
        } else {
          const cached = getCachedCohorts(key);
            if (cached && !ignore) {
              setItems(cached);
              setLoading(false);
              return;
            }
          const inflight = getPendingCohorts(key);
          if (inflight) {
            const res = await inflight;
            if (!ignore) setItems(res?.data || []);
            setLoading(false);
            return;
          }
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
        if (mode !== 'promotion') {
          const key = String(status || 'active');
          clearPendingCohorts(key);
        }
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [status, refreshKey, mode, academicYear, gradeSectionId, gradeId, shiftId, section]);

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
