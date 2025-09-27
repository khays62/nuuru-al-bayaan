// SortControls.jsx
// Badhamo kooban oo beddela field sort iyo jihada.
import React from 'react';

export default function SortControls({ currentField, currentDir, fields = [], onSort }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {fields.map(f => {
        const active = currentField === f.field;
        const arrow = active ? (currentDir === 'asc' ? '↑' : '↓') : '';
        return (
          <button
            key={f.field}
            onClick={() => onSort(f.field)}
            className={`px-2 py-1 border rounded hover:bg-gray-50 transition ${active ? 'bg-gray-100 font-medium' : ''}`}
          >
            {f.label} {arrow}
          </button>
        );
      })}
    </div>
  );
}
