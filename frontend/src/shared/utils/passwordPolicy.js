const DEFAULT_PASSWORD_POLICY = Object.freeze({
  minLength: 6,
  maxLength: 256,
  requireUppercase: false,
  requireLowercase: false,
  requireNumber: false,
  requireSymbol: false,
});

const toPositiveInt = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.trunc(num) : fallback;
};

export function resolvePasswordPolicy(policyInput = {}) {
  const next = policyInput && typeof policyInput === 'object' ? policyInput : {};
  const minLength = toPositiveInt(next.minLength, DEFAULT_PASSWORD_POLICY.minLength);
  const rawMaxLength = toPositiveInt(next.maxLength, DEFAULT_PASSWORD_POLICY.maxLength);
  const maxLength = Math.max(minLength, rawMaxLength);

  return {
    minLength,
    maxLength,
    requireUppercase: Boolean(next.requireUppercase),
    requireLowercase: Boolean(next.requireLowercase),
    requireNumber: Boolean(next.requireNumber),
    requireSymbol: Boolean(next.requireSymbol),
  };
}

export function validatePasswordAgainstPolicy(password, policyInput = {}) {
  const policy = resolvePasswordPolicy(policyInput);
  const value = String(password || '');
  const issues = [];

  if (!value || value.length < policy.minLength) {
    issues.push({ key: 'minLength', meta: { minLength: policy.minLength } });
  }
  if (value.length > policy.maxLength) {
    issues.push({ key: 'maxLength', meta: { maxLength: policy.maxLength } });
  }
  if (policy.requireUppercase && !/[A-Z]/.test(value)) issues.push({ key: 'requireUppercase' });
  if (policy.requireLowercase && !/[a-z]/.test(value)) issues.push({ key: 'requireLowercase' });
  if (policy.requireNumber && !/[0-9]/.test(value)) issues.push({ key: 'requireNumber' });
  if (policy.requireSymbol && !/[^A-Za-z0-9]/.test(value)) issues.push({ key: 'requireSymbol' });

  return {
    ok: issues.length === 0,
    issues,
    policy,
  };
}

export function getPasswordValidationState({ password, confirmPassword, policyInput = {} } = {}) {
  const nextPassword = String(password || '');
  const nextConfirm = String(confirmPassword || '');
  const validation = validatePasswordAgainstPolicy(nextPassword, policyInput);
  const passwordTouched = nextPassword.length > 0;
  const confirmTouched = nextConfirm.length > 0;
  const passwordsMismatch = confirmTouched && nextPassword !== nextConfirm;
  const passwordsMatch = passwordTouched && confirmTouched && nextPassword === nextConfirm && validation.ok;

  return {
    ...validation,
    passwordTouched,
    confirmTouched,
    passwordsMismatch,
    passwordsMatch,
    newPasswordState: passwordTouched ? (validation.ok ? 'valid' : 'invalid') : 'empty',
    confirmPasswordState: confirmTouched ? ((nextPassword === nextConfirm && validation.ok) ? 'valid' : 'invalid') : 'empty',
  };
}

export function getPasswordIssueMessage(issue, t, policyInput = {}) {
  const policy = resolvePasswordPolicy(policyInput);
  const key = typeof issue === 'string' ? issue : String(issue?.key || '');

  if (key === 'minLength') {
    return `${t('privacyControl.password.minLength', { defaultValue: 'Minimum length' })}: ${policy.minLength}`;
  }
  if (key === 'maxLength') {
    return `${t('privacyControl.password.maxLength', { defaultValue: 'Maximum length' })}: ${policy.maxLength}`;
  }
  if (key === 'requireUppercase') {
    return t('privacyControl.password.requireUppercase', { defaultValue: 'Require uppercase letter' });
  }
  if (key === 'requireLowercase') {
    return t('privacyControl.password.requireLowercase', { defaultValue: 'Require lowercase letter' });
  }
  if (key === 'requireNumber') {
    return t('privacyControl.password.requireNumber', { defaultValue: 'Require number' });
  }
  if (key === 'requireSymbol') {
    return t('privacyControl.password.requireSymbol', { defaultValue: 'Require symbol' });
  }

  return t('auth.forcePasswordChange.errors.failed', { defaultValue: 'Password policy validation failed.' });
}

