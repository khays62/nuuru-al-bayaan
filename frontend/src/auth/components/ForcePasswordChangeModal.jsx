import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../../shared/components/ui/Modal.jsx';
import { Eye, EyeOff } from 'lucide-react';
import { fetchJson } from '../../shared/api/http';
import Input from '../../shared/components/ui/Input';
import Button from '../../shared/components/ui/Button';

export default function ForcePasswordChangeModal({
  isOpen,
  onSkip,
  onChanged,
  mode = 'user',
  title = 'Change your password',
  description,
}) {
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
      if (String(mode).toLowerCase() === 'student') {
        await fetchJson('/students/change-password', { method: 'PUT', body: JSON.stringify({ newPassword: next }) });
      } else {
        await fetchJson('/auth/change-password', { method: 'POST', body: JSON.stringify({ newPassword: next }) });
      }

      toast.success('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
      if (typeof onChanged === 'function') await onChanged();
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  const bodyText =
    description ||
    (String(mode).toLowerCase() === 'student'
      ? 'Your account is using the default password. For security, please set a new password.'
      : 'Your account must set a new password before continuing.');

  return (
    <Modal
      isOpen={isOpen}
      onClose={typeof onSkip === 'function' ? onSkip : undefined}
      title={title}
      panelClassName="max-w-md"
      closeOnBackdrop={false}
      showCloseButton={false}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-700">{bodyText}</p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
            <div className="relative">
              <Input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`pr-10 ${
                  passwordsMatch ? 'border-green-500' : (passwordsMismatch ? 'border-red-500' : 'border-slate-300')
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
              <Input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`pr-10 ${
                  passwordsMatch ? 'border-green-500' : (passwordsMismatch ? 'border-red-500' : 'border-slate-300')
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
            <Button
              type="button"
              onClick={onSkip}
              variant="neutral"
              disabled={saving}
            >
              Not now
            </Button>
          ) : null}

          <Button
            type="button"
            onClick={submit}
            variant="brand"
            disabled={saving || !canSubmit}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
