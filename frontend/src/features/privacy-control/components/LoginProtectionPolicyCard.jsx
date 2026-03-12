import React from 'react';

import Card from '../../../shared/components/ui/Card.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox.jsx';
import FormField from '../../../shared/components/ui/FormField.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Select from '../../../shared/components/ui/Select.jsx';
import { useI18n } from '../../../i18n/useI18n.js';

const LOCKOUT_DURATION_UNITS = [
  { value: 'minutes', seconds: 60, labelKey: 'privacyControl.loginProtection.durationUnitMinutes', defaultLabel: 'Minutes' },
  { value: 'hours', seconds: 60 * 60, labelKey: 'privacyControl.loginProtection.durationUnitHours', defaultLabel: 'Hours' },
  { value: 'days', seconds: 24 * 60 * 60, labelKey: 'privacyControl.loginProtection.durationUnitDays', defaultLabel: 'Days' },
  { value: 'weeks', seconds: 7 * 24 * 60 * 60, labelKey: 'privacyControl.loginProtection.durationUnitWeeks', defaultLabel: 'Weeks' },
  { value: 'months', seconds: 30 * 24 * 60 * 60, labelKey: 'privacyControl.loginProtection.durationUnitMonths', defaultLabel: 'Months' },
];

function inferLockoutUnit(seconds) {
  const value = Number(seconds || 0);
  if (!Number.isFinite(value) || value <= 0) return 'days';
  const match = LOCKOUT_DURATION_UNITS.find((unit) => value % unit.seconds === 0);
  return match?.value || 'minutes';
}

function getUnitSeconds(unitValue) {
  return LOCKOUT_DURATION_UNITS.find((unit) => unit.value === unitValue)?.seconds || 60;
}

