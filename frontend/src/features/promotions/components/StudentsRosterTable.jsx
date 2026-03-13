import React, { useMemo } from 'react';
import Card from '../../../shared/components/ui/Card.jsx';
import Checkbox from '../../../shared/components/ui/Checkbox';
import Chip from '../../../shared/components/ui/Chip.jsx';
import StandardTable from '../../../shared/components/table/StandardTable.jsx';
import { useI18n } from '../../../i18n/useI18n';

export default function StudentsRosterTable({
  filtersReady,
  students,
  studentsLoading,
  studentsError,
  selectedIds,
  setSelectedIds,
  formatCurrent,
}) {
  const { t } = useI18n();
  const safeStudents = useMemo(() => (Array.isArray(students) ? students : []), [students]);

  const allSelected = useMemo(
    () => safeStudents.length > 0 && selectedIds?.size === safeStudents.length,
    [safeStudents, selectedIds]
  );

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(safeStudents.map((s) => s._id)));
  };

  const toggleSelected = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const studentsColumns = useMemo(
    () => [
      {
        key: 'select',
        label: '',
        thClassName: 'p-2 border-b border-x border-(--nb-color-border) w-10',
        tdClassName: 'p-2 border-x border-(--nb-color-border)',
      },
      {
        key: 'student',
        label: t('promotions.roster.columns.student', { defaultValue: 'Student' }),
        thClassName: 'p-2 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)',
        tdClassName: 'p-2 border-x border-(--nb-color-border) whitespace-nowrap font-medium text-(--nb-color-fg)',
      },
      {
        key: 'current',
        label: t('promotions.roster.columns.current', { defaultValue: 'Current' }),
        thClassName: 'p-2 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)',
        tdClassName: 'p-2 border-x border-(--nb-color-border) text-xs text-(--nb-color-muted)',
      },
      {
        key: 'cohort',
        label: t('common.filters.cohort', { defaultValue: 'Cohort' }),
        thClassName: 'p-2 text-left text-xs font-medium text-white uppercase tracking-wider border-b border-x border-(--nb-color-border)',
        tdClassName: 'p-2 border-x border-(--nb-color-border)',
      },
    ],
    [t]
  );

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{t('promotions.roster.title', { defaultValue: 'Students' })}</h3>
        <label className="inline-flex items-center gap-2 text-sm">
          <Checkbox
            checked={allSelected}
            onChange={toggleSelectAll}
            disabled={!filtersReady || safeStudents.length === 0}
          />
          <span>{t('common.actions.selectAll', { defaultValue: 'Select All' })}</span>
        </label>
      </div>

      <div className="max-h-130 overflow-auto">
        <StandardTable
          isLoading={studentsLoading}
          error={studentsError}
          items={safeStudents}
          isEmpty={!studentsLoading && !studentsError && (!filtersReady || safeStudents.length === 0)}
          loadingMessage={t('promotions.roster.loading', { defaultValue: 'Loading students...' })}
          loadingVariant="table"
          loadingRows={7}
          loadingColumns={4}
          emptyTitle={!filtersReady
            ? t('promotions.roster.emptyTitleNeedsFilters', { defaultValue: 'Select filters to load students' })
            : t('promotions.roster.emptyTitleNone', { defaultValue: 'No students found' })
          }
          emptyDescription={!filtersReady
            ? t('promotions.roster.emptyDescriptionNeedsFilters', { defaultValue: 'Select AY, Grade, Shift, Section and Cohort.' })
            : ''
          }
          rows={safeStudents}
          columns={studentsColumns}
          getRowKey={(s) => s._id}
          renderCell={(s, col) => {
            switch (col.key) {
              case 'select':
                return (
                  <Checkbox
                    checked={selectedIds.has(s._id)}
                    onChange={() => toggleSelected(s._id)}
                    disabled={!filtersReady}
                  />
                );
              case 'student':
                return (
                  <span className="whitespace-nowrap">
                    {s.studentId} - {s.fullName}
                  </span>
                );
              case 'current':
                return formatCurrent(s.current || {}) || '-';
              case 'cohort':
                return <Chip>{s.current?.cohort || '-'}</Chip>;
              default:
                return '';
            }
          }}
          tableProps={{
            theadClassName: 'bg-(--nb-color-brand)',
            useDefaultHeaderStyles: false,
            baseRowClassName: 'border-b border-(--nb-color-border) odd:bg-(--nb-color-bg-card) even:bg-(--nb-color-bg) hover:bg-(--nb-color-bg-card) transition-colors',
          }}
        />
      </div>
    </Card>
  );
}
