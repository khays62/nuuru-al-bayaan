// CohortSelect.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { listCohorts, getAvailableCohortsForPromotion } from '../../cohorts/api/cohorts';
import {
  clearPendingCohorts,
  getCachedCohorts,
  getPendingCohorts,
  setCachedCohorts,
  setPendingCohorts,
} from './cohortsCache';

import Select from '../../../shared/components/ui/Select.jsx';
import SearchableSelect from '../../../shared/components/ui/SearchableSelect.jsx';
import { useI18n } from '../../../i18n/useI18n';

export default function CohortSelect({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder,
  id,
  name,
  status = 'active',
  refreshKey,
  mode,
  academicYear,
  gradeSectionId,
  gradeId,
  shiftId,
  section,
  searchable = true,
  maxVisible = 5,
  searchPlaceholder,
  ...rest
}) {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const resolvedPlaceholder = placeholder ?? t('common.none', { defaultValue: 'None' });
  const resolvedSearchPlaceholder = searchPlaceholder ?? t('common.select.searchPlaceholder', { defaultValue: 'Type to search...' });
  const loadingLabel = t('common.loading', { defaultValue: 'Loading...' });

  useEffect(() => {
    let ignore = false;

    (async () => {
      setLoading(true);
      try {
        // Promotion mode: only load cohorts that have enrollments in the selected context
        if (mode === 'promotion') {
          // Require academicYear plus either gradeSectionId or (gradeId + shiftId + section)
          if (!academicYear || !(gradeSectionId || (gradeId && shiftId && section))) {
            if (!ignore) setItems([]);
            return;
          }
          const params = { academicYear };
          if (gradeSectionId) params.gradeSectionId = gradeSectionId;
          else {
            params.grade = gradeId;
            params.shift = shiftId;
            params.section = section;
          }
          const res = await getAvailableCohortsForPromotion(params);
          if (!ignore) setItems(res?.data || []);
          return;
        }

        // Context mode: limit cohorts to selected Academic Year only (non-promotion editing scenarios)
        if (mode === 'context') {
          if (!academicYear) {
            if (!ignore) setItems([]);
            return;
          }
          const res = await listCohorts({ status, startAcademicYear: academicYear, limit: 100, sortBy: 'createdAt', sortDir: 'asc' });
          if (!ignore) setItems(res?.data || []);
          return;
        }

        // Default legacy mode: full cohort list with caching
        const key = String(status || 'active');
        if (typeof refreshKey === 'number' && refreshKey > 0) {
          const res = await listCohorts({ status, limit: 1000, sortBy: 'startAcademicYear', sortDir: 'asc' });
          const list = res?.data || [];
          setCachedCohorts(key, list);
          if (!ignore) setItems(list);
          return;
        }

        const cached = getCachedCohorts(key);
        if (cached && !ignore) {
          setItems(cached);
          return;
        }

        const inflight = getPendingCohorts(key);
        if (inflight) {
          const res = await inflight;
          if (!ignore) setItems(res?.data || []);
          return;
        }

        const p = listCohorts({ status, limit: 1000, sortBy: 'startAcademicYear', sortDir: 'asc' });
        setPendingCohorts(key, p);
        const res = await p;
        const list = res?.data || [];
        setCachedCohorts(key, list);
        if (!ignore) setItems(list);
      } catch {
        if (!ignore) setItems([]);
      } finally {
        if (mode !== 'promotion') {
          const key = String(status || 'active');
          clearPendingCohorts(key);
        }
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [status, refreshKey, mode, academicYear, gradeSectionId, gradeId, shiftId, section]);

  const options = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    return list.map((c) => {
      const ay = c?.startAcademicYear?.yearName;
      const label = `${c?.name || ''}${ay ? ` - ${ay}` : ''}`.trim();
      return { value: String(c?._id || ''), label: label || t('common.filters.cohort', { defaultValue: 'Cohort' }) };
    });
  }, [items, t]);

  // Default: keep native <select> for backwards compatibility
  if (!searchable) {
    return (
      <Select
        id={id}
        name={name}
        {...rest}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled || loading}
        className={className}
      >
        <option value="">{resolvedPlaceholder}</option>
        {items.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name}{c.startAcademicYear?.yearName ? ` - ${c.startAcademicYear.yearName}` : ''}
          </option>
        ))}
      </Select>
    );
  }

  return (
    <SearchableSelect
      id={id}
      name={name}
      value={value}
      onChange={(v) => onChange?.(v)}
      disabled={disabled || loading}
      options={options}
      placeholder={loading ? loadingLabel : resolvedPlaceholder}
      maxVisible={maxVisible}
      searchPlaceholder={resolvedSearchPlaceholder}
      className={className}
      buttonProps={rest}
    />
  );
}
