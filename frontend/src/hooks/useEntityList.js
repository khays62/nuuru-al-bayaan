// useEntityList.js
// Hook guud oo maareeya liis xog leh: search, filters, sort, pagination, loading.
// Faa'iido: Ka saaraya logic-ka culus ee Page component-ka.
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';

export function useEntityList({
  fetchFn,            // async (params) => { data, meta }
  initialSortBy,
  initialSortDir = 'asc',
  initialLimit = 10,
  persistKey,         // furaha localStorage (tusaale 'subjects')
  extraFilters = {},  // object e.g. { grade: '' }
  debounceSearchMs = 350 // waqtiga dib u dhigidda (debounce) ee search
}) {
  // --- State Initialization ---
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: initialLimit, total: 0, totalPages: 0 });
  // Waxa aan kala saarnay search-ka la qorayo iyo midka la dirayo (debounced)
  const [searchTermRaw, setSearchTermRaw] = useState('');
  const debouncedSearch = useDebounce(searchTermRaw, debounceSearchMs);
  const [filters, setFilters] = useState(extraFilters);
  const [sortBy, setSortBy] = useState(() => localStorage.getItem(`${persistKey}.sortBy`) || initialSortBy);
  const [sortDir, setSortDir] = useState(() => localStorage.getItem(`${persistKey}.sortDir`) || initialSortDir);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Helpers ---
  const toggleSort = (field) => {
    if (field === sortBy) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const setFilter = (name, value) => {
    setFilters(f => ({ ...f, [name]: value }));
    setPage(1); // marka filter la beddelo dib ugu noqo page 1
  };

  // ------------------------------------------------------------
  // SYNC: Haddii component-ka dibadda (page) uu beddelo extraFilters
  // (tusaale classId ama status laga doortay dropdown), halkan ayaan
  // ku milaynaa si hook-ku u sameeyo fetch cusub. Waxaan ka hortageynaa
  // loop adigoo marka hore hubinaya in qiimuhu dhab ahaantii is beddelay.
  // ------------------------------------------------------------
  const lastExternalFiltersRef = useRef(extraFilters);
  useEffect(() => {
    const changed = Object.keys(extraFilters).some(k => filters[k] !== extraFilters[k]);
    if (changed) {
      setFilters(f => ({ ...f, ...extraFilters }));
      setPage(1);
    }
    lastExternalFiltersRef.current = extraFilters;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraFilters]);

  const effectiveParams = {
    page,
    limit,
    search: debouncedSearch || undefined,
    sortBy,
    sortDir,
    ...Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    )
  };

  // Create a stable signature irrespective of object key insertion order
  function buildSignature(obj) {
    const flat = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null || v === '') continue;
      flat[k] = String(v);
    }
    const keys = Object.keys(flat).sort();
    return keys.map(k => `${k}=${flat[k]}`).join('&');
  }

  // --- Stable references & guards ---
  const fetchRef = useRef(fetchFn);
  useEffect(() => { fetchRef.current = fetchFn; }, [fetchFn]);
  const lastSignatureRef = useRef(null); // param signature request ugu dambeysay
  const inFlightRef = useRef(false);     // ka hortag overlapping requests isla signature
  const nextSignatureRef = useRef(null); // haddii param cusub yimaado inta request socdo, halkan ku qabo

  const paramsSignature = buildSignature(effectiveParams);

  const load = useCallback(async (force = false) => {
    // Haddii request hore wali socoto ama signature isku mid yahay oo aan force ahayn -> qaab cusub: queue
    if (!force) {
      if (inFlightRef.current) {
        // Ku qabo signature-gan si marka request-ka dhamaado aan u reload-gareyno
        nextSignatureRef.current = paramsSignature;
        return;
      }
      if (lastSignatureRef.current === paramsSignature) return; // duplicate identical
    }
    inFlightRef.current = true;
    lastSignatureRef.current = paramsSignature;
    setIsLoading(true);
    setError(null);
    try {
  const result = await fetchRef.current(effectiveParams);
      setItems(result.data || []);
      if (result.meta) {
        if (result.meta.totalPages > 0 && page > result.meta.totalPages) {
          // Haddii page ka baxo range-ka, dib ugu celi (tani waxay keeni kartaa rerender; guard ayaa ka hortagaya loop)
          setPage(result.meta.totalPages);
        }
        setMeta(result.meta);
      }
  // Persist current sort values without expanding deps
  localStorage.setItem(`${persistKey}.sortBy`, effectiveParams.sortBy || '');
  localStorage.setItem(`${persistKey}.sortDir`, effectiveParams.sortDir || '');
    } catch (e) {
      setError(e.message || 'Failed to load data');
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
      // Haddii inta uu socday la beddelay paramsSignature -> qasbo load cusub (coalesced)
      if (nextSignatureRef.current && nextSignatureRef.current !== lastSignatureRef.current) {
        nextSignatureRef.current = null;
        // Isticmaal microtask si state updates u dhacaan ka hor load cusub
        Promise.resolve().then(() => load(true));
      } else {
        nextSignatureRef.current = null;
      }
    }
  }, [paramsSignature, persistKey, page]);
  // Fiiro gaar ah: fetchFn lama gelin dependency sababtoo ah waxaan isticmaalnaa ref.

  // --- Load Effect ---
  useEffect(() => { load(); }, [load]);

  // --- Public API ---
  const resetAndReload = async ({ filters: newFilters = {}, search = '' } = {}) => {
    // Update internal states synchronously
    setFilters(newFilters);
    setSearchTermRaw(search);
    setPage(1);
    // Build immediate params bypassing debounced search
    const immediateParams = {
      page: 1,
      limit,
      search: search || undefined,
      sortBy,
      sortDir,
      ...Object.fromEntries(
        Object.entries(newFilters).filter(([, v]) => v !== '' && v !== undefined && v !== null)
      )
    };
    const signature = (function buildSignature(obj) {
      const flat = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v === undefined || v === null || v === '') continue;
        flat[k] = String(v);
      }
      const keys = Object.keys(flat).sort();
      return keys.map(k => `${k}=${flat[k]}`).join('&');
    })(immediateParams);
    // Perform immediate load regardless of in-flight state
    inFlightRef.current = true;
    lastSignatureRef.current = signature;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchRef.current(immediateParams);
      setItems(result.data || []);
      if (result.meta) {
        setMeta(result.meta);
      }
      localStorage.setItem(`${persistKey}.sortBy`, immediateParams.sortBy || '');
      localStorage.setItem(`${persistKey}.sortDir`, immediateParams.sortDir || '');
    } catch (e) {
      setError(e.message || 'Failed to load data');
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
      nextSignatureRef.current = null;
    }
  };
  return {
    items,
    meta: { ...meta, sortBy, sortDir },
    isLoading,
    error,
  searchTerm: searchTermRaw,
  setSearch: (v) => { setSearchTermRaw(v); setPage(1); },
    setFilter,
    setPage,
    setLimit: (v) => { setLimit(v); setPage(1); },
    toggleSort,
    // refresh hadda wuxuu ku qasbayaa force=true si CRUD ka dib xogta cusub loo keeno
    refresh: () => load(true),
    // Haddii aad rabto in aad isticmaasho behavior kii hore (no force) waxaad heli kartaa softRefresh
    softRefresh: () => load(false),
    currentParams: effectiveParams,
    resetAndReload
  };
}
