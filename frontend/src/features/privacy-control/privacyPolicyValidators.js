import { getResolvedPrivacyPolicy } from './privacyPolicyDefaults.js';

function pushError(errors, path, message) {
  errors[path] = message;
}

export function validatePrivacyPolicyDraft(input, t) {
  const policy = getResolvedPrivacyPolicy(input);
  const errors = {};

  if (Number(policy.passwordPolicy.minLength || 0) < 6) {
    pushError(errors, 'passwordPolicy.minLength', t('privacyControl.validation.passwordMinLengthFloor', { defaultValue: 'Minimum password length must be at least 6.' }));
  }

  if (Number(policy.passwordPolicy.maxLength || 0) < Number(policy.passwordPolicy.minLength || 0)) {
    pushError(errors, 'passwordPolicy.maxLength', t('privacyControl.validation.passwordMaxLengthFloor', { defaultValue: 'Maximum password length must be greater than or equal to minimum length.' }));
  }

  if (Number(policy.sessionPolicy.idleTimeoutMinutes || 0) < 5) {
    pushError(errors, 'sessionPolicy.idleTimeoutMinutes', t('privacyControl.validation.sessionMin', { defaultValue: 'Idle timeout must be at least 5 minutes.' }));
  }

  const stages = [
    ['loginProtection.stageOneAttempts', Number(policy.loginProtection.stageOneAttempts || 0)],
    ['loginProtection.stageTwoAttempts', Number(policy.loginProtection.stageTwoAttempts || 0)],
    ['loginProtection.stageThreeAttempts', Number(policy.loginProtection.stageThreeAttempts || 0)],
  ];

  for (const [path, value] of stages) {
    if (value < 1) {
      pushError(errors, path, t('privacyControl.validation.loginAttempts', { defaultValue: 'Attempt thresholds must be at least 1.' }));
    }
  }

  const cooldowns = [
    ['loginProtection.stageOneCooldownSeconds', Number(policy.loginProtection.stageOneCooldownSeconds || 0)],
    ['loginProtection.stageTwoCooldownSeconds', Number(policy.loginProtection.stageTwoCooldownSeconds || 0)],
    ['loginProtection.stageThreeCooldownSeconds', Number(policy.loginProtection.stageThreeCooldownSeconds || 0)],
  ];

  for (const [path, value] of cooldowns) {
    if (value < 1) {
      pushError(errors, path, t('privacyControl.validation.cooldownSeconds', { defaultValue: 'Cooldown values must be at least 1 second.' }));
    }
  }

  if (Number(policy.loginProtection.lockoutSeconds || 0) < 60) {
    pushError(errors, 'loginProtection.lockoutSeconds', t('privacyControl.validation.lockoutDurationMin', { defaultValue: 'Block duration must be at least 1 minute.' }));
  }

  return errors;
}

export function hasPrivacyPolicyErrors(errors) {
  return Boolean(errors && Object.keys(errors).length > 0);
}