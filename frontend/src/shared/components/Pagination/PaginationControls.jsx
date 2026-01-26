// PaginationControls.jsx
// Maareynta bogagga: Prev/Next + tirada rows per page.
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Select from '../ui/Select.jsx';

function buildPageItems(_current, total) {
  const totalPages = Math.max(1, Number(total) || 1);

  // Per UX request: if pages are many, show: 1 2 3 4 ... (last-1) last
  if (totalPages <= 6) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  return [1, 2, 3, 4, '…', totalPages - 1, totalPages];
}

export default function PaginationControls({
  page,
  totalPages,
  limit,
  total,
  onPage,
  onLimit,
  limits = [5,10,20,50],
  className = '',
  showRowsSelector = true,
  infoVariant = 'auto' // 'auto' | 'range' | 'page'
}) {
  const p = Math.max(1, Number(page) || 1);
  const tp = Math.max(1, Number(totalPages) || 1);
  const lim = Math.max(1, Number(limit) || 10);
  const tot = total == null ? null : Math.max(0, Number(total) || 0);

  // Optimistic UI: some pages (e.g. Students) drive `page` from server meta,
  // so the active highlight can lag until fetch completes. Keep UI responsive
  // by updating the active page immediately on click, then sync back when
  // the real `page` prop updates.
  const [uiPage, setUiPage] = React.useState(p);
  React.useEffect(() => { setUiPage(p); }, [p]);

  const effectivePage = Math.min(tp, Math.max(1, Number(uiPage) || 1));
  const start = tot != null && tot > 0 ? (effectivePage - 1) * lim + 1 : null;
  const end = tot != null && tot > 0 ? Math.min(effectivePage * lim, tot) : null;
  const items = buildPageItems(effectivePage, tp);

  const hasAll = Array.isArray(limits) && limits.some((v) => String(v).toLowerCase() === 'all');
  const [allSelected, setAllSelected] = React.useState(false);

  React.useEffect(() => {
    if (!hasAll) { setAllSelected(false); return; }
    if (tot == null || tot <= 0) { setAllSelected(false); return; }
    if (lim !== tot) setAllSelected(false);
  }, [hasAll, lim, tot]);

  const selectValue = allSelected ? 'all' : String(lim);

  return (
    <div className={`flex items-center gap-3 flex-wrap mt-4 ${className}`}>
      {/* Left: segmented pagination like screenshot */}
      <div className="inline-flex items-stretch rounded-md border border-slate-300 overflow-hidden shadow-sm bg-white">
        <button
          type="button"
          disabled={effectivePage <= 1}
          onClick={() => {
            const next = effectivePage - 1;
            setUiPage(next);
            onPage(next);
          }}
          className="px-3 py-2 text-sm text-(--nb-color-brand) hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border-r border-slate-300"
          aria-label="Previous page"
          title="Previous"
        >
          <ChevronLeft size={18} />
        </button>

        {items.map((it, idx) => {
          if (it === '…') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="px-3 py-2 text-sm text-(--nb-color-brand) select-none border-r border-slate-300 flex items-center"
              >
                …
              </span>
            );
          }
          const num = Number(it);
          const active = num === effectivePage;
          return (
            <button
              key={num}
              type="button"
              onClick={() => {
                setUiPage(num);
                onPage(num);
              }}
              className={
                'min-w-9 px-3 py-2 text-sm border-r border-slate-300 ' +
                (active
                  ? 'bg-(--nb-color-brand) text-white'
                  : 'bg-white text-(--nb-color-brand) hover:bg-slate-50')
              }
              aria-current={active ? 'page' : undefined}
            >
              {num}
            </button>
          );
        })}

        <button
          type="button"
          disabled={effectivePage >= tp}
          onClick={() => {
            const next = effectivePage + 1;
            setUiPage(next);
            onPage(next);
          }}
          className="px-3 py-2 text-sm text-(--nb-color-brand) hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next page"
          title="Next"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Right: rows + info */}
      <div className="ml-auto flex items-center gap-3 text-sm text-slate-700">
        <div className="hidden sm:block text-slate-600">
          {infoVariant === 'range' ? (
            start != null && end != null ? (
              <span>Showing <span className="font-medium text-slate-800">{start}–{end}</span> of <span className="font-medium text-slate-800">{tot}</span> Rows</span>
            ) : (
              <span>Page <span className="font-medium text-slate-800">{effectivePage}</span> of <span className="font-medium text-slate-800">{tp}</span></span>
            )
          ) : infoVariant === 'page' ? (
            <span>
              Page <span className="font-medium text-slate-800">{effectivePage}</span> of <span className="font-medium text-slate-800">{tp}</span>
              {tot != null ? (
                <>
                  {' '}
                  — <span className="font-medium text-slate-800">{tot}</span> total
                </>
              ) : null}
            </span>
          ) : (
            start != null && end != null ? (
              <span>Showing <span className="font-medium text-slate-800">{start}–{end}</span> of <span className="font-medium text-slate-800">{tot}</span></span>
            ) : (
              <span>Page <span className="font-medium text-slate-800">{effectivePage}</span> of <span className="font-medium text-slate-800">{tp}</span></span>
            )
          )}
        </div>

        {showRowsSelector ? (
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Rows</span>
            <Select
              value={selectValue}
              onChange={(e) => {
                const v = e.target.value;
                if (String(v).toLowerCase() === 'all') {
                  const allLimit = tot != null && tot > 0 ? tot : 1000;
                  setAllSelected(true);
                  onLimit(allLimit);
                  return;
                }
                setAllSelected(false);
                onLimit(parseInt(v, 10));
              }}
              className="w-auto px-2 py-1.5"
            >
              {limits.map((l) => (
                <option key={String(l)} value={String(l).toLowerCase() === 'all' ? 'all' : l}>
                  {String(l).toLowerCase() === 'all' ? 'All' : l}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>
    </div>
  );
}
