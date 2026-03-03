import React, { useMemo } from 'react';
import Tabs from '../../../features/attendance/components/Tabs';
import CohortSelect from '../../../features/lookups/components/CohortSelect';
import Card from '../ui/Card.jsx';
import { useI18n } from '../../../i18n/useI18n';

const defaultEnrollmentStatusValues = ['active', 'inactive', 'promoted', 'graduated', 'transferred', 'withdrawn', 'all'];

export default function EnrollmentCohortToolbar({
  enrollmentStatus,
  onEnrollmentStatusChange,
  enrollmentStatusOptions,
  cohortId,
  onCohortChange,
  cohortPlaceholder,
  cohortSelectProps,
  cohortSelectId = 'cohort-select',
  cohortSelectName = 'cohort-select',
  className = '',
}) {
  const { t } = useI18n();

  const defaultEnrollmentStatusOptions = useMemo(() => {
    return defaultEnrollmentStatusValues.map((v) => ({
      value: v,
      label: t(`students.enrollmentStatus.${v}`, { defaultValue: v }),
    }));
  }, [t]);

  const options = useMemo(
    () => (Array.isArray(enrollmentStatusOptions) && enrollmentStatusOptions.length > 0
      ? enrollmentStatusOptions
      : defaultEnrollmentStatusOptions),
    [enrollmentStatusOptions, defaultEnrollmentStatusOptions]
  );

  const resolvedOptions = useMemo(() => {
    return (options || []).map((o) => {
      const v = String(o?.value || '').toLowerCase();
      const allowed = ['open', 'active', 'inactive', 'promoted', 'graduated', 'transferred', 'withdrawn', 'all'];
      if (!allowed.includes(v)) return o;
      return {
        ...o,
        label: t(`students.enrollmentStatus.${v}`, { defaultValue: o?.label || v }),
      };
    });
  }, [options, t]);

  const resolvedCohortPlaceholder = cohortPlaceholder || t('students.cohortOptional', { defaultValue: 'Cohort (optional)' });

  return (
    <Card className={`p-3 mt-2 ${className}`.trim()}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Tabs: horizontally scrollable on small screens */}
        <div className="w-full lg:w-auto overflow-x-auto">
          <div className="min-w-max">
            <Tabs value={enrollmentStatus} options={resolvedOptions} onChange={onEnrollmentStatusChange} />
          </div>
        </div>

        {/* Cohort: full width on small, fixed on desktop */}
        <div className="w-full lg:ml-auto lg:max-w-[320px]">
          <CohortSelect
            id={cohortSelectId}
            name={cohortSelectName}
            value={cohortId}
            onChange={onCohortChange}
            status=""
            className="w-full px-3 py-2 bg-(--nb-color-bg-card) border border-(--nb-color-border) rounded-(--nb-radius-md) shadow-(--nb-shadow-sm) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--nb-color-brand) focus-visible:ring-offset-2 text-sm text-(--nb-color-fg)"
            placeholder={resolvedCohortPlaceholder}
            {...(cohortSelectProps || {})}
          />
        </div>
      </div>
    </Card>
  );
}
