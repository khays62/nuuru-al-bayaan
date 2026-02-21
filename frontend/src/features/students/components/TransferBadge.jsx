import React from 'react';

/*
TransferBadge Component
Props:
 - log: a single transfer log object (latest relevant) OR null
 - currentSectionId: id of the section currently being viewed (to decide direction wording)
 - compact: boolean; if true render minimal chip

Logic:
 If log is null -> render nothing.
 If log.reverted === true => this log itself represents the revert action (returned to previous section)
   Show: Returned from {previous section label}
 Else if log.revertOf set (meaning this log is the revert event referencing an earlier transfer) treat as returned.
 Otherwise show: Transferred from {fromLabel}

Expect the parent to have already populated fromGradeSection & toGradeSection with nested grade/shift/academicYear.
*/

function formatSection(gs) {
  if (!gs) return '?';
  // expecting shape: { section, grade: { gradeName }, shift: { shiftName }, academicYear: { yearName } }
  const grade = gs.grade?.gradeName || '';
  const section = gs.section || '';
  const shift = gs.shift?.shiftName ? `-${gs.shift.shiftName}` : '';
  return [grade, section ? `(${section})` : '', shift].filter(Boolean).join(' ');
}

export const TransferBadge = ({ log, compact = false }) => {
  if (!log) return null;

  // Revert semantics:
  //   transferEnrollment marks BOTH logs' `reverted` true for the pair, but only the *new* log has `revertOf` populated.
  //   We want to display 'Returned' only on the new revert log (has revertOf), not on the original transfer.
  const isReturn = !!log.revertOf; // stricter condition

  const fromLabel = formatSection(log.fromGradeSection);
  const toLabel = formatSection(log.toGradeSection);

  const text = isReturn ? `Returned from ${toLabel === fromLabel ? 'previous section' : fromLabel}` : `Transferred from ${fromLabel}`;

  const base = 'inline-flex items-center rounded-full border font-medium';
  const size = compact ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-0.5';
  const color = isReturn
    ? 'bg-(--nb-color-accent-50) text-(--nb-color-fg) border-(--nb-color-border)'
    : 'bg-(--nb-color-brand-50) text-(--nb-color-fg) border-(--nb-color-border)';

  return (
    <span className={`${base} ${size} ${color}`} title={text}>
      {text}
    </span>
  );
};

export default TransferBadge;
