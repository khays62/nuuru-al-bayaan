// FilterSelect.jsx
// Select guud oo loogu talagalay filters kala duwan.
import React from 'react';
import Select from '../ui/Select.jsx';

export default function FilterSelect({ value, onChange, options = [], placeholder = 'Select...', className = '', multiple = false, disabled = false }) {
  const handleChange = (e) => {
    if (multiple) {
      const sel = Array.from(e.target.selectedOptions).map(o => o.value);
      onChange(sel);
    } else {
      onChange(e.target.value);
    }
  };

  return (
    <Select
      value={multiple ? (Array.isArray(value) ? value : []) : (value ?? '')}
      onChange={handleChange}
      multiple={multiple}
      disabled={disabled}
      className={className}
    >
      {!multiple && placeholder ? (<option value="">{placeholder}</option>) : null}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </Select>
  );
}
