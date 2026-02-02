import React, { useEffect, useState } from 'react';

import Button from '../../../shared/components/ui/Button.jsx';
import Input from '../../../shared/components/ui/Input.jsx';
import FormField from '../../../shared/components/ui/FormField.jsx';

export default function AcademicYearSetupForm({ initial, onCancel, onSubmit, isSubmitting }) {
  const init = initial || {};
  const [yearName, setYearName] = useState(init.yearName || '');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setYearName(init.yearName || '');
    setErrors({});
  }, [init._id]);

  const validate = () => {
    const next = {};
    if (!String(yearName || '').trim()) next.yearName = 'Academic year name is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ yearName: String(yearName).trim() });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <FormField
        label="Academic year"
        required
        hint="Example: 2025/2026 (promotion year-end may auto-create if missing)"
        error={errors.yearName}
      >
        <Input value={yearName} onChange={(e) => setYearName(e.target.value)} placeholder="2025/2026" />
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
