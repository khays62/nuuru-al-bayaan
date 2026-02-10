import React from 'react';

import Modal from '../../../shared/components/ui/Modal.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Select from '../../../shared/components/ui/Select.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';

import { useI18n } from '../../../i18n/I18nProvider';

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
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.form.selectModule')}</label>
              <DropdownSelect
                name="selectedModule"
                value={form.selectedModule}
                onChange={(v) => handleChange({ target: { name: 'selectedModule', value: v } })}
                disabled={isFormLoading || isSaving}
                placeholder={t('users.form.chooseModule')}
                options={MODULES.map((mod) => ({ value: mod, label: moduleLabel(mod) }))}
                clearable={!editingUser}
                hideSelectedOption={false}
              />
            </div>

            {form.selectedModule && (
              <div className="col-span-full p-4 border rounded bg-white">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">{t('users.form.permissionsFor', { module: moduleLabel(form.selectedModule) })}</h3>
                </div>

                <div className="flex flex-wrap gap-3">
                  {MODULE_PERMISSIONS[form.selectedModule].map((perm) => (
                    <label key={perm} className="flex items-center gap-2 border p-2 rounded">
                      <Checkbox
                        checked={!!form.permissions[form.selectedModule][perm]}
                        onChange={() => togglePermission(form.selectedModule, perm)}
                        disabled={isFormLoading || isSaving}
                      />
                      {permissionLabel(form.selectedModule, perm)}
                    </label>
                  ))}
                </div>
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
