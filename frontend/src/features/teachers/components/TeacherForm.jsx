import { useEffect, useState } from 'react';
import Button from '../../../shared/components/ui/Button.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Select from '../../../shared/components/ui/Select.jsx';

export default function TeacherForm({ initialValue, onCancel, onSave }) {
  const [form, setForm] = useState({
    fullName: '',
    teacherId: '',
    email: '',
    phone: '',
    status: 'active',
  });

  useEffect(() => {
    if (initialValue) {
      setForm({
        fullName: initialValue.fullName || '',
        teacherId: initialValue.teacherId || '',
        email: initialValue.email || '',
        phone: initialValue.phone || '',
        status: initialValue.status || 'active',
      });
    }
  }, [initialValue]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3">
        <label className="block col-span-2">
          <span className="text-sm">Full Name</span>
          <Input name="fullName" value={form.fullName} onChange={onChange} className="mt-1" required />
        </label>
        <label className="block">
          <span className="text-sm">Username (Teacher ID)</span>
          <Input
            name="teacherId"
            value={form.teacherId}
            onChange={onChange}
            className="mt-1"
            placeholder="e.g. ID01"
          />
          <div className="text-xs text-gray-500 mt-1">Teacher can login using this username or their email.</div>
        </label>
        <label className="block">
          <span className="text-sm">Email</span>
          <Input type="email" name="email" value={form.email} onChange={onChange} className="mt-1" />
        </label>
        <label className="block">
          <span className="text-sm">Phone</span>
          <Input name="phone" value={form.phone} onChange={onChange} className="mt-1" />
        </label>
        <label className="block">
          <span className="text-sm">Status</span>
          <Select name="status" value={form.status} onChange={onChange} className="mt-1">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="neutral" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="brand" disabled={saving}>
          {saving ? (initialValue ? 'Updating…' : 'Saving…') : (initialValue ? 'Update' : 'Save')}
        </Button>
      </div>
    </form>
  );
}
