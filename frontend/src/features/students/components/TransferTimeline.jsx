import React from 'react';
import { useI18n } from '../../../i18n/useI18n';

/*
TransferTimeline
Props:
 - logs: array of transfer logs (sorted newest first or any order)
Renders a vertical list showing chronological transfer movements.
*/

function formatSection(gs) {
  if (!gs) return '?';
  const grade = gs.grade?.gradeName || '';
  const section = gs.section || '';
  return [grade, section ? `(${section})` : ''].filter(Boolean).join(' ');
}

export const TransferTimeline = ({ logs = [] }) => {
  const { t } = useI18n();
  if (!logs.length) return <p className="text-xs text-(--nb-color-muted)">{t('students.transferTimeline.empty', { defaultValue: 'No transfers.' })}</p>;
  // Show oldest at top for natural reading
  const ordered = [...logs].sort((a,b)=> new Date(a.date) - new Date(b.date));
  return (
    <ol className="relative border-l border-(--nb-color-border) pl-4 space-y-4 text-xs">
      {ordered.map(l => {
  const isReturn = !!l.revertOf; // only the log that references a previous one is the 'return'
        const fromLabel = formatSection(l.fromGradeSection);
        const toLabel = formatSection(l.toGradeSection);
        const date = new Date(l.date);
        const ds = date.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
        return (
          <li key={l._id} className="ml-2">
            <div className="absolute -left-1.5 w-3 h-3 rounded-full border bg-(--nb-color-bg-card) border-(--nb-color-border)" />
            <p className="font-medium text-(--nb-color-text)">
              {isReturn ? t('students.transferTimeline.returned', { defaultValue: 'Returned' }) : t('students.transferTimeline.transferred', { defaultValue: 'Transferred' })}: <span className="text-(--nb-color-text)">{fromLabel} â†’ {toLabel}</span>
            </p>
            <p className="text-(--nb-color-muted)">{ds}{l.reason ? ` â€¢ ${l.reason}` : ''}</p>
          </li>
        );
      })}
    </ol>
  );
};

export default TransferTimeline;
