import React from 'react';
import DropdownSelect from '../../../shared/components/ui/DropdownSelect.jsx';

export default function TimingSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <label className="font-medium">Timing</label>
      <div className="min-w-40">
        <DropdownSelect
          value={value}
          onChange={onChange}
          options={[
            { value: 'mid-year', label: 'Mid-Year' },
            { value: 'year-end', label: 'Year-End' },
          ]}
          placeholder="Timing"
        />
      </div>
    </div>
  );
}