function NumberField({ id, label, value, onChange, min = 1, error, hint, disabled = false }) {
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

export default function LoginProtectionPolicyCard({ value, onChange, errors = {}, disabled = false }) {
  const { t } = useI18n();
  const [lockoutUnit, setLockoutUnit] = React.useState(() => inferLockoutUnit(value?.lockoutSeconds));

  React.useEffect(() => {
    const seconds = Number(value?.lockoutSeconds || 0);
    const currentUnitSeconds = getUnitSeconds(lockoutUnit);
    if (!Number.isFinite(seconds) || seconds <= 0 || (seconds % currentUnitSeconds) !== 0) {
      setLockoutUnit(inferLockoutUnit(seconds));
    }
  }, [lockoutUnit, value?.lockoutSeconds]);

  const setField = (field, nextValue) => {
    onChange({ ...value, [field]: nextValue === '' ? '' : Number(nextValue) });
  };

  const lockoutAmount = React.useMemo(() => {
    const seconds = Number(value?.lockoutSeconds || 0);
    const unitSeconds = getUnitSeconds(lockoutUnit);
    if (!Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(unitSeconds) || unitSeconds <= 0) {
      return '';
    }
    return String(Math.max(1, Math.floor(seconds / unitSeconds)));
  }, [lockoutUnit, value?.lockoutSeconds]);

  const setLockoutAmount = (nextValue) => {
    if (nextValue === '') {
      onChange({ ...value, lockoutSeconds: '' });
      return;
    }
    const amount = Math.max(1, Number(nextValue) || 0);
    onChange({ ...value, lockoutSeconds: amount * getUnitSeconds(lockoutUnit) });
  };

  const setLockoutUnitValue = (nextUnit) => {
    const safeUnit = LOCKOUT_DURATION_UNITS.some((unit) => unit.value === nextUnit) ? nextUnit : 'days';
    const currentAmount = lockoutAmount === '' ? '' : Math.max(1, Number(lockoutAmount) || 0);
    setLockoutUnit(safeUnit);
    onChange({
      ...value,
      lockoutSeconds: currentAmount === '' ? '' : currentAmount * getUnitSeconds(safeUnit),
    });
  };

  return (
    <Card className="rounded-xl border border-(--nb-color-border) bg-(--nb-color-bg-card) overflow-hidden">
      <div className="px-5 py-3 border-b border-(--nb-color-border)">
        <div className="text-base font-semibold text-(--nb-color-text)">{t('privacyControl.loginProtection.title', { defaultValue: 'Login protection' })}</div>
        <div className="text-xs text-(--nb-color-muted) mt-1">{t('privacyControl.loginProtection.subtitle', { defaultValue: 'Configure progressive cooldowns before long block.' })}</div>
      </div>

      <div className="p-5 space-y-5">
        <label className="flex items-start gap-3">
          <Checkbox checked={Boolean(value?.enabled)} disabled={disabled} onChange={(e) => onChange({ ...value, enabled: e.target.checked })} />
          <div>
            <div className="text-sm font-medium text-(--nb-color-text)">{t('privacyControl.loginProtection.enabled', { defaultValue: 'Enable progressive blocking' })}</div>
            <div className="text-xs text-(--nb-color-muted)">{t('privacyControl.loginProtection.enabledHint', { defaultValue: 'Wrong passwords trigger short cooldowns first, then a full block.' })}</div>
          </div>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <NumberField id="lp-stage1-attempts" label={t('privacyControl.loginProtection.stage1Attempts', { defaultValue: 'Stage 1 attempts' })} value={value?.stageOneAttempts} onChange={(v) => setField('stageOneAttempts', v)} error={errors['loginProtection.stageOneAttempts']} disabled={disabled} />
          <NumberField id="lp-stage1-cooldown" label={t('privacyControl.loginProtection.stage1Cooldown', { defaultValue: 'Stage 1 cooldown (sec)' })} value={value?.stageOneCooldownSeconds} onChange={(v) => setField('stageOneCooldownSeconds', v)} error={errors['loginProtection.stageOneCooldownSeconds']} disabled={disabled} />
          <NumberField id="lp-stage2-attempts" label={t('privacyControl.loginProtection.stage2Attempts', { defaultValue: 'Stage 2 attempts' })} value={value?.stageTwoAttempts} onChange={(v) => setField('stageTwoAttempts', v)} error={errors['loginProtection.stageTwoAttempts']} disabled={disabled} />
          <NumberField id="lp-stage2-cooldown" label={t('privacyControl.loginProtection.stage2Cooldown', { defaultValue: 'Stage 2 cooldown (sec)' })} value={value?.stageTwoCooldownSeconds} onChange={(v) => setField('stageTwoCooldownSeconds', v)} error={errors['loginProtection.stageTwoCooldownSeconds']} disabled={disabled} />
          <NumberField id="lp-stage3-attempts" label={t('privacyControl.loginProtection.stage3Attempts', { defaultValue: 'Stage 3 attempts' })} value={value?.stageThreeAttempts} onChange={(v) => setField('stageThreeAttempts', v)} error={errors['loginProtection.stageThreeAttempts']} disabled={disabled} />
          <NumberField id="lp-stage3-cooldown" label={t('privacyControl.loginProtection.stage3Cooldown', { defaultValue: 'Stage 3 cooldown (sec)' })} value={value?.stageThreeCooldownSeconds} onChange={(v) => setField('stageThreeCooldownSeconds', v)} error={errors['loginProtection.stageThreeCooldownSeconds']} disabled={disabled} />
        </div>

        <FormField label={t('privacyControl.loginProtection.lockoutSeconds', { defaultValue: 'Block duration' })} htmlFor="lp-lockout-seconds" error={errors['loginProtection.lockoutSeconds']}>
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_180px] gap-3">
            <Input
              id="lp-lockout-seconds"
              type="number"
              min={1}
              disabled={disabled}
              value={lockoutAmount}
              onChange={(e) => setLockoutAmount(e.target.value)}
            />
            <Select value={lockoutUnit} disabled={disabled} onChange={(e) => setLockoutUnitValue(e.target.value)}>
              {LOCKOUT_DURATION_UNITS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {t(unit.labelKey, { defaultValue: unit.defaultLabel })}
                </option>
              ))}
            </Select>
          </div>
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberField id="lp-id-max" label={t('privacyControl.loginProtection.maxIdentifierLength', { defaultValue: 'Max username length' })} value={value?.maxIdentifierLength} onChange={(v) => setField('maxIdentifierLength', v)} disabled={disabled} />
          <NumberField id="lp-pw-max" label={t('privacyControl.loginProtection.maxPasswordLength', { defaultValue: 'Max password length' })} value={value?.maxPasswordLength} onChange={(v) => setField('maxPasswordLength', v)} disabled={disabled} />
        </div>
      </div>
    </Card>
  );
}