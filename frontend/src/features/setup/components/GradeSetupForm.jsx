import React, { useEffect, useMemo, useState } from 'react';

import Button from '../../../shared/components/ui/Button.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import FormField from '../../../shared/components/ui/FormField.jsx';
import { useI18n } from '../../../i18n/I18nProvider';

export default function GradeSetupForm({ initial, onCancel, onSubmit, isSubmitting }) {
  const { t } = useI18n();

  const init = initial || {};
  const [gradeName, setGradeName] = useState(init.gradeName || '');
  const [order, setOrder] = useState(init.order ?? '');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setGradeName(init.gradeName || '');
    setOrder(init.order ?? '');
    setErrors({});
  }, [init._id]);

  const parsedOrder = useMemo(() => {
    if (order === '' || order === null || order === undefined) return null;
    const n = Number(order);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
  }, [order]);

  const validate = () => {
    const next = {};
    if (!String(gradeName || '').trim()) next.gradeName = t('setup.grades.form.validation.gradeNameRequired', { defaultValue: 'Grade name is required' });
    if (parsedOrder == null || !Number.isInteger(parsedOrder) || parsedOrder < 1) next.order = t('setup.grades.form.validation.orderInvalid', { defaultValue: 'Order must be an integer (1..N)' });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ gradeName: String(gradeName).trim(), order: parsedOrder });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <FormField label={t('setup.grades.form.labels.gradeName', { defaultValue: 'Grade name' })} required error={errors.gradeName}>
        <Input
          value={gradeName}
          onChange={(e) => setGradeName(e.target.value)}
          placeholder={t('setup.grades.form.placeholders.gradeName', { defaultValue: 'e.g. Level 1 / Fasalka 1' })}
        />
      </FormField>

      <FormField
        label={t('common.table.order', { defaultValue: 'Order' })}
        required
        hint={t('setup.grades.form.hints.order', { defaultValue: 'Used by Promotions (language-agnostic). Terminal grade is the highest order.' })}
        error={errors.order}
      >
        <Input
          type="number"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          placeholder={t('setup.grades.form.placeholders.order', { defaultValue: '1' })}
          min={1}
        />
      </FormField>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="neutral" onClick={onCancel} disabled={isSubmitting}>
          {t('common.actions.cancel', { defaultValue: 'Cancel' })}
        </Button>
        <Button type="submit" variant="brand" disabled={isSubmitting}>
          {isSubmitting ? t('common.saving', { defaultValue: 'Saving…' }) : t('common.actions.save', { defaultValue: 'Save' })}
        </Button>
      </div>
    </form>
  );
}
