import React, { useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Modal from '../../common/Modal';
import { Eye, EyeOff } from 'lucide-react';

const DEFAULT_STUDENT_PASSWORD = '123456';

export default function ForcePasswordChangeModal({ isOpen, onSkip, onChanged }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const confirmTouched = String(confirmPassword || '').length > 0;
  const nextTouched = String(newPassword || '').length > 0;
  const passwordsMatch = nextTouched && confirmTouched && newPassword === confirmPassword;
  const passwordsMismatch = confirmTouched && newPassword !== confirmPassword;

  const canSubmit = useMemo(() => {
    const next = String(newPassword || '').trim();
    const confirm = String(confirmPassword || '').trim();
    if (next.length < 6) return false;
    if (!confirm) return false;
    if (next !== confirm) return false;
    return true;
  }, [newPassword, confirmPassword]);

  const submit = async () => {
    const next = String(newPassword || '').trim();
    const confirm = String(confirmPassword || '').trim();

    if (!next || !confirm) {
      toast.error('Please fill in both fields.');
      return;
    }
    if (next.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (next !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await axios.put(
        '/api/students/change-password',
        { oldPassword: DEFAULT_STUDENT_PASSWORD, newPassword: next },
        { withCredentials: true }
      );
      toast.success('You changed your password successfully');
      setNewPassword('');
      setConfirmPassword('');
      if (typeof onChanged === 'function') await onChanged();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={typeof onSkip === 'function' ? onSkip : undefined}
      title="Change your password"
      panelClassName="max-w-md"
      closeOnBackdrop={false}
      showCloseButton={false}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          Your account is using the default password. For security, please set a new password.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-10 ${
                  passwordsMatch ? 'border-green-500' : (passwordsMismatch ? 'border-red-500' : 'border-gray-300')
                }`}
                placeholder="Enter new password"
                autoComplete="new-password"
                disabled={saving}
              />
              <div
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer select-none"
                onMouseEnter={() => setShowNew(true)}
                onMouseLeave={() => setShowNew(false)}
                title="Show password"
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-3 py-2 bg-white border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-10 ${
                  passwordsMatch ? 'border-green-500' : (passwordsMismatch ? 'border-red-500' : 'border-gray-300')
                }`}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                disabled={saving}
              />
              <div
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer select-none"
                onMouseEnter={() => setShowConfirm(true)}
                onMouseLeave={() => setShowConfirm(false)}
                title="Show password"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          {typeof onSkip === 'function' ? (
            <button
              type="button"
              onClick={onSkip}
              className="px-3 py-2 text-sm rounded-md border bg-white hover:bg-gray-50"
              disabled={saving}
            >
              Not now
            </button>
          ) : null}

          <button
            type="button"
            onClick={submit}
            className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={saving || !canSubmit}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
