import React, { useEffect, useMemo, useState } from 'react';

import Modal from '../../../shared/components/ui/Modal.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Select from '../../../shared/components/ui/Select.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';

import { useI18n } from '../../../i18n/I18nProvider';

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
    order: ['attendance', 'attendanceReports', 'timetable'],
  },
  {
    id: 'announcements',
    defaultLabel: 'Announcements',
    order: ['announcements'],
  },
  {
    id: 'security',
    defaultLabel: 'Security',
    order: ['security'],
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
  if (m === 'security') return 'security';
  const grp = MODULE_GROUPS.find((g) => Array.isArray(g.order) && g.order.includes(m));
  return grp?.id || 'other';
}

function formatModuleLabel(mod) {
  const s = String(mod || '');
  if (!s) return '';

  if (s === 'security') return 'Bell Notification';

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

  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedStudentFinanceTab, setSelectedStudentFinanceTab] = useState('receipt');
  const [selectedAccountsTab, setSelectedAccountsTab] = useState('institution');
  const [selectedExpensesTab, setSelectedExpensesTab] = useState('ledger');

  const moduleLabel = (mod) => {
    const key = `modules.${String(mod || '')}`;
    const translated = t(key);
    if (translated && translated !== key) return translated;
    return formatModuleLabel(mod);
  };

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
  }, [isOpen, form?.role, form?.selectedModule]);

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
  }, [MODULES, selectedGroup, t]);

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
                    <label key={`${s.module}:${perm}`} className="flex items-center gap-2 border p-2 rounded bg-white">
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
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4" autoComplete="off">
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

        {isFormLoading && <div className="col-span-full text-sm text-gray-600">{t('users.form.loadingDetails')}</div>}

        {['fullName', 'username', 'email', 'phone', 'salary', 'password', 'confirmPassword'].map((field) => {
          const isPassword = field.toLowerCase().includes('password');
          const isConfirm = field === 'confirmPassword';
          const passwordsMismatch = form.confirmPassword && form.password !== form.confirmPassword;
          const isSalary = field === 'salary';

          return (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t(`users.form.fields.${field}`)}</label>

              <Input
                type={field === 'email' ? 'email' : isSalary ? 'number' : isPassword ? 'password' : 'text'}
                name={field}
                value={form[field] ?? ''}
                onChange={handleChange}
                placeholder={editingUser && field === 'password' ? t('users.form.newPasswordOptional') : ''}
                disabled={isFormLoading || isSaving}
                min={isSalary ? 0 : undefined}
                step={isSalary ? '0.01' : undefined}
                readOnly={
                  !editingUser && ['username', 'password', 'confirmPassword'].includes(field) ? !!createReadOnly[field] : false
                }
                onFocus={() => {
                  if (!editingUser && ['username', 'password', 'confirmPassword'].includes(field)) {
                    setCreateReadOnly((r) => ({ ...r, [field]: false }));
                  }
                }}
                autoComplete={
                  editingUser
                    ? field === 'password' || field === 'confirmPassword'
                      ? 'new-password'
                      : 'off'
                    : field === 'password' || field === 'confirmPassword'
                      ? 'new-password'
                      : 'off'
                }
                className={isConfirm && passwordsMismatch ? 'border-red-500 focus-visible:ring-red-500' : ''}
                required={
                  ['fullName', 'username'].includes(field) ||
                  (!editingUser && ['password', 'confirmPassword'].includes(field))
                }
              />

              {isConfirm && passwordsMismatch && <p className="text-red-500 text-sm mt-1">{t('users.form.passwordsNoMatch')}</p>}
            </div>
          );
        })}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.form.role')}</label>
          <Select name="role" value={form.role} onChange={handleChange} disabled={isFormLoading || isSaving}>
            <option value="staff">{t('users.form.staff')}</option>
            <option value="admin">{t('users.form.admin')}</option>
          </Select>
        </div>

        {form.role === 'staff' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('users.form.selectModuleGroup', { defaultValue: 'Select Module Group' })}
              </label>
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
                clearable={false}
                hideSelectedOption={false}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.form.selectModule')}</label>
              <DropdownSelect
                name="selectedModule"
                value={form.selectedModule}
                onChange={(v) => handleChange({ target: { name: 'selectedModule', value: v } })}
                disabled={isFormLoading || isSaving || !selectedGroup}
                placeholder={t('users.form.chooseModule')}
                options={moduleOptionsForGroup}
                clearable={!editingUser}
                hideSelectedOption={false}
              />
            </div>

            {form.selectedModule && (
              <div className="col-span-full p-4 border rounded bg-white">
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
                          <label key={`${activeModule}:${perm}`} className="flex items-center gap-2 border p-2 rounded">
                            <Checkbox
                              checked={!!form.permissions?.[activeModule]?.[perm]}
                              onChange={() => togglePermissionSmart(activeModule, perm)}
                              disabled={isFormLoading || isSaving}
                            />
                            {permissionLabel(activeModule, perm)}
                          </label>
                        ));

                        // Receipt tab printing is controlled by financePrint.print.
                        if (tab?.id === 'receipt') {
                          base.push(
                            <label key="financePrint:print" className="flex items-center gap-2 border p-2 rounded">
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
                          <label key={`${activeModule}:${perm}`} className="flex items-center gap-2 border p-2 rounded">
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
                            <label key="financePrint:print" className="flex items-center gap-2 border p-2 rounded">
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
                          <label key={`${activeModule}:${perm}`} className="flex items-center gap-2 border p-2 rounded">
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
                            <label key="financePrint:print" className="flex items-center gap-2 border p-2 rounded">
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
                          <label key={`financePayroll:${perm}`} className="flex items-center gap-2 border p-2 rounded">
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
                          <label key="financePrint:print" className="flex items-center gap-2 border p-2 rounded">
                            <Checkbox
                              checked={!!form.permissions?.financePrint?.print}
                              onChange={() => togglePermissionSmart('financePrint', 'print')}
                              disabled={isFormLoading || isSaving}
                            />
                            {permissionLabel('financePrint', 'print')}
                          </label>
                        );

                        return base;
                      })()}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-3">
                      {MODULE_PERMISSIONS[form.selectedModule].map((perm) => (
                        <label key={perm} className="flex items-center gap-2 border p-2 rounded">
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
          </>
        )}

        <div className="col-span-full flex justify-end gap-2 mt-2">
          <Button type="button" variant="neutral" onClick={onCancel} disabled={isSaving}>
            {t('common.actions.cancel')}
          </Button>

          <Button
            type="submit"
            variant="brand"
            disabled={isFormLoading || isSaving || (form.confirmPassword && form.password !== form.confirmPassword)}
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
