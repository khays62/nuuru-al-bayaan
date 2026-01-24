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
            className={`px-2.5 py-1.5 rounded-md border shadow-sm transition text-sm ${active ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'}`}
          >
            {f.label} {arrow}
          </button>
        );
      })}
    </div>
  );
}
