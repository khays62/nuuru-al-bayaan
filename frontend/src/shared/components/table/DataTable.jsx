import React, { useEffect, useMemo, useState } from 'react';
import TableShell from './TableShell.jsx';
import SortableTh from './SortableTh.jsx';
import StickyTableControls from './StickyTableControls.jsx';

const TH_BASE = 'px-6 py-3 text-xs font-medium text-white uppercase tracking-wider border-b border-x border-white/20';
const TD_BASE = 'px-6 py-4 whitespace-nowrap text-sm text-gray-700 border-x border-gray-200';
const TR_BASE = 'border-t border-gray-200 odd:bg-white even:bg-gray-50 hover:bg-gray-50 transition-colors';

function readVisibility(storageKey) {
  if (!storageKey) return {};
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export default function DataTable({
  rows = [],
  columns = [],

  storageKey,
  initialVisible,

  showControls,
  controlsProps,

  sortBy,
  sortDir,
  onSort,

  getRowKey,
  rowClassName,

  theadClassName = 'bg-gray-800',
  headerRowClassName = '',
  baseRowClassName = TR_BASE,
  useDefaultHeaderStyles = true,

  renderCell,
}) {
  const [visible, setVisible] = useState(() => {
    const fromStorage = readVisibility(storageKey);
    const seed = (initialVisible && typeof initialVisible === 'object') ? initialVisible : {};
    return { ...seed, ...fromStorage };
  });

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(visible || {}));
    } catch {
      // ignore
    }
  }, [storageKey, visible]);

  const cols = useMemo(() => (Array.isArray(columns) ? columns : []).filter(Boolean), [columns]);
  const isVisible = (key) => visible?.[String(key)] !== false;
  const toggle = (key) => setVisible((prev) => {
    const next = { ...(prev || {}) };
    const k = String(key);
    next[k] = !(prev?.[k] !== false);
    return next;
  });

  const resolvedShowControls = showControls != null ? Boolean(showControls) : Boolean(storageKey || controlsProps);

  const visibleCols = useMemo(() => cols.filter((c) => isVisible(c.key)), [cols, visible]);

  return (
    <div>
      {resolvedShowControls ? (
        <StickyTableControls
          columns={cols}
          visible={visible}
          onToggle={toggle}
          {...(controlsProps || {})}
        />
      ) : null}

      <TableShell>
        <thead className={theadClassName}>
          <tr className={headerRowClassName}>
            {visibleCols.map((c) => {
              const align = c.align === 'right' ? 'right' : 'left';
              const noPrint = c.noPrint ? 'no-print' : '';

			  const alignClass = align === 'right' ? 'text-right ' : 'text-left ';
			  const baseThClass = useDefaultHeaderStyles
				? (`${TH_BASE} ` + alignClass)
				: alignClass;

              if (c.sortable && c.field && typeof onSort === 'function') {
                return (
                  <SortableTh
                    key={String(c.key)}
                    label={c.label}
                    field={c.field}
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onSort={onSort}
                    align={align}
					baseClassName={baseThClass}
					className={`${c.thClassName || ''} ${noPrint}`.trim()}
                  />
                );
              }
              const thClass = useDefaultHeaderStyles
                ? (`${TH_BASE} ` + alignClass + `${c.thClassName || ''} ${noPrint}`)
                : (alignClass + `${c.thClassName || ''} ${noPrint}`);

              return (
                <th
                  key={String(c.key)}
                  scope="col"
                  className={thClass}
                >
                  {c.label}
                </th>
              );
            })}
          </tr>
        </thead>

    		<tbody>
          {(rows || []).map((row, idx) => {
            const key = typeof getRowKey === 'function'
              ? getRowKey(row, idx)
              : (row?._id || row?.id || idx);

            const extraTr = typeof rowClassName === 'function' ? (rowClassName(row, idx) || '') : '';

            const base = baseRowClassName || '';

            return (
              <tr key={String(key)} className={`${base} ${extraTr}`.trim()}>
                {visibleCols.map((c) => {
                  const noPrint = c.noPrint ? 'no-print' : '';
                  const tdClass = (c.tdClassName || TD_BASE);
                  const content = typeof c.render === 'function'
                    ? c.render(row, idx)
                    : (typeof renderCell === 'function' ? renderCell(row, c, idx) : (row?.[c.key] ?? ''));

                  return (
                    <td key={String(c.key)} className={`${tdClass} ${noPrint}`.trim()}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </TableShell>
    </div>
  );
}
