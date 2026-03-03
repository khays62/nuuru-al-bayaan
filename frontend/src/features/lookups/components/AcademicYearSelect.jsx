// AcademicYearSelect.jsx
// Select reusable oo soo bandhiga Academic Years.
import React, { useEffect, useState } from 'react';
import { getAcademicYears, invalidateAcademicYearsCache } from '../api/lookups';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';
import Select from '../../../shared/components/ui/Select.jsx';
import { useI18n } from '../../../i18n/useI18n';

export default function AcademicYearSelect({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder,
  id,
  name,
  refreshKey,
  searchable = true,
  maxVisible = 5,
  searchPlaceholder,
  ...rest
}) {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const resolvedPlaceholder = placeholder ?? t('common.filters.any', { defaultValue: 'Any' });
  const resolvedSearchPlaceholder = searchPlaceholder ?? t('common.select.searchPlaceholder', { defaultValue: 'Type to searchâ€¦' });

  // refreshKey: when changed by parent, re-fetch the academic years
  useEffect(() => {
    let ignore = false;

    async function fetchYears() {
      setLoading(true);
      try {
        // Ensure we don't return a stale cached list when parent requests refresh
        invalidateAcademicYearsCache();
        const ys = await getAcademicYears();
        if (!ignore) setItems(Array.isArray(ys) ? ys : (ys?.data || []));
      } catch {
        if (!ignore) setItems([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    // initial fetch
    fetchYears();

    // respond to global event when a new AcademicYear is created elsewhere in the app
    const onCreated = (e) => {
      const createdId = e?.detail?.createdAcademicYearId || e?.detail?.createdAcademicYear?._id;

      // re-run the fetch and, if the event included the new id, notify parent to select it
      (async () => {
        try {
          // ensure fresh list when event arrives
          invalidateAcademicYearsCache();
          const ys = await getAcademicYears();
          const list = Array.isArray(ys) ? ys : (ys?.data || []);
          if (!ignore) setItems(list);

          if (!ignore && createdId && typeof onChange === 'function') {
            const found = list.find(y => y._id === createdId);
            if (found) {
              // call parent's onChange so the parent-controlled `value` updates
              onChange(createdId);
            }
          }
        } catch {
          if (!ignore) setItems([]);
        }
      })();
    };

    window.addEventListener('academicYear:created', onCreated);
    return () => { ignore = true; window.removeEventListener('academicYear:created', onCreated); };
  }, [refreshKey]);

  if (searchable) {
    const options = (items || []).map((y) => ({ value: y._id, label: y.yearName }));
    return (
      <SearchableSelect
        id={id}
        name={name}
        value={value}
        onChange={(v) => onChange?.(v)}
        disabled={disabled || loading}
        options={options}
        placeholder={resolvedPlaceholder}
        maxVisible={maxVisible}
        searchPlaceholder={resolvedSearchPlaceholder}
        className={className}
        buttonProps={rest}
      />
    );
  }

  return (
    <Select
      id={id}
      name={name}
      {...rest}
      value={value}
      onChange={(e)=>onChange?.(e.target.value)}
      disabled={disabled || loading}
      className={className}
    >
      <option value="">{resolvedPlaceholder}</option>
      {items.map(y => <option key={y._id} value={y._id}>{y.yearName}</option>)}
    </Select>
  );
}
