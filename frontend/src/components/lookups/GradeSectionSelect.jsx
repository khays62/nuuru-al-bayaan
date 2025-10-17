// GradeSectionSelect.jsx
import React, { useEffect, useState } from 'react';
import { listGradeSections } from '../../api/apiService';

export default function GradeSectionSelect({ academicYearId, gradeId, shiftId, value, onChange, disabled = false, className = '', placeholder = 'Any', id, name, ...rest }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    if (!academicYearId || !gradeId || !shiftId) { setItems([]); return; }
    (async () => {
      setLoading(true);
      try {
        const res = await listGradeSections({ academicYear: academicYearId, grade: gradeId, shift: shiftId, limit: 200 });
        const data = Array.isArray(res) ? res : (res?.data || []);
        if (!ignore) setItems(data);
      } catch {
        if (!ignore) setItems([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [academicYearId, gradeId, shiftId]);

  return (
    <select id={id} name={name} {...rest} value={value} onChange={(e)=>onChange?.(e.target.value)} disabled={disabled || loading || !academicYearId || !gradeId || !shiftId} className={`border rounded px-2 py-1 ${className}`}>
      <option value="">{loading ? 'Loading…' : placeholder}</option>
      {items.map(gs => {
        const gradeName = gs?.grade?.gradeName;
        const sectionNum = gs?.section;
        const yearName = gs?.academicYear?.yearName;
        const shiftName = gs?.shift?.shiftName;
        const tail = [yearName, shiftName].filter(Boolean).join(' - ');
        const label = [
          gradeName ? `${gradeName}` : null,
          sectionNum ? `Sec ${sectionNum}` : null,
          tail ? `(${tail})` : null,
        ].filter(Boolean).join(' - ');
        return (
          <option key={gs._id} value={gs._id}>{label || gs.sectionName || 'Section'}</option>
        );
      })}
    </select>
  );
}
