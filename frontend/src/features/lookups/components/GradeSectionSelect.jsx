// GradeSectionSelect.jsx
import React, { useEffect, useRef, useState } from 'react';
import { listGradeSections } from '../../grades/api/gradeSections';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import toast from 'react-hot-toast';

// AY-agnostic: GradeSection is reusable across years; filter by Grade + Shift only.
export default function GradeSectionSelect({
  academicYearId,
  gradeId,
  shiftId,
  value,
  onChange,
  toastOnEmpty = false,
  toastOnEmptyMessage = 'No classes (sections) found for the selected shift.',
  toastKeyPrefix = 'GradeSectionSelect',
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

  const abortRef = useRef(null);
  const toastGateRef = useRef(new Map());

  const allowToast = (key, windowMs = 8000) => {
    const now = Date.now();
    const gate = toastGateRef.current;
    const prevAt = gate.get(key);
    if (prevAt && (now - prevAt) < windowMs) return false;
    gate.set(key, now);
    // keep gate bounded
    if (gate.size > 80) {
      for (const [k, at] of gate) {
        if ((now - at) > 60_000) gate.delete(k);
      }
    }
    return true;
  };

  useEffect(() => {
    // Only require grade and shift; ignore academicYearId for fetching sections
    if (!gradeId || !shiftId) {
      if (abortRef.current) abortRef.current.abort();
      setItems([]);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        if (abortRef.current) abortRef.current.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        const res = await listGradeSections({ grade: gradeId, shift: shiftId, limit: 200 }, { signal: ac.signal });
        const data = Array.isArray(res) ? res : (res?.data || []);
        setItems(data);
        if (toastOnEmpty && Array.isArray(data) && data.length === 0) {
          const k = `${toastKeyPrefix}|empty|${academicYearId || ''}|${gradeId}|${shiftId}`;
          if (allowToast(k)) toast.error(toastOnEmptyMessage);
        }
      } catch (e) {
        if (e?.name === 'AbortError') return;
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [gradeId, shiftId, academicYearId]);

  if (searchable) {
    const options = (items || []).map((gs) => {
      const gradeName = gs?.grade?.gradeName;
      const sectionNum = gs?.section;
      const shiftName = gs?.shift?.shiftName;
      const tail = [shiftName].filter(Boolean).join(' - ');
      const label = [
        gradeName ? `${gradeName}` : null,
        sectionNum ? `Sec ${sectionNum}` : null,
        tail ? `(${tail})` : null,
      ].filter(Boolean).join(' - ');
      return { value: gs._id, label: label || gs.sectionName || 'Section' };
    });

    return (
      <SearchableSelect
        id={id}
        name={name}
        value={value}
        onChange={(v) => onChange?.(v)}
        disabled={disabled || loading || !gradeId || !shiftId}
        options={options}
        placeholder={loading ? 'Loading…' : placeholder}
        maxVisible={maxVisible}
        searchPlaceholder={searchPlaceholder}
        className={className}
        buttonProps={rest}
      />
    );
  }

  const options = (items || []).map((gs) => {
    const gradeName = gs?.grade?.gradeName;
    const sectionNum = gs?.section;
    const shiftName = gs?.shift?.shiftName;
    const tail = [shiftName].filter(Boolean).join(' - ');
    const label = [
      gradeName ? `${gradeName}` : null,
      sectionNum ? `Sec ${sectionNum}` : null,
      tail ? `(${tail})` : null,
    ].filter(Boolean).join(' - ');
    return { value: gs._id, label: label || gs.sectionName || 'Section' };
  });

  return (
    <DropdownSelect
      id={id}
      name={name}
      value={value}
      onChange={(v) => onChange?.(v)}
      disabled={disabled || loading || !gradeId || !shiftId}
      options={options}
      placeholder={loading ? 'Loading…' : placeholder}
      className={className}
      maxHeightClassName="max-h-72"
      buttonProps={rest}
    />
  );
}
