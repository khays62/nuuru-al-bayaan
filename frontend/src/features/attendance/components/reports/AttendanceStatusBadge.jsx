import { useI18n } from '../../../../i18n/I18nProvider';

export default function AttendanceStatusBadge({ status }) {
  const { t } = useI18n();
  const norm = String(status || '').toLowerCase();
  const cls =
    norm === 'not_marked' ? 'bg-(--nb-color-bg) text-(--nb-color-muted)' :
    norm === 'present' ? 'bg-green-100 text-green-700' :
    norm === 'absent' ? 'bg-red-100 text-red-700' :
    norm === 'late' ? 'bg-amber-100 text-amber-800' :
    // Treat excused-like (including new statuses) as a single visual bucket.
    ['excused', 'sick', 'medical', 'family', 'other'].includes(norm) ? 'bg-(--nb-color-bg) text-(--nb-color-fg)' :
    'bg-(--nb-color-bg) text-(--nb-color-fg)';

  const translatedKey = `attendance.status.${norm}`;
  const translated = t(translatedKey);
  const label =
    norm === 'not_marked'
      ? t('attendance.status.notMarked')
      : (translated && translated !== translatedKey ? translated : (status || '—'));

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}
