import ActionButton from '../../../shared/components/ui/ActionButton.jsx';
import { useI18n } from '../../../i18n/useI18n';

export default function AttendanceFooter({
  canAct,
  isBusy,
  saving,
  onSave,
  saveDisabled,
  onBlockedSave,
  loaded,
  dirty,
  selectionHasRecords,
  lastSavedAt,
  selectedDate,
  mode,
  presentCount,
  absentCount,
  lateCount,
  excusedCount,
}) {
  const { t } = useI18n();
  const baseDisabled = !canAct || isBusy || saving;
  const disabledByRule = Boolean(saveDisabled);

  const handleSaveClick = () => {
    if (baseDisabled) return;
    if (disabledByRule) {
      if (typeof onBlockedSave === 'function') onBlockedSave();
      return;
    }
    onSave?.();
  };
  return (
    <>
      <div className="w-full flex justify-end">
        <ActionButton
          variant="brand"
          disabled={baseDisabled}
          onClick={handleSaveClick}
          className={
            "w-full md:w-auto px-8 py-3 text-base justify-center " +
            (disabledByRule ? 'opacity-60 cursor-not-allowed' : '')
          }
        >
          {saving ? t('common.saving') : t('attendance.marking.actions.saveAttendance')}
        </ActionButton>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-(--nb-color-fg)">
        <div>
          {t('attendance.marking.footer.summary', {
            present: presentCount,
            absent: absentCount,
            late: lateCount,
            excused: excusedCount,
          })}
        </div>
        {loaded && (
          <div className={dirty ? 'text-amber-700' : 'text-green-700'}>
            {dirty
              ? t('attendance.marking.footer.notSavedYet')
              : (selectionHasRecords
                  ? t('attendance.marking.footer.saved', {
                    date: selectedDate,
                    mode: mode === 'daily'
                      ? t('attendance.marking.modes.allDay')
                      : t('attendance.marking.modes.perLesson'),
                  })
                  : t('attendance.marking.footer.notSavedYet'))}
            {!dirty && selectionHasRecords && lastSavedAt ? <span className="text-(--nb-color-muted)"> - {new Date(lastSavedAt).toLocaleTimeString()}</span> : null}
          </div>
        )}
      </div>
    </>
  );
}
