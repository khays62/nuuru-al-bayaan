// DataToolbar.jsx
// Isku keenista: Search + Filters + Sort + Actions (Add New). Layout guud.
import React from 'react';
import ActionButton from '../ui/ActionButton';
import { RotateCcw } from 'lucide-react';
import Card from '../ui/Card.jsx';
import { useI18n } from '../../../i18n/I18nProvider.jsx';

export default function DataToolbar({
  searchSlot,
  filtersSlot,
  sortSlot,
  actionsSlot,
  className = '',
  onReset,
  showReset = true
}) {
  const { t } = useI18n();

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
    <Card className={`p-4 rounded-lg ${className}`.trim()}>
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-start md:gap-4">
        <div className={`flex flex-row flex-wrap items-center gap-3 flex-1 ${searchSlot ? 'min-w-60' : ''}`}>
          {searchSlot && <div className="w-full md:max-w-xs grow">{searchSlot}</div>}
          {filtersSlot && <div className="flex items-center gap-2 flex-wrap grow">{filtersSlot}</div>}
          {sortSlot && <div className="flex items-center gap-2">{sortSlot}</div>}
        </div>
        {(filtersSlot || searchSlot || actionsSlot) && (
          <div className="md:ml-auto md:self-start self-stretch flex flex-row flex-wrap justify-end gap-2 items-center">
            {actionsSlot}
            {showReset && (filtersSlot || searchSlot) && (
              <ActionButton
                variant="neutral"
                onClick={handleReset}
                title={t('common.filters.resetTitle', { defaultValue: 'Reset filters' })}
                icon={<RotateCcw size={16} />}
              >
                {t('common.actions.reset', { defaultValue: 'Reset' })}
              </ActionButton>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
