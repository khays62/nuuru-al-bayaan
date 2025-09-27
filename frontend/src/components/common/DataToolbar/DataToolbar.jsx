// DataToolbar.jsx
// Isku keenista: Search + Filters + Sort + Actions (Add New). Layout guud.
import React from 'react';

export default function DataToolbar({
  searchSlot,
  filtersSlot,
  sortSlot,
  actionsSlot,
  className = ''
}) {
  return (
    <div className={`bg-white p-4 rounded-lg shadow ${className}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 flex-1 min-w-[240px]">
          <div className="w-full md:max-w-xs">{searchSlot}</div>
          {filtersSlot && <div className="flex items-center gap-2 flex-wrap">{filtersSlot}</div>}
          {sortSlot && <div className="flex items-center gap-2">{sortSlot}</div>}
        </div>
        {actionsSlot && (
          <div className="md:ml-auto md:self-start self-stretch flex justify-end">
            {actionsSlot}
          </div>
        )}
      </div>
    </div>
  );
}
