// SearchInput.jsx
// Input raadinta guud. Waxay wacdaa onChange marka la qoro.
import React from 'react';

export default function SearchInput({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative ${className} min-w-[220px] flex-grow`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
      />
    </div>
  );
}
