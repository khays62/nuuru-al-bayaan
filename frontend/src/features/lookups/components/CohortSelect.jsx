// CohortSelect.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { listCohorts, getAvailableCohortsForPromotion } from '../../cohorts/api/cohorts';
import { getCachedCohorts, setCachedCohorts, getPendingCohorts, setPendingCohorts, clearPendingCohorts } from './cohortsCache';


export default function CohortSelect({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'None',
  id,
  name,
  status = 'active',
  refreshKey,
  mode,
  academicYear,
  gradeSectionId,
  gradeId,
  shiftId,
  section,
  searchable = false,
  maxVisible = 5,
  searchPlaceholder = 'Type to search…',
  ...rest
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Searchable dropdown state (only used when searchable=true)
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);

  useEffect(() => {
    if (!searchable) return;
    const onDocClick = (e) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [searchable]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        // Promotion mode: only load cohorts that have enrollments in the selected context
        if (mode === 'promotion') {
          // Require academicYear plus either gradeSectionId or (gradeId + shiftId + section)
          if (!academicYear || !(gradeSectionId || (gradeId && shiftId && section))) {
            if (!ignore) setItems([]);
            return;
          }
          const params = { academicYear };
          if (gradeSectionId) params.gradeSectionId = gradeSectionId;
          else {
            params.grade = gradeId;
            params.shift = shiftId;
            params.section = section;
          }
          const res = await getAvailableCohortsForPromotion(params);
          if (!ignore) setItems(res.data || []);
          return;
        }
        // Context mode: limit cohorts to selected Academic Year only (non-promotion editing scenarios)
        if (mode === 'context') {
          if (!academicYear) { if (!ignore) setItems([]); return; }
          const res = await listCohorts({ status, startAcademicYear: academicYear, limit: 100, sortBy: 'createdAt', sortDir: 'asc' });
          if (!ignore) setItems(res?.data || []);
          return;
        }
        // Default legacy mode: full cohort list with caching
        const key = String(status || 'active');
        if (typeof refreshKey === 'number' && refreshKey > 0) {
          const res = await listCohorts({ status, limit: 1000, sortBy: 'startAcademicYear', sortDir: 'asc' });
          const list = res?.data || [];
          setCachedCohorts(key, list);
          if (!ignore) setItems(list);
        } else {
          const cached = getCachedCohorts(key);
            if (cached && !ignore) {
              setItems(cached);
              setLoading(false);
              return;
            }
          const inflight = getPendingCohorts(key);
          if (inflight) {
            const res = await inflight;
            if (!ignore) setItems(res?.data || []);
            setLoading(false);
            return;
          }
          const p = listCohorts({ status, limit: 1000, sortBy: 'startAcademicYear', sortDir: 'asc' });
          setPendingCohorts(key, p);
          const res = await p;
          const list = res?.data || [];
          setCachedCohorts(key, list);
          if (!ignore) setItems(list);
        }
      } catch {
        if (!ignore) setItems([]);
      } finally {
        if (mode !== 'promotion') {
          const key = String(status || 'active');
          clearPendingCohorts(key);
        }
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [status, refreshKey, mode, academicYear, gradeSectionId, gradeId, shiftId, section]);

  const selectedLabel = useMemo(() => {
    const v = String(value || '');
    if (!v) return '';
    const found = (items || []).find((c) => String(c?._id) === v);
    if (!found) return '';
    const ay = found?.startAcademicYear?.yearName;
    return `${found?.name || ''}${ay ? ` — ${ay}` : ''}`.trim();
  }, [items, value]);

  const listItems = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    const q = String(query || '').trim().toLowerCase();
    const v = String(value || '');
    const limit = Math.max(1, Number(maxVisible) || 5);

    if (!q) {
      const out = [];
      for (const c of list) {
        if (v && String(c?._id) === v) continue;
        out.push(c);
        if (out.length >= limit) break;
      }
      return out;
    }

    const searched = list.filter((c) => {
      const label = `${c?.name || ''} ${c?.startAcademicYear?.yearName || ''}`.toLowerCase();
      return label.includes(q);
    });

    if (!v) return searched;
    return searched.filter((c) => String(c?._id) !== v);
  }, [items, query, maxVisible, value]);

  const onPick = (next) => {
    onChange?.(next);
    setOpen(false);
    setQuery('');
  };

  // Default: keep native <select> for backwards compatibility
  if (!searchable) {
    return (
      <select id={id} name={name} {...rest} value={value} onChange={(e)=>onChange?.(e.target.value)} disabled={disabled || loading} className={`border rounded px-2 py-1 ${className}`}>
        <option value="">{placeholder}</option>
        {items.map(c => (
          <option key={c._id} value={c._id}>
            {c.name}{c.startAcademicYear?.yearName ? ` — ${c.startAcademicYear.yearName}` : ''}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        name={name}
        disabled={disabled || loading}
        onClick={() => setOpen((v) => !v)}
        className={
          `w-full inline-flex items-center justify-between gap-2 border border-gray-300 rounded-md shadow-sm bg-white/90 px-3 py-2 text-sm ` +
          `focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 ` +
          className
        }
        {...rest}
      >
        <span className={`truncate ${selectedLabel ? 'text-gray-800' : 'text-gray-500'}`}>{selectedLabel || placeholder}</span>
        <ChevronDown size={18} className="text-gray-500" />
      </button>

      {open && !(disabled || loading) ? (
        <div className="absolute right-0 left-0 mt-2 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden z-50">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2">
                <Search size={16} className="text-gray-400" />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-auto">
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => onPick('')}
            >
              {placeholder}
            </button>

            {listItems.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No cohorts found.</div>
            ) : (
              listItems.map((c) => {
                const ay = c?.startAcademicYear?.yearName;
                const label = `${c?.name || ''}${ay ? ` — ${ay}` : ''}`.trim();
                const active = String(value || '') === String(c?._id);
                return (
                  <button
                    key={String(c?._id)}
                    type="button"
                    className={
                      `w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ` +
                      (active ? 'bg-gray-100 text-gray-900' : 'text-gray-700')
                    }
                    onClick={() => onPick(String(c?._id))}
                  >
                    {label}
                  </button>
                );
              })
            )}

            {String(query || '').trim() === '' && (items?.length || 0) > (Number(maxVisible) || 5) ? (
              <div className="px-3 py-2 text-xs text-gray-500">Type a name/year to search more…</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
