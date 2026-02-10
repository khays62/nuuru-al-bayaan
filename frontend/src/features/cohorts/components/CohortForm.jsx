import React, { useEffect, useState } from 'react';
import { getAcademicYears } from '../../lookups/api/lookups';
import Button from '../../../shared/components/ui/Button.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import Select from '../../../shared/components/ui/Select.jsx';
import { useI18n } from '../../../i18n/I18nProvider';

export default function CohortForm({ initial = {}, onSubmit, onCancel }) {
  const { t } = useI18n();
  const [name, setName] = useState(initial.name || '');
  const [startAY, setStartAY] = useState(() => {
    const v = initial.startAcademicYear;
    if (!v) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v._id) return v._id;
    return '';
  });
  const [status, setStatus] = useState(initial.status || 'active');
  const [ays, setAys] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const items = await getAcademicYears();
      const opts = (items || []).map((ay) => ({
        value: ay._id,
        label: ay.yearName || ay.name || t('common.filters.academicYearShort', { defaultValue: 'AY' }),
      }));
      setAys(opts);
    })();
  }, [t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !startAY) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ name, startAcademicYear: startAY, status });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">{t('cohorts.form.labels.name', { defaultValue: 'Name' })}</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder={t('cohorts.form.placeholders.name', { defaultValue: 'e.g. Dufcada 1aad' })}
          disabled={submitting}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">{t('cohorts.form.labels.startAcademicYear', { defaultValue: 'Start Academic Year' })}</label>
          <Select
            value={startAY}
            onChange={(e) => setStartAY(e.target.value)}
            required
            disabled={submitting}
          >
            <option value="" disabled>
              {t('cohorts.form.placeholders.selectAcademicYear', { defaultValue: 'Select Academic Year' })}
            </option>
            {ays.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('common.filters.status', { defaultValue: 'Status' })}</label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} disabled={submitting}>
            <option value="active">{t('common.status.active', { defaultValue: 'Active' })}</option>
            <option value="archived">{t('cohorts.status.archived', { defaultValue: 'Archived' })}</option>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="neutral" onClick={onCancel} disabled={submitting}>
          {t('common.actions.cancel', { defaultValue: 'Cancel' })}
        </Button>
        <Button type="submit" variant="brand" disabled={submitting}>
          {submitting ? t('common.saving', { defaultValue: 'Saving…' }) : t('common.actions.save', { defaultValue: 'Save' })}
        </Button>
      </div>
    </form>
  );
}
