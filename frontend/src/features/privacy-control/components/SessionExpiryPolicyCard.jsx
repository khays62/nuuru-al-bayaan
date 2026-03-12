import React from 'react';

import Card from '../../../shared/components/ui/Card.jsx';
import FormField from '../../../shared/components/ui/FormField.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import { useI18n } from '../../../i18n/useI18n.js';

export default function SessionExpiryPolicyCard({ value, onChange, errors = {}, disabled = false }) {
  const { t } = useI18n();

  return (
    <Card className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden">
      <div className="px-5 py-3 border-b border-(--nb-color-border)">
        <div className="text-base font-semibold text-(--nb-color-text)">{t('privacyControl.session.title', { defaultValue: 'Session expiry' })}</div>
        <div className="text-xs text-(--nb-color-muted) mt-1">{t('privacyControl.session.subtitle', { defaultValue: 'Auto-logout after inactivity, shared across browser tabs.' })}</div>
      </div>

      <div className="p-5">
        <FormField
          label={t('privacyControl.session.idleTimeoutMinutes', { defaultValue: 'Idle timeout (minutes)' })}
          error={errors['sessionPolicy.idleTimeoutMinutes']}
          hint={t('privacyControl.session.hint', { defaultValue: 'When no tab is active, the session logs out after this many minutes.' })}
        >
          <Input
            type="number"
            min="5"
            value={String(value?.idleTimeoutMinutes ?? '')}
            onChange={(e) => onChange({ ...value, idleTimeoutMinutes: Number(e.target.value || 0) })}
            disabled={disabled}
          />
        </FormField>
      </div>
    </Card>
  );
}