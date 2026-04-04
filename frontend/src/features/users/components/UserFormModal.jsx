import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import Modal from '../../../shared/components/ui/Modal.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Label from '../../../shared/components/ui/Label.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import SomaliaAddressFields from '../../../shared/components/address/SomaliaAddressFields.jsx';

import { isValidSomaliaPhone } from '../../../shared/utils/phoneSomalia.js';
import {
  getPasswordIssueMessage,
  getPasswordValidationState,
  resolvePasswordPolicy,
} from '../../../shared/utils/passwordPolicy.js';
import { checkUsernameAvailability } from '../api/usersApi.js';
import { useAuth } from '../../../auth/AuthContext.jsx';

import { useI18n } from '../../../i18n/useI18n';

const MODULE_GROUPS = Object.freeze([
  {
    id: 'finance',
    defaultLabel: 'Finance',
    order: [
      'financeDashboard',
      'financeAccounts',
      'financeStudent',
      'financePayroll',
      'financeExpenses',
    ],
  },
  {
    id: 'users',
    defaultLabel: 'Users',
    order: ['students', 'teachers'],
  },
  {
    id: 'academics',
    defaultLabel: 'Academics',
    order: ['grades', 'subjects', 'cohorts', 'promotions', 'transfers'],
  },
  {
    id: 'exams',
    defaultLabel: 'Exams',
    order: ['exams', 'results', 'transcript'],
  },
  {
    id: 'operations',
    defaultLabel: 'Operations',
    order: ['attendance', 'attendanceReports', 'timetable', 'library'],
  },
  {
    id: 'announcements',
    defaultLabel: 'Announcements',
    order: ['announcements'],
  },
  {
    id: 'security',
    defaultLabel: 'Security',
    order: ['security', 'trackingAudit', 'privacyControl'],
  },
  {
    id: 'other',
    defaultLabel: 'Other',
    order: [],
  },
]);

const FINANCE_PRIMARY_MODULES = Object.freeze([
  'financeDashboard',
  'financeAccounts',
  'financeStudent',
  'financePayroll',
  'financeExpenses',
]);

const FINANCE_PRINT_SOURCES = Object.freeze([
  'financeAccounts',
  'financeStudent',
  'financePayroll',
  'financeExpenses',
  'financeAppointments',
]);

const FINANCE_EXTRA_SECTIONS_BY_PRIMARY = Object.freeze({
  financeDashboard: Object.freeze([
    { key: 'foundation', module: 'financeFoundation', titleKey: 'users.form.finance.foundation', defaultTitle: 'Finance Setup' },
    { key: 'audit', module: 'financeAudit', titleKey: 'users.form.finance.audit', defaultTitle: 'Audit' },
    { key: 'maintenance', module: 'financeMaintenance', titleKey: 'users.form.finance.maintenance', defaultTitle: 'Maintenance' },
  ]),
  financeExpenses: Object.freeze([
    { key: 'config', module: 'financeConfig', titleKey: 'users.form.finance.expensesConfig', defaultTitle: 'Expenses Setup' },
  ]),
  financeStudent: Object.freeze([
    { key: 'appointments', module: 'financeAppointments', titleKey: 'users.form.finance.appointments', defaultTitle: 'Appointments' },
  ]),
});

const STUDENT_FINANCE_TABS = Object.freeze([
  { id: 'receipt', defaultLabel: 'Receipt', module: 'financeStudentReceipt' },
  { id: 'previousBalance', defaultLabel: 'Previous Balance', module: 'financeStudentPreviousBalance' },
  { id: 'amountType', defaultLabel: 'Amount Type', module: 'financeStudentAmountType' },
  { id: 'feeType', defaultLabel: 'Fee Type', module: 'financeStudentFeeType' },
]);

const ACCOUNTS_TABS = Object.freeze([
  { id: 'institution', defaultLabel: 'Institution Accounts', module: 'financeAccountsInstitution' },
  { id: 'overview', defaultLabel: 'Balance Overview & Projects', module: 'financeAccountsOverview' },
  { id: 'ledger', defaultLabel: 'General Ledger History', module: 'financeAccountsLedger' },
]);

const EXPENSES_TABS = Object.freeze([
  { id: 'ledger', defaultLabel: 'Expense Ledger', module: 'financeExpensesLedger' },
  { id: 'categories', defaultLabel: 'Expense Categories', module: 'financeExpensesCategories' },
]);

const moduleHasAnyEnabledPermission = (permObj) => {
  if (!permObj) return false;
  const o = typeof permObj?.toObject === 'function' ? permObj.toObject() : permObj;
  if (o?.full === true) return true;
  return Object.entries(o || {}).some(([k, v]) => k !== 'full' && v === true);
};

function moduleGroupIdFor(moduleId) {
  const m = String(moduleId || '');
  if (!m) return '';
  if (m.startsWith('finance')) return 'finance';
  if (m === 'security' || m === 'trackingAudit' || m === 'privacyControl') return 'security';
  const grp = MODULE_GROUPS.find((g) => Array.isArray(g.order) && g.order.includes(m));
  return grp?.id || 'other';
}

