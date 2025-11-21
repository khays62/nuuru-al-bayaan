// GradeSectionSelect.jsx
import React, { useEffect, useState } from 'react';
import { listGradeSections } from '../../api';

// AY-agnostic: GradeSection is reusable across years; filter by Grade + Shift only.
export default function GradeSectionSelect({ academicYearId, gradeId, shiftId, value, onChange, disabled = false, className = '', placeholder = 'Any', id, name, ...rest }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    // Only require grade and shift; ignore academicYearId for fetching sections
    if (!gradeId || !shiftId) { setItems([]); return; }
    (async () => {
      setLoading(true);
      try {
        const res = await listGradeSections({ grade: gradeId, shift: shiftId, limit: 200 });
        const data = Array.isArray(res) ? res : (res?.data || []);
        if (!ignore) setItems(data);
      } catch {
        if (!ignore) setItems([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [gradeId, shiftId]);

  return (
    <select
      id={id}
      name={name}
      {...rest}
      value={value}
      onChange={(e)=>onChange?.(e.target.value)}
      disabled={disabled || loading || !gradeId || !shiftId}
      className={`px-3 py-2 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${className}`}
    >
      <option value="">{loading ? 'Loading…' : placeholder}</option>
      {items.map(gs => {
        const gradeName = gs?.grade?.gradeName;
        const sectionNum = gs?.section;
        const shiftName = gs?.shift?.shiftName;
        const tail = [shiftName].filter(Boolean).join(' - ');
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
