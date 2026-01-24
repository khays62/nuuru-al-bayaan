// StatusBadge.jsx
// Qayb kooban oo muujisa status (Active/Inactive/...).
// Contract: props = { status: string, className?: string }
// Fiiro: Waa skeleton kaliya; styles/logic waxaa la xoojin doonaa marka Marxalad 1 la fuliyo.
import React from 'react';
import Badge from '../Badge.jsx';

export default function StatusBadge({ status, className = '' }) {
  const norm = (status || '').toLowerCase();
  const variant =
    norm === 'active' ? 'success' :
    norm === 'inactive' ? 'neutral' :
    'neutral';
  return (
    <Badge variant={variant} className={className}>
      {status || '—'}
    </Badge>
  );
}
