export default function AttendanceStatusBadge({ status }) {
  const norm = String(status || '').toLowerCase();
  const cls =
    norm === 'not_marked' ? 'bg-gray-100 text-gray-700' :
    norm === 'present' ? 'bg-green-100 text-green-700' :
    norm === 'absent' ? 'bg-red-100 text-red-700' :
    norm === 'late' ? 'bg-amber-100 text-amber-800' :
    // Treat excused-like (including new statuses) as a single visual bucket.
    ['excused', 'sick', 'medical', 'family', 'other'].includes(norm) ? 'bg-slate-100 text-slate-700' :
    'bg-slate-100 text-slate-700';

  const label =
    norm === 'not_marked' ? 'Not marked' :
    (status || '—');

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}
