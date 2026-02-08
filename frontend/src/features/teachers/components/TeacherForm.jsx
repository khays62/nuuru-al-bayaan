import { useEffect, useState } from 'react';
import Button from '../../../shared/components/ui/Button.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Select from '../../../shared/components/ui/Select.jsx';
import { useI18n } from '../../../i18n/I18nProvider';

export default function TeacherForm({ initialValue, onCancel, onSave }) {
  const { t } = useI18n();
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
          <span className="text-sm">{t('teachers.form.fullName')}</span>
          <Input name="fullName" value={form.fullName} onChange={onChange} className="mt-1" required />
        </label>
        <label className="block">
          <span className="text-sm">{t('teachers.form.teacherId')}</span>
          <Input
            name="teacherId"
            value={form.teacherId}
            onChange={onChange}
            className="mt-1"
            placeholder={t('teachers.form.teacherIdPlaceholder')}
          />
          <div className="text-xs text-gray-500 mt-1">{t('teachers.form.teacherIdHelp')}</div>
        </label>
        <label className="block">
          <span className="text-sm">{t('teachers.form.email')}</span>
          <Input type="email" name="email" value={form.email} onChange={onChange} className="mt-1" />
        </label>
        <label className="block">
          <span className="text-sm">{t('teachers.form.phone')}</span>
          <Input name="phone" value={form.phone} onChange={onChange} className="mt-1" />
        </label>
        <label className="block">
          <span className="text-sm">{t('teachers.form.status')}</span>
          <Select name="status" value={form.status} onChange={onChange} className="mt-1">
            <option value="active">{t('teachers.form.active')}</option>
            <option value="inactive">{t('teachers.form.inactive')}</option>
          </Select>
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="neutral" onClick={onCancel} disabled={saving}>{t('teachers.form.cancel')}</Button>
        <Button type="submit" variant="brand" disabled={saving}>
          {saving ? (initialValue ? t('teachers.form.updating') : t('teachers.form.saving')) : (initialValue ? t('teachers.form.update') : t('teachers.form.save'))}
        </Button>
      </div>
    </form>
  );
}
