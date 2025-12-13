// DataToolbar.jsx
// Isku keenista: Search + Filters + Sort + Actions (Add New). Layout guud.
import React from 'react';
import ActionButton from '../ActionButton';
import { RotateCcw } from 'lucide-react';

export default function DataToolbar({
  searchSlot,
  filtersSlot,
  sortSlot,
  actionsSlot,
  className = '',
  onReset,
  showReset = true
}) {
  const handleReset = () => {
    if (typeof onReset === 'function') {
      onReset();
      return;
    }
    // Fallback (older behavior): clear persisted sort and reload if no handler provided
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (/\.sort(By|Dir)$/.test(k)) {
          localStorage.removeItem(k);
        }
      }
    } catch { /* ignore */ }
    try { window.location.reload(); } catch { /* no-op */ }
  };
  return (
    <div className={`bg-white p-4 rounded-lg shadow ${className}`}>
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-start md:gap-4">
        <div className={`flex flex-row flex-wrap items-center gap-3 flex-1 ${searchSlot ? 'min-w-[240px]' : ''}`}>
          {searchSlot && <div className="w-full md:max-w-xs flex-grow">{searchSlot}</div>}
          {filtersSlot && <div className="flex items-center gap-2 flex-wrap flex-grow">{filtersSlot}</div>}
          {sortSlot && <div className="flex items-center gap-2">{sortSlot}</div>}
        </div>
        {(filtersSlot || searchSlot || actionsSlot) && (
          <div className="md:ml-auto md:self-start self-stretch flex flex-row flex-wrap justify-end gap-2 items-center">
            {actionsSlot}
            {showReset && (filtersSlot || searchSlot) && (
              <ActionButton
                variant="neutral"
                onClick={handleReset}
                title="Reset filters"
                icon={<RotateCcw size={16} />}
              >
                Reset
              </ActionButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
