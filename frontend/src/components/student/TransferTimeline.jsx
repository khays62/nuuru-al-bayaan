import React from 'react';

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
  if (!logs.length) return <p className="text-xs text-gray-500">No transfers.</p>;
  // Show oldest at top for natural reading
  const ordered = [...logs].sort((a,b)=> new Date(a.date) - new Date(b.date));
  return (
    <ol className="relative border-l border-gray-200 pl-4 space-y-4 text-xs">
      {ordered.map(l => {
  const isReturn = !!l.revertOf; // only the log that references a previous one is the 'return'
        const fromLabel = formatSection(l.fromGradeSection);
        const toLabel = formatSection(l.toGradeSection);
        const date = new Date(l.date);
        const ds = date.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
        return (
          <li key={l._id} className="ml-2">
            <div className="absolute -left-1.5 w-3 h-3 rounded-full border bg-white border-gray-300" />
            <p className="font-medium text-gray-700">
              {isReturn ? 'Returned' : 'Transferred'}: <span className="text-gray-900">{fromLabel} → {toLabel}</span>
            </p>
            <p className="text-gray-500">{ds}{l.reason ? ` • ${l.reason}` : ''}</p>
          </li>
        );
      })}
    </ol>
  );
};

export default TransferTimeline;
