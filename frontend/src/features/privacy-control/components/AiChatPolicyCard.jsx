import React from 'react';

import Card from '../../../shared/components/ui/Card.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox.jsx';
import FormField from '../../../shared/components/ui/FormField.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import { useI18n } from '../../../i18n/useI18n.js';

function NumberField({ id, label, value, onChange, min = 0, error, hint, disabled = false }) {
  return (
    <FormField label={label} htmlFor={id} error={error} hint={hint}>
      <Input
        id={id}
        type="number"
        min={min}
        disabled={disabled}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormField>
  );
}

export default function AiChatPolicyCard({ value, onChange, errors = {}, disabled = false }) {
  const { t } = useI18n();

  const setField = (field, nextValue) => {
    onChange({ ...value, [field]: nextValue === '' ? '' : Number(nextValue) });
  };

  return (
    <Card className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden">
      <div className="px-5 py-3 border-b border-(--nb-color-border)">
        <div className="text-base font-semibold text-(--nb-color-text)">
          {t('privacyControl.aiChat.title', { defaultValue: 'AI chat limits' })}
        </div>
        <div className="text-xs text-(--nb-color-muted) mt-1">
          {t('privacyControl.aiChat.subtitle', { defaultValue: 'Set daily AI message limits per role. Admin is exempt.' })}
        </div>
      </div>

      <div className="p-5 space-y-5">
        <label className="flex items-start gap-3">
          <Checkbox
            checked={Boolean(value?.enabled)}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          />
          <div>
            <div className="text-sm font-medium text-(--nb-color-text)">
              {t('privacyControl.aiChat.enabled', { defaultValue: 'Enable AI chat' })}
            </div>
            <div className="text-xs text-(--nb-color-muted)">
              {t('privacyControl.aiChat.enabledHint', { defaultValue: 'When disabled, non-admin users cannot use AI chat.' })}
            </div>
          </div>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberField
            id="ai-student-limit"
            label={t('privacyControl.aiChat.dailyLimitStudent', { defaultValue: 'Student daily messages' })}
            value={value?.dailyLimitStudent}
            onChange={(v) => setField('dailyLimitStudent', v)}
            error={errors['aiChat.dailyLimitStudent']}
            hint={t('privacyControl.aiChat.dailyLimitHint', { defaultValue: 'Set 0 to disable for that role.' })}
            disabled={disabled || !value?.enabled}
          />
          <NumberField
            id="ai-teacher-limit"
            label={t('privacyControl.aiChat.dailyLimitTeacher', { defaultValue: 'Teacher daily messages' })}
            value={value?.dailyLimitTeacher}
            onChange={(v) => setField('dailyLimitTeacher', v)}
            error={errors['aiChat.dailyLimitTeacher']}
            hint={t('privacyControl.aiChat.dailyLimitHint', { defaultValue: 'Set 0 to disable for that role.' })}
            disabled={disabled || !value?.enabled}
          />
          <NumberField
            id="ai-staff-limit"
            label={t('privacyControl.aiChat.dailyLimitStaff', { defaultValue: 'Staff daily messages' })}
            value={value?.dailyLimitStaff}
            onChange={(v) => setField('dailyLimitStaff', v)}
            error={errors['aiChat.dailyLimitStaff']}
            hint={t('privacyControl.aiChat.dailyLimitHint', { defaultValue: 'Set 0 to disable for that role.' })}
            disabled={disabled || !value?.enabled}
          />
        </div>
      </div>
    </Card>
  );
}
