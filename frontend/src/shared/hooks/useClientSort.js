import { useCallback, useMemo, useState } from 'react';

function defaultDirForField(field) {
  return String(field) === 'createdAt' ? 'desc' : 'asc';
}

function defaultGetValue(row, field) {
  const v = row?.[field];
  if (v == null) return '';

  // Heuristic: treat *At fields as dates if parseable.
  if (String(field).endsWith('At')) {
    const t = new Date(v).getTime();
    if (Number.isFinite(t)) return t;
  }

  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return String(v).toLowerCase();
}

/**
 * Client-side sorting helper that matches the “Teachers table” UX:
 * - No refetch / no loading state on header click.
 * - Stable sorting.
 */
export function useClientSort(rows, options = {}) {
  const {
    initialSortBy = 'createdAt',
    initialSortDir = 'desc',
    getValue,
    getDefaultDir,
    onPageReset,
  } = options;

  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortDir, setSortDir] = useState(initialSortDir);

  const onSort = useCallback((field) => {
    const nextField = String(field || '');
    if (!nextField) return;

    if (typeof onPageReset === 'function') onPageReset();

    setSortBy((prev) => {
      const prevField = String(prev || '');
      if (prevField !== nextField) {
        const dir = typeof getDefaultDir === 'function'
          ? getDefaultDir(nextField)
          : defaultDirForField(nextField);
        setSortDir(dir);
        return nextField;
      }

      setSortDir((d) => (String(d).toLowerCase() === 'asc' ? 'desc' : 'asc'));
      return prev;
    });
  }, [getDefaultDir, onPageReset]);

  const sortedRows = useMemo(() => {
    const dir = String(sortDir).toLowerCase() === 'asc' ? 1 : -1;
    const arr = Array.isArray(rows) ? rows.map((r, i) => ({ r, i })) : [];

    const getVal = typeof getValue === 'function'
      ? (row) => getValue(row, sortBy)
      : (row) => defaultGetValue(row, sortBy);

    arr.sort((a, b) => {
      const av = getVal(a.r);
      const bv = getVal(b.r);

      let cmp;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));

      if (cmp === 0) return a.i - b.i;
      return dir * cmp;
    });

    return arr.map((x) => x.r);
  }, [rows, sortBy, sortDir, getValue]);

  return {
    sortBy,
    sortDir,
    setSortBy,
    setSortDir,
    onSort,
    sortedRows,
  };
}
