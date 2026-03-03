import React from 'react';
import { Play, Rocket, RefreshCw, Loader2 } from 'lucide-react';
import DataToolbar from '../../../shared/components/DataToolbar/DataToolbar.jsx';
import AcademicYearSelect from '../../lookups/components/AcademicYearSelect';
import GradeSelect from '../../lookups/components/GradeSelect';
import ShiftSelect from '../../lookups/components/ShiftSelect';
import GradeSectionSelect from '../../lookups/components/GradeSectionSelect';
import CohortSelect from '../../lookups/components/CohortSelect';
import Button from '../../../shared/components/ui/Button';
import { FilterItem, FilterRow } from '../../../shared/components/DataToolbar/FilterLayout.jsx';
import TimingSelector from './TimingSelector.jsx';
import { useI18n } from '../../../i18n/useI18n';

export default function PromotionsToolbar({
  timing,
  setTiming,
  filters,
  setFilters,
  initialFilters,
  ayRefreshKey,
  filtersReady,
  canPreview,
  canPromote,
  loadingPreview,
  loadingPromote,
  onPreview,
  onPromote,
  onReset,
}) {
  const { t } = useI18n();
  return (
    <DataToolbar
      showReset={false}
      filtersSlot={(
        <FilterRow align="end">
          <FilterItem>
            <TimingSelector value={timing} onChange={setTiming} />
          </FilterItem>

          <FilterItem grow minWidthClass="min-w-30">
            <AcademicYearSelect
              value={filters.ay}
              onChange={(v) => setFilters({ ...filters, ay: v })}
              refreshKey={ayRefreshKey}
              placeholder={t('common.filters.academicYearShort', { defaultValue: 'AY' })}
              searchable
              maxVisible={5}
              searchPlaceholder={t('common.searchPlaceholders.academicYears', { defaultValue: 'Search academic yearsâ€¦' })}
            />
          </FilterItem>

          <FilterItem grow minWidthClass="min-w-30">
            <GradeSelect
              value={filters.grade}
              onChange={(v) => setFilters({ ...filters, grade: v })}
              placeholder={t('common.filters.grade', { defaultValue: 'Grade' })}
            />
          </FilterItem>

          <FilterItem grow minWidthClass="min-w-30">
            <ShiftSelect
              value={filters.shift}
              onChange={(v) => setFilters({ ...filters, shift: v })}
              placeholder={t('common.filters.shift', { defaultValue: 'Shift' })}
            />
          </FilterItem>

          <FilterItem grow minWidthClass="min-w-35">
            <GradeSectionSelect
              gradeId={filters.grade}
              shiftId={filters.shift}
              value={filters.section}
              onChange={(v) => setFilters({ ...filters, section: v })}
              placeholder={t('common.filters.section', { defaultValue: 'Section' })}
            />
          </FilterItem>

          <FilterItem grow minWidthClass="min-w-40">
            <CohortSelect
              mode="promotion"
              academicYear={filters.ay}
              gradeSectionId={filters.section}
              gradeId={filters.grade}
              shiftId={filters.shift}
              section={null}
              value={filters.cohort}
              onChange={(v) => setFilters({ ...filters, cohort: v })}
              placeholder={t('common.filters.cohort', { defaultValue: 'Cohort' })}
              searchable
              maxVisible={5}
              searchPlaceholder={t('common.searchPlaceholders.cohorts', { defaultValue: 'Search cohortsâ€¦' })}
            />
          </FilterItem>
        </FilterRow>
      )}
      actionsSlot={(
        <div className="flex gap-2">
          {canPreview && (
            <Button
              onClick={onPreview}
              disabled={!filtersReady || loadingPreview || loadingPromote}
              aria-busy={loadingPreview}
              variant="brand"
              size="lg"
              icon={loadingPreview ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
            >
              {t('common.actions.preview', { defaultValue: 'Preview' })}
            </Button>
          )}

          {canPromote && (
            <Button
              onClick={onPromote}
              disabled={!onPromote || !filtersReady || loadingPromote || loadingPreview}
              aria-busy={loadingPromote}
              variant="info"
              size="lg"
              icon={loadingPromote ? <Loader2 className="animate-spin" size={16} /> : <Rocket size={16} />}
            >
              {t('common.actions.promote', { defaultValue: 'Promote' })}
            </Button>
          )}

          <Button
            onClick={() => {
              if (typeof onReset === 'function') onReset();
              else setFilters(initialFilters);
            }}
            disabled={loadingPreview || loadingPromote}
            variant="neutral"
            size="lg"
            icon={<RefreshCw size={16} />}
          >
            {t('common.actions.reset', { defaultValue: 'Reset' })}
          </Button>
        </div>
      )}
      onReset={() => {
        if (typeof onReset === 'function') onReset();
        else setFilters(initialFilters);
      }}
    />
  );
}
