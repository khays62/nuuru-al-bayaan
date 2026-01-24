import ActionButton from '../../../shared/components/ui/ActionButton.jsx';

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
          {saving ? 'Saving…' : 'Save Attendance'}
        </ActionButton>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-700">
        <div>Summary: Present {presentCount} · Absent {absentCount} · Late {lateCount} · Excused {excusedCount}</div>
        {loaded && (
          <div className={dirty ? 'text-amber-700' : 'text-green-700'}>
            {dirty
              ? 'Not saved yet'
              : (selectionHasRecords
                  ? `Saved attendance (${selectedDate} • ${mode === 'daily' ? 'All day' : 'Per lesson'})`
                  : 'Not saved yet')}
            {!dirty && selectionHasRecords && lastSavedAt ? <span className="text-gray-500"> • {new Date(lastSavedAt).toLocaleTimeString()}</span> : null}
          </div>
        )}
      </div>
    </>
  );
}
