// StatusBadge.jsx
// Qayb kooban oo muujisa status (Active/Inactive/...).
// Contract: props = { status: string, className?: string }
// Fiiro: Waa skeleton kaliya; styles/logic waxaa la xoojin doonaa marka Marxalad 1 la fuliyo.
import React from 'react';

export default function StatusBadge({ status, className = '' }) {
  const norm = (status || '').toLowerCase();
  const style =
    norm === 'active' ? 'bg-green-100 text-green-700' :
    norm === 'inactive' ? 'bg-gray-100 text-gray-700' :
    'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style} ${className}`}>
      {status || '—'}
    </span>
  );
}
