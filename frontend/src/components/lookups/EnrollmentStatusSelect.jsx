import React from 'react';

// Reusable single-select for enrollment status filtering across pages.
// Values supported (MVP): active, graduated, promoted, transferred, withdrawn, all.
// Optional includeInactive to surface 'inactive'.
export default function EnrollmentStatusSelect({ value, onChange, includeInactive = false, className = '', id, name, placeholder = 'Enrollment Status' }) {
  const base = [
    { value: 'active', label: 'Active only' },
    { value: 'graduated', label: 'Graduated only' },
    { value: 'promoted', label: 'Promoted only' },
    { value: 'transferred', label: 'Transferred only' },
    { value: 'withdrawn', label: 'Withdrawn only' }
  ];
  if (includeInactive) base.splice(1, 0, { value: 'inactive', label: 'Inactive only' });
  const allOption = { value: 'all', label: 'All (include closed)' };
  const options = [...base, allOption];
  return (
    <select id={id} name={name} value={value} onChange={(e)=>onChange?.(e.target.value)} className={`border rounded px-2 py-1 ${className}`}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
