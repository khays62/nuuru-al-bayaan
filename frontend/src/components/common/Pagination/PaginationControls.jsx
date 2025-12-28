// PaginationControls.jsx
// Maareynta bogagga: Prev/Next + tirada rows per page.
import React from 'react';

export default function PaginationControls({
  page,
  totalPages,
  limit,
  onPage,
  onLimit,
  limits = [5,10,20,50]
}) {
  return (
    <div className="flex justify-between items-center mt-4 gap-4 flex-wrap">
      <div className="space-x-2">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 text-sm"
        >Prev</button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 text-sm"
        >Next</button>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span>Rows:</span>
        <select
          value={limit}
            onChange={(e) => onLimit(parseInt(e.target.value))}
          className="border rounded px-2 py-1 text-sm"
        >
          {limits.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <span className="text-gray-600">Page {page} / {totalPages || 1}</span>
      </div>
    </div>
  );
}
