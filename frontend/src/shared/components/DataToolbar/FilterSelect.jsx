// FilterSelect.jsx
// Select guud oo loogu talagalay filters kala duwan.
import React from 'react';

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
    <select
      value={multiple ? (Array.isArray(value) ? value : []) : (value ?? '')}
      onChange={handleChange}
      multiple={multiple}
      disabled={disabled}
      className={`px-3 py-2 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${className}`}
    >
      {!multiple && placeholder ? (<option value="">{placeholder}</option>) : null}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
