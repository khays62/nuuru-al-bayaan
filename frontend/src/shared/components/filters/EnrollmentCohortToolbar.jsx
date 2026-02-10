import React, { useMemo } from 'react';
import Tabs from '../../../features/attendance/components/Tabs';
import CohortSelect from '../../../features/lookups/components/CohortSelect';
import Card from '../ui/Card.jsx';
import { useI18n } from '../../../i18n/I18nProvider';

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
    <Card className={`p-3 rounded-lg shadow-lg mt-2 ${className}`.trim()}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* spacer: keeps tabs from starting at far-left on desktop only */}
        <div className="hidden lg:block w-36 shrink-0" aria-hidden="true" />

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
            className="w-full px-3 py-2 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder={resolvedCohortPlaceholder}
            {...(cohortSelectProps || {})}
          />
        </div>
      </div>
    </Card>
  );
}
