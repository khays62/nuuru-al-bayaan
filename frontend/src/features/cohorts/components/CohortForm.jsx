import React, { useEffect, useState } from 'react';
import { getAcademicYears } from '../../lookups/api/lookups';
import { listCohorts } from '../api/cohorts';
import { toast } from 'react-hot-toast';
import Button from '../../../shared/components/ui/Button.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';
import { useI18n } from '../../../i18n/useI18n';

export default function CohortForm({ initial = {}, onSubmit, onCancel }) {
  const { t } = useI18n();
  const [name, setName] = useState(initial.name || '');
  const [orderNumber, setOrderNumber] = useState(initial.orderNumber || '');
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
  const [touched, setTouched] = useState({ name: false });
  const isEdit = Boolean(initial?._id);

  const statusOptions = [
    { value: 'active', label: t('common.status.active', { defaultValue: 'Active' }) },
    { value: 'archived', label: t('cohorts.status.archived', { defaultValue: 'Archived' }) },
  ];

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

  useEffect(() => {
    if (!startAY || isEdit) {
      if (!isEdit) setOrderNumber('');
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await listCohorts({ startAcademicYear: startAY, limit: 1, sortBy: 'orderNumber', sortDir: 'desc' });
      if (cancelled) return;
      const maxOrder = Number(res?.data?.[0]?.orderNumber || 0);
      const nextOrder = Number.isFinite(maxOrder) && maxOrder > 0 ? maxOrder + 1 : 1;
      setOrderNumber(String(nextOrder));
    })();

    return () => {
      cancelled = true;
    };
  }, [startAY, isEdit]);

  const sanitizeCohortName = (value) => {
    const onlyLetters = String(value || '').replace(/[^\p{L}\s]/gu, '');
    return onlyLetters.replace(/\s+/g, ' ').replace(/^\s+/, '');
  };

  const getLetterCount = (value) => (String(value || '').match(/\p{L}/gu) || []).length;
  const getNameError = (value) => {
    const letters = getLetterCount(value);
    if (letters === 0) return t('cohorts.form.validations.nameRequired', { defaultValue: 'Cohort name is required.' });
    if (letters < 2 || letters > 5) {
      return t('cohorts.form.validations.nameLength', { defaultValue: 'Cohort name must be 2-5 letters.' });
    }
    return '';
  };

  const nameError = touched.name ? getNameError(name) : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextNameError = getNameError(name);
    if (nextNameError) {
      setTouched((prev) => ({ ...prev, name: true }));
      toast.error(nextNameError);
      return;
    }
    if (!startAY) {
      toast.error(t('cohorts.form.validations.startAcademicYearRequired', { defaultValue: 'Start academic year is required.' }));
      return;
    }
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
          onChange={(e) => setName(sanitizeCohortName(e.target.value))}
          onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
          required
          placeholder={t('cohorts.form.placeholders.name', { defaultValue: 'e.g. Dufcada 1aad' })}
          disabled={submitting}
          className={nameError ? 'border-red-500' : ''}
        />
        {nameError
          ? <p className="text-xs mt-1 text-red-600">{nameError}</p>
          : <p className="text-[11px] mt-1 text-(--nb-color-muted)">{t('cohorts.form.hints.nameRules', { defaultValue: '2-5 letters only.' })}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">{t('cohorts.form.labels.startAcademicYear', { defaultValue: 'Start Academic Year' })}</label>
          <DropdownSelect
            value={startAY}
            onChange={(v) => setStartAY(v)}
            options={ays}
            placeholder={t('cohorts.form.placeholders.selectAcademicYear', { defaultValue: 'Select Academic Year' })}
            disabled={submitting}
            clearable={false}
            className="py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('cohorts.form.labels.orderNumber', { defaultValue: 'Order Number' })}</label>
          <Input
            value={orderNumber}
            readOnly
            placeholder={t('cohorts.form.placeholders.orderNumber', { defaultValue: 'Auto' })}
            disabled={submitting}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t('common.filters.status', { defaultValue: 'Status' })}</label>
          <DropdownSelect
            value={status}
            onChange={(v) => setStatus(v)}
            options={statusOptions}
            disabled={submitting}
            clearable={false}
            className="py-2"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="neutral" onClick={onCancel} disabled={submitting}>
          {t('common.actions.cancel', { defaultValue: 'Cancel' })}
        </Button>
        <Button type="submit" variant="brand" disabled={submitting}>
          {submitting ? t('common.saving', { defaultValue: 'Savingâ€¦' }) : t('common.actions.save', { defaultValue: 'Save' })}
        </Button>
      </div>
    </form>
  );
}
