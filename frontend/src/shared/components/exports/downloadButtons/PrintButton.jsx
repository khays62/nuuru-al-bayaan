import React from 'react';
import { Printer } from 'lucide-react';
import ActionButton from '../../ui/ActionButton';
import { useI18n } from '../../../../i18n/useI18n';

export default function PrintButton({ onClick, disabled = false, className = '', size = 'md', variant = 'outline' }) {
  const { t } = useI18n();
  const label = t('common.actions.print', { defaultValue: 'Print' });

  return (
    <ActionButton
      variant={variant}
      size={size}
      className={className}
      icon={<Printer size={16} />}
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <span className="sr-only sm:not-sr-only">{label}</span>
    </ActionButton>
  );
}
