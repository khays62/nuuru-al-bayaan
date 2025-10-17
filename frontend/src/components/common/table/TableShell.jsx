// TableShell.jsx
// Wrapper yar oo isku keena paper + table styles si ay miisasku u ekaadaan kuwo isku mid ah.
// Contract: children (thead/tbody/tfoot ee table‑ga)
import React from 'react';

export default function TableShell({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto bg-white rounded-lg shadow ${className}`}>
      <table className="w-full divide-y divide-gray-200">
        {children}
      </table>
    </div>
  );
}
