// StatusBadge.jsx
// Qayb kooban oo muujisa status (Active/Inactive/...).
// Contract: props = { status: string, className?: string }
// Fiiro: Waa skeleton kaliya; styles/logic waxaa la xoojin doonaa marka Marxalad 1 la fuliyo.
import React from 'react';
import Badge from '../Badge.jsx';
import { useI18n } from '../../../../i18n/useI18n';

export default function StatusBadge({ status, className = '' }) {
  const { t } = useI18n();
  const norm = (status || '').toLowerCase();
  const variant =
    norm === 'active' ? 'success' :
    norm === 'inactive' ? 'neutral' :
    'neutral';

  const label =
    norm === 'active'
      ? t('common.status.active', { defaultValue: status || 'Active' })
      : norm === 'inactive'
        ? t('common.status.inactive', { defaultValue: status || 'Inactive' })
        : (status || 'â€”');
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