function formatModuleLabel(mod) {
  const s = String(mod || '');
  if (!s) return '';

  if (s === 'security') return 'Bell Notification';
  if (s === 'trackingAudit') return 'Tracking Audit';
  if (s === 'privacyControl') return 'Privacy Control';

  // Split camelCase + underscores into human labels.
  const spaced = s
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatPermissionLabel(module, perm) {
  if (perm === 'full') return 'Full Access (Select All)';
  if (perm === 'resetPassword') return 'Reset Password';
  if (perm === 'unlock') return 'Unlock';

  // Bell notifications use account-status wording in the UI.
  if (module === 'security' && perm === 'deactivate') return 'Inactive';
  if (module === 'security' && perm === 'activate') return 'Active';

  return perm;
}

function deriveStaffMetaFromPermissions(permissions) {
  const p = permissions && typeof permissions === 'object' ? permissions : {};
  const enabledModules = Object.entries(p)
    .filter(([, permObj]) => moduleHasAnyEnabledPermission(permObj))
    .map(([module]) => String(module));

  if (!enabledModules.length) return { unit: '', jobTitle: '' };

  const groupFor = (m) => {
    if (m.startsWith('finance')) return 'finance';
    if (m === 'security' || m === 'trackingAudit' || m === 'privacyControl') return 'security';
    if (m === 'announcements') return 'announcements';
    if (m === 'students' || m === 'teachers') return 'users';
    if (['grades', 'subjects', 'cohorts', 'promotions', 'transfers'].includes(m)) return 'academics';
    if (['exams', 'results', 'transcript'].includes(m)) return 'exams';
    if (['attendance', 'attendanceReports', 'timetable', 'library'].includes(m)) return 'operations';
    return 'other';
  };

  const groupsEnabled = Array.from(new Set(enabledModules.map(groupFor))).filter(Boolean);
  const unit = (enabledModules.length === 1) ? enabledModules[0] : 'multiple';
  const jobTitle = (groupsEnabled.length === 1) ? groupsEnabled[0] : 'multiple';

  return { unit, jobTitle };
}

export default function UserFormModal({
  isOpen,
  onClose,
  title,
  editingUser,
  isFormLoading,
  isSaving,
  form,
  createReadOnly,
  setCreateReadOnly,
  handleSubmit,
  handleChange,
  togglePermission,
  MODULES,
  MODULE_PERMISSIONS,
  onCancel,
}) {
  const { t } = useI18n();
  const { auth } = useAuth();

  const [touched, setTouched] = useState({});
  const BLUR_VALIDATION_TOAST_ID = 'user-form-modal:blur-validation';

  const [usernameCheck, setUsernameCheck] = useState({ status: 'idle', message: '' });
  const [isUsernameFocused, setIsUsernameFocused] = useState(false);
  const lastUsernameToastKeyRef = useRef('');

  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedStudentFinanceTab, setSelectedStudentFinanceTab] = useState('receipt');
  const [selectedAccountsTab, setSelectedAccountsTab] = useState('institution');
  const [selectedExpensesTab, setSelectedExpensesTab] = useState('ledger');
  const passwordPolicy = useMemo(
    () => resolvePasswordPolicy(auth?.privacyPolicy?.passwordPolicy),
    [auth?.privacyPolicy?.passwordPolicy],
  );
  const passwordUi = useMemo(
    () => getPasswordValidationState({
      password: String(form?.password || ''),
      confirmPassword: String(form?.confirmPassword || ''),
      policyInput: passwordPolicy,
    }),
    [form?.confirmPassword, form?.password, passwordPolicy],
  );
  const firstPasswordIssueMessage = passwordUi.issues[0]
    ? getPasswordIssueMessage(passwordUi.issues[0], t, passwordPolicy)
    : '';

  const [localPhotoUrl, setLocalPhotoUrl] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTouched({});
    setUsernameCheck({ status: 'idle', message: '' });
  }, [isOpen, editingUser?._id]);

  useEffect(() => {
    if (!isOpen) return;
    if (isFormLoading || isSaving) return;

    const raw = String(form?.username ?? '');
    const value = raw.trim();

    // Do not validate empty username in edit/create typing; let required submit handle it.
    if (!value) {
      setUsernameCheck({ status: 'idle', message: '' });
      return;
    }

    if (value.length < 4 || value.length > 10) {
      setUsernameCheck({
        status: 'invalid',
        message: t('users.form.validations.usernameLength', { defaultValue: 'Username must be 4-10 characters' }),
      });
      return;
    }

    // If editing and username unchanged, treat as valid without checking.
    const prev = String(editingUser?.username || '').trim();
    if (editingUser?._id && prev && prev === value) {
      setUsernameCheck({ status: 'valid', message: '' });
      return;
    }

    // Keep request running, but don't show a loading message in the UI.
    setUsernameCheck({ status: 'checking', message: '' });
    const controller = new AbortController();
    const to = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailability(value, { excludeId: editingUser?._id, signal: controller.signal });
        const available = Boolean(res?.available);
        if (!available) {
          setUsernameCheck({
            status: 'taken',
            message: t('users.form.validations.usernameExists', { defaultValue: 'Username already exists' }),
          });
          return;
        }
        setUsernameCheck({ status: 'valid', message: '' });
      } catch (e) {
        if (String(e?.name || '') === 'AbortError') return;
        setUsernameCheck({ status: 'idle', message: '' });
      }
    }, 350);

    return () => {
      clearTimeout(to);
      controller.abort();
    };
  }, [isOpen, form?.username, editingUser?._id, editingUser?.username, isFormLoading, isSaving, t]);

  useEffect(() => {
    if (!isOpen) return;
    const v = String(form?.username ?? '').trim();
    if (!v) return;
    if (!touched.username) return;
    if (isUsernameFocused) return;

    const isInvalid = usernameCheck.status === 'taken' || usernameCheck.status === 'invalid';
    if (!isInvalid) return;

    const msg = String(usernameCheck.message || '').trim();
    if (!msg) return;

    const key = `${usernameCheck.status}:${v}`;
    if (lastUsernameToastKeyRef.current === key) return;
    lastUsernameToastKeyRef.current = key;
    toast.error(msg, { id: BLUR_VALIDATION_TOAST_ID });
  }, [isOpen, form?.username, touched.username, isUsernameFocused, usernameCheck.status, usernameCheck.message]);

  const setFieldValue = (name, value) => handleChange?.({ target: { name, value } });

  const collapseWsKeepTrailing = (value) => {
    const raw = String(value ?? '');
    const endsWithSpace = /\s$/.test(raw);
    const collapsed = raw.replace(/\s+/g, ' ').replace(/^\s+/, '');
    const core = collapsed.trim();
    if (!core) return '';
    return endsWithSpace ? `${core} ` : core;
  };

  const toTitleCaseWordsLive = (value) => {
    const s = collapseWsKeepTrailing(value);
    if (!s) return '';
    const endsWithSpace = s.endsWith(' ');
    const core = s.trim();
    const formatted = core
      .split(' ')
      .filter(Boolean)
      .map((w) => {
        const word = String(w || '');
        const first = word[0]?.toUpperCase?.() || '';
        const rest = word.slice(1).toLowerCase();
        return `${first}${rest}`;
      })
      .join(' ');
    return endsWithSpace ? `${formatted} ` : formatted;
  };

  const sanitizeSomaliaPhoneInput = (value) => {
    const raw = String(value ?? '');
    const hasPlus = raw.startsWith('+');
    const digits = raw.replace(/\D/g, '');
    return hasPlus ? `+${digits}` : digits;
  };

  const getSomaliaNationalDigits = (value) => {
    const raw = String(value ?? '');
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('252')) return digits.slice(3);
    if (digits.startsWith('0')) return digits.slice(1);
    return digits;
  };

  const isValidEmail = (value) => {
    const v = String(value ?? '').trim();
    if (!v) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  };

  const validateFourNames = (value) => {
    const v = String(value ?? '').trim();
    const parts = v.split(/\s+/).filter(Boolean);
    return parts.length >= 4;
  };

  const getPhoneValidationError = (value) => {
    const v = String(value ?? '').trim();
    if (!v) return '';
    const national = getSomaliaNationalDigits(v);
    if (national.length > 9) return t('users.form.validations.phoneTooLong', { defaultValue: 'Phone number is too long' });
    if (national.length === 1) {
      const first = national[0];
      if (first !== '6' && first !== '7') {
        return t('users.form.validations.phoneInvalidHint', { defaultValue: 'Phone should start with 61/62/68 or 7x' });
      }
    }
    if (national.length >= 2) {
      const okStart = /^6[128]|^7\d/.test(national);
      if (!okStart) {
        return t('users.form.validations.phoneInvalidHint', { defaultValue: 'Phone should start with 61/62/68 or 7x' });
      }
    }
    if (national.length > 0 && national.length < 9) return t('users.form.validations.phoneTooShort', { defaultValue: 'Phone number is too short' });
    return isValidSomaliaPhone(v) ? '' : t('users.form.validations.phoneInvalid', { defaultValue: 'Invalid phone number' });
  };

  const stateToClass = (state) => {
    if (state === 'invalid') return 'border-red-500';
    if (state === 'valid') return 'border-green-500';
    return '';
  };

  const usernameFieldState = () => {
    const v = String(form?.username ?? '').trim();
    if (!v) return 'empty';
    if (v.length < 4 || v.length > 10) return touched.username ? 'invalid' : 'empty';
    if (usernameCheck.status === 'taken') return 'invalid';
    if (usernameCheck.status === 'valid') return 'valid';
    return 'empty';
  };

  const markTouched = (field) => setTouched((p) => ({ ...p, [field]: true }));

  const onBlurValidate = (field, getError, opts = {}) => {
    const raw = Object.prototype.hasOwnProperty.call(opts || {}, 'value') ? opts?.value : form?.[field];
    const v = String(raw ?? '').trim();

    // UX rule: don't mark as touched / don't toast when empty.
    if (!v) return;

    markTouched(field);
    const error = typeof getError === 'function' ? String(getError() || '') : '';
    if (!error) return;
    const label = opts?.label || field;
    toast.error(`${label}: ${error}`, { id: BLUR_VALIDATION_TOAST_ID });
  };

  const nameFieldState = () => {
    const v = String(form?.fullName ?? '').trim();
    if (!v) return 'empty';
    return validateFourNames(v) ? 'valid' : 'invalid';
  };

  const emailFieldState = () => {
    const v = String(form?.email ?? '').trim();
    if (!v) return 'empty';
    return isValidEmail(v) ? 'valid' : 'invalid';
  };

  const phoneFieldState = (field) => {
    const v = String(form?.[field] ?? '').trim();
    if (!v) return 'empty';
    return isValidSomaliaPhone(v) ? 'valid' : 'invalid';
  };

  const passwordFieldState = () => {
    return passwordUi.newPasswordState;
  };

  const confirmPasswordFieldState = () => {
    return passwordUi.confirmPasswordState;
  };

  useEffect(() => {
    const f = form?.photo;
    if (!(f instanceof File)) {
      setLocalPhotoUrl('');
      return;
    }
    const u = URL.createObjectURL(f);
    setLocalPhotoUrl(u);
    return () => {
      try {
        URL.revokeObjectURL(u);
      } catch {
        // ignore
      }
    };
  }, [form?.photo]);

  const derivedMeta = useMemo(() => deriveStaffMetaFromPermissions(form?.permissions), [form?.permissions]);

  const unitLabel = (value) => {
    const s = String(value || '').trim();
    if (!s) return '';

    // If it matches a known group id (or 'multiple'), show translated group label.
    const groupKey = `users.staff.units.${s}`;
    const g = t(groupKey);
    if (g && g !== groupKey) return g;

    // Otherwise treat it like a module id.
    return moduleLabel(s);
  };

  const cardBase =
    'rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg-card) ' +
    'shadow-(--nb-shadow-md) shadow-[0_10px_18px_-12px_rgba(0,0,0,0.35)] ' +
    'hover:border-(--nb-color-accent) transition-colors';

  const cardHeaderBase =
    'px-3 py-1.5 border-b border-(--nb-color-border) ' +
    'bg-linear-to-r from-(--nb-color-brand-100) to-(--nb-color-accent-100) ' +
    'rounded-t-(--nb-radius-md)';

  const permChipClassName = (checked) => (
    'flex items-center gap-2 p-2 rounded-(--nb-radius-sm) border transition-colors ' +
    (checked
      ? 'border-(--nb-color-accent) bg-(--nb-color-accent-50)'
      : 'border-(--nb-color-border) bg-(--nb-color-bg-card) hover:border-(--nb-color-accent) hover:bg-(--nb-color-brand-50)')
  );

  const moduleLabel = useCallback((mod) => {
    const key = `modules.${String(mod || '')}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;
    return formatModuleLabel(mod);
  }, [t]);

  const permissionLabel = (module, perm) => {
    // Bell notifications use account-status wording in the UI.
    if (module === 'security' && perm === 'deactivate') return t('common.status.inactive');
    if (module === 'security' && perm === 'activate') return t('common.status.active');

    const key = `perms.${String(perm || '')}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;
    return formatPermissionLabel(module, perm);
  };

  // Keep group selection in sync with selected module (especially when editing an existing user).
  useEffect(() => {
    if (!isOpen) return;
    if (String(form?.role || '') !== 'staff') return;
    const derived = moduleGroupIdFor(form?.selectedModule);
    setSelectedGroup((prev) => {
      const prevId = String(prev || '');
      const derivedId = String(derived || '');
      const selectedMod = String(form?.selectedModule || '');
      // If a module is already selected, always keep the group aligned to it.
      if (selectedMod && derivedId && prevId !== derivedId) return derivedId;
      // Otherwise, keep the user's group selection if present.
      return prevId || derivedId || '';
    });
  }, [isOpen, form?.role, form?.selectedModule, MODULE_PERMISSIONS]);

  // When selecting Student Finance, default the tab to a tab that already has permissions (if any).
  useEffect(() => {
    if (!isOpen) return;
    if (String(form?.role || '') !== 'staff') return;
    if (String(form?.selectedModule || '') !== 'financeStudent') return;

    const tabs = STUDENT_FINANCE_TABS
      .filter((x) => x?.module && Array.isArray(MODULE_PERMISSIONS?.[x.module]));

    const found = tabs.find((x) => moduleHasAnyEnabledPermission(form?.permissions?.[x.module]));
    if (found?.id) setSelectedStudentFinanceTab(found.id);
  }, [isOpen, form?.role, form?.selectedModule, form?.permissions, MODULE_PERMISSIONS]);

  useEffect(() => {
    if (!isOpen) return;
    if (String(form?.role || '') !== 'staff') return;
    if (String(form?.selectedModule || '') !== 'financeAccounts') return;

    const tabs = ACCOUNTS_TABS
      .filter((x) => x?.module && Array.isArray(MODULE_PERMISSIONS?.[x.module]));

    const found = tabs.find((x) => moduleHasAnyEnabledPermission(form?.permissions?.[x.module]));
    if (found?.id) setSelectedAccountsTab(found.id);
  }, [isOpen, form?.role, form?.selectedModule, form?.permissions, MODULE_PERMISSIONS]);

  useEffect(() => {
    if (!isOpen) return;
    if (String(form?.role || '') !== 'staff') return;
    if (String(form?.selectedModule || '') !== 'financeExpenses') return;

    const tabs = EXPENSES_TABS
      .filter((x) => x?.module && Array.isArray(MODULE_PERMISSIONS?.[x.module]));

    const found = tabs.find((x) => moduleHasAnyEnabledPermission(form?.permissions?.[x.module]));
    if (found?.id) setSelectedExpensesTab(found.id);
  }, [isOpen, form?.role, form?.selectedModule, form?.permissions, MODULE_PERMISSIONS]);

  const moduleGroupOptions = useMemo(() => {
    const present = new Set(Array.isArray(MODULES) ? MODULES.map((m) => moduleGroupIdFor(m)) : []);
    return MODULE_GROUPS
      .filter((g) => present.has(g.id))
      .map((g) => {
        const label = (() => {
          if (g.id === 'finance') return t('nav.finance', { defaultValue: g.defaultLabel });
          if (g.id === 'users') return t('nav.people', { defaultValue: g.defaultLabel });
          if (g.id === 'academics') return t('nav.academics', { defaultValue: g.defaultLabel });
          if (g.id === 'exams') return t('nav.exams', { defaultValue: g.defaultLabel });
          if (g.id === 'operations') return t('nav.operations', { defaultValue: g.defaultLabel });
          if (g.id === 'announcements') return t('nav.announcements', { defaultValue: g.defaultLabel });
          if (g.id === 'security') return t('users.staff.units.security', { defaultValue: g.defaultLabel });
          return g.defaultLabel;
        })();
        return { value: g.id, label };
      });
  }, [MODULES, t]);

  const moduleOptionsForGroup = useMemo(() => {
    const groupId = String(selectedGroup || '');
    if (!groupId) return [];

    const groupMeta = MODULE_GROUPS.find((g) => g.id === groupId) || MODULE_GROUPS.find((g) => g.id === 'other');
    const order = Array.isArray(groupMeta?.order) ? groupMeta.order : [];
    const orderIndex = new Map(order.map((m, idx) => [String(m), idx]));

    const allGroupMods = (Array.isArray(MODULES) ? MODULES : [])
      .filter((m) => moduleGroupIdFor(m) === groupId);

    // Finance embedded modules are shown inside their relevant Finance primary module
    // sections (not as standalone dropdown modules).
    const financeAllowed = new Set([
      ...FINANCE_PRIMARY_MODULES.map(String),
    ]);

    const mods = (groupId === 'finance'
      ? allGroupMods.filter((m) => financeAllowed.has(String(m)))
      : allGroupMods
    )
      .slice()
      .sort((a, b) => {
        const ai = orderIndex.has(String(a)) ? orderIndex.get(String(a)) : 999;
        const bi = orderIndex.has(String(b)) ? orderIndex.get(String(b)) : 999;
        if (ai !== bi) return ai - bi;
        return moduleLabel(a).localeCompare(moduleLabel(b));
      });

    return mods.map((mod) => ({ value: mod, label: moduleLabel(mod) }));
  }, [MODULES, selectedGroup, moduleLabel]);

  const renderFinanceExtraSections = (primaryModule) => {
    const primary = String(primaryModule || '');
    if (!primary || moduleGroupIdFor(primary) !== 'finance') return null;

    const sections = Array.isArray(FINANCE_EXTRA_SECTIONS_BY_PRIMARY?.[primary])
      ? FINANCE_EXTRA_SECTIONS_BY_PRIMARY[primary]
      : [];
    if (!sections.length) return null;

    return (
      <div className="mt-4 space-y-4">
        {sections
          .filter((s) => s?.module && Array.isArray(MODULE_PERMISSIONS?.[s.module]))
          .map((s) => {
            const title = s.titleKey
              ? t(s.titleKey, { defaultValue: s.defaultTitle })
              : (s.defaultTitle || moduleLabel(s.module));
            const perms = MODULE_PERMISSIONS?.[s.module] || [];

            return (
              <div key={`${primary}:${s.key || s.module}`} className="rounded border bg-(--nb-color-bg-card) p-3">
                <div className="font-semibold text-sm text-(--nb-color-fg)">{title}</div>
                <div className="mt-2 flex flex-wrap gap-3">
                  {perms.map((perm) => (
                    <label
                      key={`${s.module}:${perm}`}
                      className={permChipClassName(!!form.permissions?.[s.module]?.[perm])}
                    >
                      <Checkbox
                        checked={!!form.permissions?.[s.module]?.[perm]}
                        onChange={() => togglePermissionSmart(s.module, perm)}
                        disabled={isFormLoading || isSaving}
                      />
                      {permissionLabel(s.module, perm)}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    );
  };

  const getPermissionChecked = (moduleName, perm) => {
    return Boolean(form?.permissions?.[String(moduleName || '')]?.[String(perm || '')]);
  };

  const computeFinancePrintDesired = (override = null) => {
    const financePrintFull = Boolean(form?.permissions?.financePrint?.full);
    if (financePrintFull) return true;

    return FINANCE_PRINT_SOURCES.some((m) => {
      const mod = String(m);
      let v = getPermissionChecked(mod, 'print');
      if (override && override.module === mod && override.perm === 'print') v = Boolean(override.next);
      if (override && override.module === mod && override.perm === 'full') v = Boolean(override.next);
      return v;
    });
  };

  const togglePermissionSmart = (moduleName, perm) => {
    const mod = String(moduleName || '');
    const p = String(perm || '');

    const current = Boolean(form?.permissions?.[mod]?.[p]);

    // Default behavior.
    togglePermission(mod, p);

    // UX safety: if enabling a non-view action, also enable view.
    // This keeps tab data-load endpoints consistent with "I can add/edit".
    if (p !== 'view' && p !== 'full' && current === false) {
      const viewEnabled = Boolean(form?.permissions?.[mod]?.view);
      if (!viewEnabled) {
        togglePermission(mod, 'view');
      }
    }

    // Finance UX: keep global financePrint.print consistent with any tab's print.
    if (!FINANCE_PRINT_SOURCES.includes(mod)) return;
    if (!(p === 'print' || p === 'full')) return;

    const currentFinancePrint = Boolean(form?.permissions?.financePrint?.print);

    // Predict next print state for the toggled module.
    const currentModuleFull = Boolean(form?.permissions?.[mod]?.full);
    const currentModulePrint = Boolean(form?.permissions?.[mod]?.print);
    const nextPrint = (p === 'print') ? !currentModulePrint : !currentModuleFull;

    const desired = computeFinancePrintDesired({ module: mod, perm: p, next: nextPrint });
    if (desired !== currentFinancePrint) {
      togglePermission('financePrint', 'print');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      panelClassName="max-w-none w-[96vw]"
      headerClassName="bg-linear-to-r from-(--nb-color-brand) to-(--nb-color-accent) text-white border-b border-white/10"
      titleClassName="text-white"
      closeButtonClassName="text-white/90 hover:text-white p-1 rounded-(--nb-radius-sm) hover:bg-white/10 transition-colors"
      bodyClassName="p-4"
    >
      <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
        {/*
          Prevent Chrome/password managers from autofilling this modal.
          These hidden fields act as a sink for saved credentials.
        */}
        {!editingUser && (
          <>
            <input
              type="text"
              name="fake_username"
              autoComplete="username"
              tabIndex={-1}
              className="hidden"
              aria-hidden="true"
            />
            <input
              type="password"
              name="fake_password"
              autoComplete="current-password"
              tabIndex={-1}
              className="hidden"
              aria-hidden="true"
            />
          </>
        )}

        {isFormLoading && <div className="text-sm text-(--nb-color-muted)">{t('users.form.loadingDetails')}</div>}

        <div className="space-y-3">
          {/* Personal + Contact */}
          <div className={cardBase}>
            <div className={cardHeaderBase}>
              <div className="text-sm font-semibold text-(--nb-color-fg)">
                {t('users.form.sections.personal', { defaultValue: 'Personal' })} / {t('users.form.sections.contact', { defaultValue: 'Contact' })}
              </div>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                <div className="min-w-0">
                  <Label>{t('users.form.fields.fullName')}</Label>
                  <Input
                    name="fullName"
                    value={form.fullName ?? ''}
                    onChange={(e) => setFieldValue('fullName', toTitleCaseWordsLive(e?.target?.value))}
                    onBlur={() => onBlurValidate(
                      'fullName',
                      () => (validateFourNames(form.fullName) ? '' : t('users.form.validations.fullNameFourNames', { defaultValue: 'Full name must contain at least 4 names' })),
                      { label: t('users.form.fields.fullName') }
                    )}
                    className={`mt-1 py-1.5 ${stateToClass(nameFieldState(true))}`}
                    required
                    disabled={isFormLoading || isSaving}
                  />
                </div>

                <div className="min-w-0">
                  <Label>{t('users.form.fields.username')}</Label>
                  <Input
                    name="username"
                    value={form.username ?? ''}
                    onChange={(e) => {
                      const v = String(e?.target?.value ?? '');
                      if (v) setTouched((p) => ({ ...p, username: true }));
                      handleChange(e);
                    }}
                    onBlur={() => {
                      const v = String(form?.username ?? '').trim();
                      setIsUsernameFocused(false);
                      if (!v) return;
                      setTouched((p) => ({ ...p, username: true }));
                    }}
                    className={`mt-1 py-1.5 ${stateToClass(usernameFieldState())}`}
                    required
                    disabled={isFormLoading || isSaving}
                    readOnly={!editingUser ? !!createReadOnly.username : false}
                    onFocus={() => {
                      setIsUsernameFocused(true);
                      if (!editingUser) setCreateReadOnly((r) => ({ ...r, username: false }));
                    }}
                    autoComplete="off"
                  />
                  {(() => {
                    const msg = String(usernameCheck.message || '').trim();
                    if (!msg) return null;
                    const isBad = usernameCheck.status === 'taken' || usernameCheck.status === 'invalid';
                    return (
                      <p className={`text-xs mt-1 ${isBad ? 'text-red-600' : 'text-(--nb-color-muted)'}`}>{msg}</p>
                    );
                  })()}
                </div>

                <div className="min-w-0">
                  <Label>{t('users.form.role')}</Label>
                  <div className="mt-1">
                    <DropdownSelect
                      name="role"
                      value={String(form.role || '')}
                      onChange={(v) => handleChange({ target: { name: 'role', value: v } })}
                      disabled={isFormLoading || isSaving}
                      options={[
                        { value: 'staff', label: t('users.form.staff') },
                        { value: 'admin', label: t('users.form.admin') },
                      ]}
                      clearable={false}
                      hideSelectedOption={false}
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <Label>{t('users.form.fields.salary')}</Label>
                  <Input type="number" min="0" step="0.01" name="salary" value={form.salary ?? ''} onChange={handleChange} className="mt-1 py-1.5" disabled={isFormLoading || isSaving} />
                </div>

                <div className="min-w-0">
                  <Label>{t('users.form.fields.password')}</Label>
                  <Input
                    type="password"
                    name="password"
                    value={form.password ?? ''}
                    onChange={handleChange}
                    onBlur={() => {
                      const v = String(form.password || '');
                      if (!v) return;
                      markTouched('password');
                      if (firstPasswordIssueMessage) {
                        toast.error(firstPasswordIssueMessage, { id: BLUR_VALIDATION_TOAST_ID });
                      }
                    }}
                    placeholder={editingUser ? t('users.form.newPasswordOptional') : ''}
                    className={`mt-1 py-1.5 ${stateToClass(passwordFieldState())}`}
                    disabled={isFormLoading || isSaving}
                    readOnly={!editingUser ? !!createReadOnly.password : false}
                    onFocus={() => {
                      if (!editingUser) setCreateReadOnly((r) => ({ ...r, password: false }));
                    }}
                    autoComplete={editingUser ? 'new-password' : 'new-password'}
                    required={!editingUser}
                  />
                  {passwordUi.passwordTouched && firstPasswordIssueMessage ? (
                    <p className="text-red-500 text-sm mt-1">{firstPasswordIssueMessage}</p>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <Label>{t('users.form.fields.confirmPassword')}</Label>
                  <Input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword ?? ''}
                    onChange={handleChange}
                    onBlur={() => {
                      const v = String(form.confirmPassword || '');
                      if (!v) return;
                      markTouched('confirmPassword');
                      if (passwordUi.passwordsMismatch) {
                        toast.error(t('users.form.passwordsNoMatch'), { id: BLUR_VALIDATION_TOAST_ID });
                      }
                    }}
                    className={`mt-1 py-1.5 ${stateToClass(confirmPasswordFieldState())}`}
                    disabled={isFormLoading || isSaving}
                    readOnly={!editingUser ? !!createReadOnly.confirmPassword : false}
                    onFocus={() => {
                      if (!editingUser) setCreateReadOnly((r) => ({ ...r, confirmPassword: false }));
                    }}
                    autoComplete={editingUser ? 'new-password' : 'new-password'}
                    required={!editingUser}
                  />
                  {passwordUi.confirmTouched && passwordUi.passwordsMismatch && (
                    <p className="text-red-500 text-sm mt-1">{t('users.form.passwordsNoMatch')}</p>
                  )}
                  {passwordUi.passwordsMatch && (
                    <p className="text-green-600 text-sm mt-1">{t('users.form.passwordsMatch', { defaultValue: 'Passwords match.' })}</p>
                  )}
                </div>

                <div className="min-w-0">
                  <Label>{t('users.form.fields.email')}</Label>
                  <Input
                    type="email"
                    name="email"
                    value={form.email ?? ''}
                    onChange={handleChange}
                    onBlur={() => onBlurValidate(
                      'email',
                      () => {
                        const v = String(form.email || '').trim();
                        if (!v) return '';
                        return isValidEmail(v) ? '' : t('users.form.validations.emailInvalid', { defaultValue: 'Invalid email address' });
                      },
                      { label: t('users.form.fields.email') }
                    )}
                    className={`mt-1 py-1.5 ${stateToClass(emailFieldState(false))}`}
                    disabled={isFormLoading || isSaving}
                  />
                </div>

                <div className="min-w-0">
                  <Label>{t('users.form.primaryPhone', { defaultValue: 'Primary Phone' })}</Label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    maxLength={13}
                    name="phone"
                    value={form.phone ?? ''}
                    onChange={(e) => setFieldValue('phone', sanitizeSomaliaPhoneInput(e?.target?.value))}
                    onBlur={() => {
                      const v = String(form.phone || '').trim();
                      if (!v) return;
                      markTouched('phone');
                      const err = getPhoneValidationError(v);
                      if (err) toast.error(err, { id: BLUR_VALIDATION_TOAST_ID });
                    }}
                    className={`mt-1 py-1.5 ${stateToClass(phoneFieldState('phone'))}`}
                    placeholder={t('users.form.primaryPhonePlaceholder', { defaultValue: 'e.g. +252 61XXXXXXX, 61' })}
                    disabled={isFormLoading || isSaving}
                  />
                </div>

                <div className="min-w-0">
                  <Label>{t('users.form.secondaryPhone', { defaultValue: 'Secondary Phone' })}</Label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    maxLength={13}
                    name="phone2"
                    value={form.phone2 ?? ''}
                    onChange={(e) => setFieldValue('phone2', sanitizeSomaliaPhoneInput(e?.target?.value))}
                    onBlur={() => {
                      const v = String(form.phone2 || '').trim();
                      if (!v) return;
                      markTouched('phone2');
                      const err = getPhoneValidationError(v) || t('users.form.validations.phone2Invalid', { defaultValue: 'Invalid secondary phone number' });
                      if (err) toast.error(err, { id: BLUR_VALIDATION_TOAST_ID });
                    }}
                    className={`mt-1 py-1.5 ${stateToClass(phoneFieldState('phone2'))}`}
                    placeholder={t('users.form.secondaryPhonePlaceholder', { defaultValue: 'Optional' })}
                    disabled={isFormLoading || isSaving}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Address + Photo */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {/* Address */}
            <div className={cardBase}>
              <div className={cardHeaderBase}>
                <div className="text-sm font-semibold text-(--nb-color-fg)">{t('users.form.sections.address', { defaultValue: 'Address' })}</div>
              </div>
              <div className="p-3 space-y-3">
                <div>
                  <Label className="text-xs">{t('students.address.nationality.label', { defaultValue: 'Nationality' })}</Label>
                  <div className="mt-1">
                    <DropdownSelect
                      id="user-address-nationality"
                      name="isSomali"
                      value={form.isSomali === false ? 'notSomali' : 'somali'}
                      onChange={(v) => handleChange({ target: { name: 'isSomali', value: v } })}
                      options={[
                        { value: 'somali', label: t('students.address.nationality.somali', { defaultValue: 'Somali' }) },
                        { value: 'notSomali', label: t('students.address.nationality.notSomali', { defaultValue: 'Not Somali' }) },
                      ]}
                      disabled={isFormLoading || isSaving}
                      className="py-1.5"
                    />
                  </div>
                </div>

                {form.isSomali !== false ? (
                  <SomaliaAddressFields
                    isSomali
                    regionId={form.residenceRegionId}
                    districtId={form.residenceDistrictId}
                    neighborhood={form.residenceNeighborhood}
                    onChange={(k, v) => {
                      if (k === 'regionId') handleChange({ target: { name: 'residenceRegionId', value: v } });
                      if (k === 'districtId') handleChange({ target: { name: 'residenceDistrictId', value: v } });
                      if (k === 'neighborhood') handleChange({ target: { name: 'residenceNeighborhood', value: v } });
                    }}
                    disabled={isFormLoading || isSaving}
                    required={false}
                    showNationality={false}
                    idPrefix="user-address"
                    dense
                  />
                ) : null}

                {form.isSomali === false ? (
                  <div>
                    <Label>{t('users.form.nationalityDetail', { defaultValue: 'Nationality (details)' })}</Label>
                    <Input
                      name="nationality"
                      value={form.nationality ?? ''}
                      onChange={handleChange}
                      className="mt-1 py-1.5"
                      placeholder={t('users.form.nationalityDetailPlaceholder', { defaultValue: 'Enter nationality' })}
                      required
                      disabled={isFormLoading || isSaving}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {/* Photo + Staff Meta */}
            <div className={cardBase}>
              <div className={cardHeaderBase}>
                <div className="text-sm font-semibold text-(--nb-color-fg)">{t('users.form.sections.photo', { defaultValue: 'Photo (optional)' })}</div>
              </div>
              <div className="p-3 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-24 h-24 rounded-(--nb-radius-md) border border-(--nb-color-border) bg-(--nb-color-bg) overflow-hidden shrink-0">
                    {(() => {
                      const src = localPhotoUrl || String(editingUser?.photo?.url || '').trim();
                      if (!src) return <div className="w-full h-full" />;
                      return <img src={src} alt={t('users.form.fields.photo', { defaultValue: 'Photo' })} className="w-full h-full object-cover" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="file"
                      name="photo"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleChange}
                      disabled={isFormLoading || isSaving}
                      className="block w-full text-sm text-(--nb-color-fg) file:mr-3 file:rounded-(--nb-radius-sm) file:border file:border-(--nb-color-border) file:bg-(--nb-color-bg) file:px-3 file:py-2 file:text-sm file:font-medium file:text-(--nb-color-fg)"
                    />
                    <p className="mt-1 text-xs text-(--nb-color-muted)">{t('users.form.photoHint', { defaultValue: 'JPG/PNG/WEBP, max 2MB' })}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <div>
                    <Label>{t('users.form.fields.staffCode', { defaultValue: 'Staff Code' })}</Label>
                    <Input value={String(editingUser?.staffCode || '')} readOnly disabled className="mt-1 py-1.5 opacity-90" />
                  </div>
                  <div>
                    <Label>{t('users.form.fields.unit', { defaultValue: 'Unit' })}</Label>
                    <Input value={unitLabel(editingUser?.unit || derivedMeta.unit)} readOnly disabled className="mt-1 py-1.5 opacity-90" />
                  </div>
                  <div>
                    <Label>{t('users.form.fields.jobTitle', { defaultValue: 'Job Title' })}</Label>
                    <Input value={unitLabel(editingUser?.jobTitle || derivedMeta.jobTitle)} readOnly disabled className="mt-1 py-1.5 opacity-90" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Permissions */}
          {form.role === 'staff' && (
            <div className={cardBase}>
              <div className={cardHeaderBase}>
                <div className="text-sm font-semibold text-(--nb-color-fg)">{t('users.form.sections.permissions', { defaultValue: 'Permissions' })}</div>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('users.form.selectModuleGroup', { defaultValue: 'Select Module Group' })}</Label>
                    <div className="mt-1">
                      <DropdownSelect
                        name="selectedModuleGroup"
                        value={selectedGroup}
                        onChange={(v) => {
                          const nextGroup = String(v || '');
                          setSelectedGroup(nextGroup);
                          // If the selected module doesn't belong to the new group, clear it.
                          const currentMod = String(form.selectedModule || '');
                          if (currentMod && moduleGroupIdFor(currentMod) !== nextGroup) {
                            handleChange({ target: { name: 'selectedModule', value: '' } });
                          }
                        }}
                        disabled={isFormLoading || isSaving}
                        placeholder={t('users.form.chooseModuleGroup', { defaultValue: '-- Choose Group --' })}
                        options={moduleGroupOptions}
                        menuPlacement="up"
                        clearable={false}
                        hideSelectedOption={false}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>{t('users.form.selectModule')}</Label>
                    <div className="mt-1">
                      <DropdownSelect
                        name="selectedModule"
                        value={form.selectedModule}
                        onChange={(v) => handleChange({ target: { name: 'selectedModule', value: v } })}
                        disabled={isFormLoading || isSaving || !selectedGroup}
                        placeholder={t('users.form.chooseModule')}
                        options={moduleOptionsForGroup}
                        menuPlacement="up"
                        clearable={!editingUser}
                        hideSelectedOption={false}
                      />
                    </div>
                  </div>
                </div>

                {form.selectedModule && (
                  <div className="mt-4 p-3 border border-(--nb-color-border) rounded-(--nb-radius-md) bg-(--nb-color-bg)">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold">{t('users.form.permissionsFor', { module: moduleLabel(form.selectedModule) })}</h3>
                    </div>

                {String(form.selectedModule || '') === 'financeStudent' ? (
                  <>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('users.form.studentFinanceTab', { defaultValue: 'Student Finance Tab' })}
                      </label>
                      <DropdownSelect
                        value={selectedStudentFinanceTab}
                        onChange={(v) => setSelectedStudentFinanceTab(String(v || 'receipt'))}
                        disabled={isFormLoading || isSaving}
                        placeholder={t('users.form.chooseTab', { defaultValue: '-- Choose Tab --' })}
                        options={STUDENT_FINANCE_TABS
                          .filter((x) => x?.module && Array.isArray(MODULE_PERMISSIONS?.[x.module]))
                          .map((x) => ({
                            value: x.id,
                            label: t(`finance.studentFinance.tabs.${x.id}`, { defaultValue: x.defaultLabel }),
                          }))}
                        menuPlacement="down"
                        clearable={false}
                        hideSelectedOption={false}
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {(() => {
                        const tab = STUDENT_FINANCE_TABS.find((x) => x.id === selectedStudentFinanceTab)
                          || STUDENT_FINANCE_TABS[0];
                        const activeModule = tab?.module;
                        const perms = MODULE_PERMISSIONS?.[activeModule] || [];
                        const base = perms.map((perm) => (
                          <label
                            key={`${activeModule}:${perm}`}
                            className={permChipClassName(!!form.permissions?.[activeModule]?.[perm])}
                          >
                            <Checkbox
                              checked={!!form.permissions?.[activeModule]?.[perm]}
                              onChange={() => togglePermissionSmart(activeModule, perm)}
                              disabled={isFormLoading || isSaving}
                            />
                            {permissionLabel(activeModule, perm)}
                          </label>
                        ));

                        // Modal permissions (Receipt / Previous Balance)
                        const modalModule = tab?.id === 'receipt'
                          ? 'financeStudentReceiptModal'
                          : (tab?.id === 'previousBalance' ? 'financeStudentPreviousBalanceModal' : '');
                        const modalPerms = modalModule ? (MODULE_PERMISSIONS?.[modalModule] || []) : [];
                        if (modalModule && modalPerms.length) {
                          const modalPrefix = tab?.id === 'receipt'
                            ? t('finance.studentFinance.tabs.receipt', { defaultValue: 'Receipt' })
                            : t('finance.studentFinance.tabs.previousBalance', { defaultValue: 'Previous Balance' });
                          modalPerms.forEach((perm) => {
                            base.push(
                              <label
                                key={`${modalModule}:${perm}`}
                                className={permChipClassName(!!form.permissions?.[modalModule]?.[perm])}
                              >
                                <Checkbox
                                  checked={!!form.permissions?.[modalModule]?.[perm]}
                                  onChange={() => togglePermissionSmart(modalModule, perm)}
                                  disabled={isFormLoading || isSaving}
                                />
                                {`${modalPrefix} Modal: ${permissionLabel(modalModule, perm)}`}
                              </label>
                            );
                          });
                        }

                        // Receipt tab printing is controlled by financePrint.print.
                        if (tab?.id === 'receipt') {
                          base.push(
                            <label
                              key="financePrint:print"
                              className={permChipClassName(!!form.permissions?.financePrint?.print)}
                            >
                              <Checkbox
                                checked={!!form.permissions?.financePrint?.print}
                                onChange={() => togglePermissionSmart('financePrint', 'print')}
                                disabled={isFormLoading || isSaving}
                              />
                              {permissionLabel('financePrint', 'print')}
                            </label>
                          );
                        }

                        return base;
                      })()}
                    </div>
                  </>
                ) : String(form.selectedModule || '') === 'financeAccounts' ? (
                  <>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('users.form.financeAccountsTab', { defaultValue: 'Accounts Tab' })}
                      </label>
                      <DropdownSelect
                        value={selectedAccountsTab}
                        onChange={(v) => setSelectedAccountsTab(String(v || 'institution'))}
                        disabled={isFormLoading || isSaving}
                        placeholder={t('users.form.chooseTab', { defaultValue: '-- Choose Tab --' })}
                        options={ACCOUNTS_TABS
                          .filter((x) => x?.module && Array.isArray(MODULE_PERMISSIONS?.[x.module]))
                          .map((x) => ({
                            value: x.id,
                            label: t(`finance.accounts.tabs.${x.id}`, { defaultValue: x.defaultLabel }),
                          }))}
                        menuPlacement="down"
                        clearable={false}
                        hideSelectedOption={false}
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {(() => {
                        const tab = ACCOUNTS_TABS.find((x) => x.id === selectedAccountsTab)
                          || ACCOUNTS_TABS[0];
                        const activeModule = tab?.module;
                        const perms = MODULE_PERMISSIONS?.[activeModule] || [];
                        const base = perms.map((perm) => (
                          <label
                            key={`${activeModule}:${perm}`}
                            className={permChipClassName(!!form.permissions?.[activeModule]?.[perm])}
                          >
                            <Checkbox
                              checked={!!form.permissions?.[activeModule]?.[perm]}
                              onChange={() => togglePermissionSmart(activeModule, perm)}
                              disabled={isFormLoading || isSaving}
                            />
                            {permissionLabel(activeModule, perm)}
                          </label>
                        ));

                        // Accounts ledger tab printing is controlled by financePrint.print.
                        if (tab?.id === 'ledger') {
                          base.push(
                            <label
                              key="financePrint:print"
                              className={permChipClassName(!!form.permissions?.financePrint?.print)}
                            >
                              <Checkbox
                                checked={!!form.permissions?.financePrint?.print}
                                onChange={() => togglePermissionSmart('financePrint', 'print')}
                                disabled={isFormLoading || isSaving}
                              />
                              {permissionLabel('financePrint', 'print')}
                            </label>
                          );
                        }

                        return base;
                      })()}
                    </div>
                  </>
                ) : String(form.selectedModule || '') === 'financeExpenses' ? (
                  <>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('users.form.financeExpensesTab', { defaultValue: 'Expenses Tab' })}
                      </label>
                      <DropdownSelect
                        value={selectedExpensesTab}
                        onChange={(v) => setSelectedExpensesTab(String(v || 'ledger'))}
                        disabled={isFormLoading || isSaving}
                        placeholder={t('users.form.chooseTab', { defaultValue: '-- Choose Tab --' })}
                        options={EXPENSES_TABS
                          .filter((x) => x?.module && Array.isArray(MODULE_PERMISSIONS?.[x.module]))
                          .map((x) => ({
                            value: x.id,
                            label: t(`finance.expenses.tabs.${x.id}`, { defaultValue: x.defaultLabel }),
                          }))}
                        menuPlacement="down"
                        clearable={false}
                        hideSelectedOption={false}
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {(() => {
                        const tab = EXPENSES_TABS.find((x) => x.id === selectedExpensesTab)
                          || EXPENSES_TABS[0];
                        const activeModule = tab?.module;
                        const perms = MODULE_PERMISSIONS?.[activeModule] || [];
                        const base = perms.map((perm) => (
                          <label
                            key={`${activeModule}:${perm}`}
                            className={permChipClassName(!!form.permissions?.[activeModule]?.[perm])}
                          >
                            <Checkbox
                              checked={!!form.permissions?.[activeModule]?.[perm]}
                              onChange={() => togglePermissionSmart(activeModule, perm)}
                              disabled={isFormLoading || isSaving}
                            />
                            {permissionLabel(activeModule, perm)}
                          </label>
                        ));

                        // Expense ledger printing is controlled by financePrint.print.
                        if (tab?.id === 'ledger') {
                          base.push(
                            <label
                              key="financePrint:print"
                              className={permChipClassName(!!form.permissions?.financePrint?.print)}
                            >
                              <Checkbox
                                checked={!!form.permissions?.financePrint?.print}
                                onChange={() => togglePermissionSmart('financePrint', 'print')}
                                disabled={isFormLoading || isSaving}
                              />
                              {permissionLabel('financePrint', 'print')}
                            </label>
                          );
                        }

                        return base;
                      })()}
                    </div>
                  </>
                ) : String(form.selectedModule || '') === 'financePayroll' ? (
                  <>
                    <div className="flex flex-wrap gap-3">
                      {(() => {
                        const perms = MODULE_PERMISSIONS?.financePayroll || [];
                        const base = perms.map((perm) => (
                          <label
                            key={`financePayroll:${perm}`}
                            className={permChipClassName(!!form.permissions?.financePayroll?.[perm])}
                          >
                            <Checkbox
                              checked={!!form.permissions?.financePayroll?.[perm]}
                              onChange={() => togglePermissionSmart('financePayroll', perm)}
                              disabled={isFormLoading || isSaving}
                            />
                            {permissionLabel('financePayroll', perm)}
                          </label>
                        ));

                        // Payroll printing is controlled by financePrint.print.
                        base.push(
                          <label
                            key="financePrint:print"
                            className={permChipClassName(!!form.permissions?.financePrint?.print)}
                          >
                            <Checkbox
                              checked={!!form.permissions?.financePrint?.print}
                              onChange={() => togglePermissionSmart('financePrint', 'print')}
                              disabled={isFormLoading || isSaving}
                            />
                            {permissionLabel('financePrint', 'print')}
                          </label>
                        );

                        // Payroll Employee Info modal permissions
                        const payrollInfoPerms = MODULE_PERMISSIONS?.financePayrollEmployeeInfo || [];
                        payrollInfoPerms.forEach((perm) => {
                          base.push(
                            <label
                              key={`financePayrollEmployeeInfo:${perm}`}
                              className={permChipClassName(!!form.permissions?.financePayrollEmployeeInfo?.[perm])}
                            >
                              <Checkbox
                                checked={!!form.permissions?.financePayrollEmployeeInfo?.[perm]}
                                onChange={() => togglePermissionSmart('financePayrollEmployeeInfo', perm)}
                                disabled={isFormLoading || isSaving}
                              />
                              {`Employee Info Modal: ${permissionLabel('financePayrollEmployeeInfo', perm)}`}
                            </label>
                          );
                        });

                        return base;
                      })()}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-3">
                      {MODULE_PERMISSIONS[form.selectedModule].map((perm) => (
                        <label
                          key={perm}
                          className={permChipClassName(!!form.permissions?.[form.selectedModule]?.[perm])}
                        >
                          <Checkbox
                            checked={!!form.permissions[form.selectedModule][perm]}
                            onChange={() => togglePermissionSmart(form.selectedModule, perm)}
                            disabled={isFormLoading || isSaving}
                          />
                          {permissionLabel(form.selectedModule, perm)}
                        </label>
                      ))}
                    </div>
                    {renderFinanceExtraSections(form.selectedModule)}
                  </>
                )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="neutral" onClick={onCancel} disabled={isSaving}>
            {t('common.actions.cancel')}
          </Button>

          <Button
            type="submit"
            variant="brand"
            disabled={isFormLoading || isSaving || Boolean((form.password && !passwordUi.ok) || (form.confirmPassword && passwordUi.passwordsMismatch))}
          >
            {isSaving
              ? (editingUser ? t('users.form.updating') : t('users.form.saving'))
              : (editingUser ? t('users.form.update') : t('users.form.save'))}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
