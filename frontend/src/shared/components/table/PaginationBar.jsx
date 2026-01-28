import React from 'react';
import PaginationControls from './PaginationControls.jsx';

export default function PaginationBar({
  meta,
  page,
  totalPages,
  limit,
  total,
  onPage,
  onLimit,
  className = '',
  limits,
  showRowsSelector,
  infoVariant,
}) {
  const p = page != null ? page : (meta && meta.page != null ? meta.page : 1);
  const tp = totalPages != null
    ? totalPages
    : (meta && (meta.totalPages != null ? meta.totalPages : (meta.pages != null ? meta.pages : 1)));
  const lim = limit != null ? limit : (meta && meta.limit != null ? meta.limit : 10);
  const tot = total != null ? total : (meta ? meta.total : undefined);

  return (
    <PaginationControls
      page={p}
      totalPages={tp}
      limit={lim}
      total={tot}
      onPage={onPage}
      onLimit={onLimit}
      className={className}
      limits={limits}
      showRowsSelector={showRowsSelector}
      infoVariant={infoVariant}
    />
  );
}
