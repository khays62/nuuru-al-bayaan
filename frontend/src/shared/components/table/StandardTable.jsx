import React from 'react';
import DataTable from './DataTable.jsx';
import TableState from './TableState.jsx';
import PaginationBar from './PaginationBar.jsx';

/**
 * StandardTable
 * Shared wrapper to keep table UX consistent across features:
 * - TableState for loading/error/empty
 * - DataTable with sticky controls + column visibility + sortable headers
 * - PaginationBar (optionally with rows selector)
 */
export default function StandardTable({
  // state
  isLoading,
  error,
  items,
  isEmpty,
  loadingMessage,
  loadingVariant,
  loadingRows,
  loadingColumns,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  onRetry,

  // optional slots
  topSlot,

  // table
  rows,
  columns,
  storageKey,
  sortBy,
  sortDir,
  onSort,
  controlsProps,
  getRowKey,
  renderCell,
  tableProps,

  // pagination
  meta,
  page,
  totalPages,
  limit,
  total,
  onPage,
  onLimit,
  showRowsSelector = false,
  paginationProps,
}) {
  return (
    <TableState
      isLoading={isLoading}
      error={error}
      items={items}
      isEmpty={isEmpty}
      loadingMessage={loadingMessage}
      loadingVariant={loadingVariant}
      loadingRows={loadingRows}
      loadingColumns={loadingColumns}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyActionLabel={emptyActionLabel}
      onEmptyAction={onEmptyAction}
      onRetry={onRetry}
    >
      <>
        {topSlot ? <>{topSlot}</> : null}
        <DataTable
          rows={rows}
          columns={columns}
          storageKey={storageKey}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={onSort}
          controlsProps={controlsProps}
          getRowKey={getRowKey}
          renderCell={renderCell}
          {...(tableProps || {})}
        />

        {(meta || page != null || totalPages != null) ? (
          <PaginationBar
            meta={meta}
            page={page}
            totalPages={totalPages}
            limit={limit}
            total={total}
            onPage={onPage}
            onLimit={onLimit}
            showRowsSelector={showRowsSelector}
            {...(paginationProps || {})}
          />
        ) : null}
      </>
    </TableState>
  );
}
