// SearchInput.jsx
// Input raadinta guud. Waxay wacdaa onChange marka la qoro.
import React from 'react';
import Input from '../ui/Input.jsx';

export default function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative ${className} min-w-55 grow`}>
      <Input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
