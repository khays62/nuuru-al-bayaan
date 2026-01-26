import React from 'react';

import Modal from '../../../shared/components/ui/Modal.jsx';
import Button from '../../../shared/components/ui/Button.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Select from '../../../shared/components/ui/Select.jsx';

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

        {isFormLoading && <div className="col-span-full text-sm text-gray-600">Loading user details...</div>}

        {['fullName', 'username', 'email', 'phone', 'password', 'confirmPassword'].map((field) => {
          const isPassword = field.toLowerCase().includes('password');
          const isConfirm = field === 'confirmPassword';
          const passwordsMismatch = form.confirmPassword && form.password !== form.confirmPassword;

          return (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.replace(/([A-Z])/g, ' $1')}</label>

              <Input
                type={field === 'email' ? 'email' : isPassword ? 'password' : 'text'}
                name={field}
                value={form[field]}
                onChange={handleChange}
                placeholder={editingUser && field === 'password' ? 'New Password (optional)' : ''}
                disabled={isFormLoading || isSaving}
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
                  (!editingUser && ['email', 'password', 'confirmPassword'].includes(field))
                }
              />

              {isConfirm && passwordsMismatch && <p className="text-red-500 text-sm mt-1">Passwords do not match</p>}
            </div>
          );
        })}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <Select name="role" value={form.role} onChange={handleChange} disabled={isFormLoading || isSaving}>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </Select>
        </div>

        {form.role === 'staff' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Module</label>
              <Select
                name="selectedModule"
                value={form.selectedModule}
                onChange={handleChange}
                disabled={isFormLoading || isSaving}
                required={!editingUser}
              >
                <option value="">-- Choose Module --</option>
                {MODULES.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod.charAt(0).toUpperCase() + mod.slice(1)}
                  </option>
                ))}
              </Select>
            </div>

            {form.selectedModule && (
              <div className="col-span-full p-4 border rounded bg-white">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Permissions for {form.selectedModule}</h3>
                </div>

                <div className="flex flex-wrap gap-3">
                  {MODULE_PERMISSIONS[form.selectedModule].map((perm) => (
                    <label key={perm} className="flex items-center gap-2 border p-2 rounded">
                      <Checkbox
                        checked={!!form.permissions[form.selectedModule][perm]}
                        onChange={() => togglePermission(form.selectedModule, perm)}
                        disabled={isFormLoading || isSaving}
                      />
                      {perm === 'full' ? 'Full Access (Select All)' : perm}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="col-span-full flex justify-end gap-2 mt-2">
          <Button type="button" variant="neutral" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>

          <Button
            type="submit"
            variant="brand"
            disabled={isFormLoading || isSaving || (form.confirmPassword && form.password !== form.confirmPassword)}
          >
            {isSaving ? (editingUser ? 'Updating...' : 'Saving...') : editingUser ? 'Update' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
