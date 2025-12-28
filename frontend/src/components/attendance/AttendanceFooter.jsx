import ActionButton from '../common/ActionButton';

export default function AttendanceFooter({
  canAct,
  isBusy,
  saving,
  onSave,
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
  return (
    <>
      <div className="w-full flex justify-end">
        <ActionButton
          variant="neutral"
          disabled={!canAct || isBusy || saving}
          onClick={onSave}
          className="w-full md:w-auto px-8 py-3 text-base !bg-blue-600 !text-white !border-blue-600 hover:!bg-blue-600 hover:!text-white hover:!border-blue-600 justify-center"
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
                  ? `Saved attendance (${selectedDate} • ${mode === 'daily' ? 'Whole day' : 'Per lesson'})`
                  : 'Not saved yet')}
            {!dirty && selectionHasRecords && lastSavedAt ? <span className="text-gray-500"> • {new Date(lastSavedAt).toLocaleTimeString()}</span> : null}
          </div>
        )}
      </div>
    </>
  );
}
