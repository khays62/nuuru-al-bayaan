import React, { useEffect, useState } from 'react';

import Button from '../../../shared/components/ui/Button.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import FormField from '../../../shared/components/ui/FormField.jsx';

export default function ShiftSetupForm({ initial, onCancel, onSubmit, isSubmitting }) {
  const init = initial || {};
  const [shiftName, setShiftName] = useState(init.shiftName || '');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setShiftName(init.shiftName || '');
    setErrors({});
  }, [init._id]);

  const validate = () => {
    const next = {};
    if (!String(shiftName || '').trim()) next.shiftName = 'Shift name is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ shiftName: String(shiftName).trim() });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <FormField label="Shift name" required error={errors.shiftName}>
        <Input value={shiftName} onChange={(e) => setShiftName(e.target.value)} placeholder="e.g. Morning / Evening" />
      </FormField>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="neutral" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="brand" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
