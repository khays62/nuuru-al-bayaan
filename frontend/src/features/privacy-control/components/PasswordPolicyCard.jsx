import React from 'react';

import Card from '../../../shared/components/ui/Card.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox.jsx';
import FormField from '../../../shared/components/ui/FormField.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import { useI18n } from '../../../i18n/useI18n.js';

export default function PasswordPolicyCard({ value, onChange, errors = {}, disabled = false }) {
  const { t } = useI18n();

  const setField = (field, nextValue) => {
    onChange({ ...value, [field]: nextValue });
  };

  return (
    <Card className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden">
      <div className="px-5 py-3 border-b border-(--nb-color-border)">
        <div className="text-base font-semibold text-(--nb-color-text)">{t('privacyControl.password.title', { defaultValue: 'Password policy' })}</div>
        <div className="text-xs text-(--nb-color-muted) mt-1">{t('privacyControl.password.subtitle', { defaultValue: 'Control password length and complexity for staff, teachers, and students.' })}</div>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label={t('privacyControl.password.minLength', { defaultValue: 'Minimum length' })} error={errors['passwordPolicy.minLength']}>
            <Input type="number" min="6" value={String(value?.minLength ?? '')} onChange={(e) => setField('minLength', Number(e.target.value || 0))} disabled={disabled} />
          </FormField>

          <FormField label={t('privacyControl.password.maxLength', { defaultValue: 'Maximum length' })} error={errors['passwordPolicy.maxLength']}>
            <Input type="number" min="6" value={String(value?.maxLength ?? '')} onChange={(e) => setField('maxLength', Number(e.target.value || 0))} disabled={disabled} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            ['requireUppercase', t('privacyControl.password.requireUppercase', { defaultValue: 'Require uppercase letter' })],
            ['requireLowercase', t('privacyControl.password.requireLowercase', { defaultValue: 'Require lowercase letter' })],
            ['requireNumber', t('privacyControl.password.requireNumber', { defaultValue: 'Require number' })],
            ['requireSymbol', t('privacyControl.password.requireSymbol', { defaultValue: 'Require symbol' })],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 rounded-lg border border-(--nb-color-border) bg-(--nb-color-bg) px-3 py-2">
              <Checkbox checked={Boolean(value?.[key])} disabled={disabled} onChange={(e) => setField(key, e.target.checked)} />
              <span className="text-sm text-(--nb-color-text)">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </Card>
  );
}