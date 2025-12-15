import { useState, useEffect } from 'react';

export default function TeacherForm({ initialValue, onCancel, onSave }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    status: 'active',
  });

  useEffect(() => {
    if (initialValue) {
      setForm({
        fullName: initialValue.fullName || '',
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
          <input name="fullName" value={form.fullName} onChange={onChange} className="mt-1 w-full border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
        </label>
        <label className="block">
          <span className="text-sm">Email</span>
          <input type="email" name="email" value={form.email} onChange={onChange} className="mt-1 w-full border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </label>
        <label className="block">
          <span className="text-sm">Phone</span>
          <input name="phone" value={form.phone} onChange={onChange} className="mt-1 w-full border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </label>
        <label className="block">
          <span className="text-sm">Status</span>
          <select name="status" value={form.status} onChange={onChange} className="mt-1 w-full border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1 border rounded">Cancel</button>
        <button type="submit" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-blue-600 bg-blue-600 text-white shadow-sm text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700" disabled={saving}>
          {saving ? (initialValue ? 'Updating…' : 'Saving…') : (initialValue ? 'Update' : 'Save')}
        </button>
      </div>
    </form>
  );
}
