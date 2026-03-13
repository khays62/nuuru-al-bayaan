// useEntityList.js
// Hook guud oo maareeya liis xog leh: search, filters, sort, pagination, loading.
// Faa'iido: Ka saaraya logic-ka culus ee Page component-ka.
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';

export function useEntityList({
  fetchFn,            // async (params) => { data, meta }
  initialSortBy,
  initialSortDir = 'asc',
  initialLimit = 10,
  persistKey,         // furaha localStorage (tusaale 'subjects')
  extraFilters = {},  // object e.g. { grade: '' }
  debounceSearchMs = 350, // waqtiga dib u dhigidda (debounce) ee search

  // Optional: if provided, use TanStack Query instead of local request state.
  // This enables EDCI (Realtime -> Events -> invalidateQueries -> UI updated).
  queryKeyBase = null,

  // Optional: enable/disable fetching.
  enabled = true,

  // Optional: tweak query behavior.
  staleTime = 30_000,
  refetchOnWindowFocus = false,
}) {
  // --- State Initialization ---
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: initialLimit, total: 0, totalPages: 0 });
  // Waxa aan kala saarnay search-ka la qorayo iyo midka la dirayo (debounced)
  const [searchTermRaw, setSearchTermRaw] = useState('');
  const debouncedSearch = useDebounce(searchTermRaw, debounceSearchMs);
  const [immediateSearch, setImmediateSearch] = useState(null);
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

  const effectiveParams = useMemo(() => {
    return {
      page,
      limit,
      search: (immediateSearch != null ? immediateSearch : debouncedSearch) || undefined,
      sortBy,
      sortDir,
      ...Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined && v !== null)
      ),
    };
  }, [page, limit, immediateSearch, debouncedSearch, sortBy, sortDir, filters]);

  // After a resetAndReload() that sets immediateSearch, clear it once debounce catches up.
  useEffect(() => {
    if (immediateSearch == null) return;
    if (String(debouncedSearch || '') === String(immediateSearch || '')) {
      setImmediateSearch(null);
    }
  }, [debouncedSearch, immediateSearch]);

  const queryClient = useQueryClient();

  // Stable key params: keep key order deterministic.
  const stableKeyParams = useMemo(() => {
    const src = effectiveParams || {};
    const keys = Object.keys(src).sort();
    const out = {};
    for (const k of keys) {
      const v = src[k];
      if (v === undefined || v === null || v === '') continue;
      out[k] = v;
    }
    return out;
  }, [effectiveParams]);

  const rqQueryKey = useMemo(() => {
    if (!Array.isArray(queryKeyBase)) return null;
    return [...queryKeyBase, stableKeyParams];
  }, [queryKeyBase, stableKeyParams]);

  const rqQuery = useQuery({
    queryKey: rqQueryKey || ['__disabled_useEntityList__'],
    enabled: Boolean(enabled && rqQueryKey),
    queryFn: async ({ signal }) => fetchFn(effectiveParams, { signal }),
    placeholderData: (prev) => prev,
    staleTime,
    refetchOnWindowFocus,
  });

  // Keep the old behavior of clamping page when server meta indicates fewer pages.
  useEffect(() => {
    if (!rqQueryKey) return;
    const totalPages = rqQuery.data?.meta?.totalPages;
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [rqQueryKey, rqQuery.data?.meta?.totalPages, page]);

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
  const nextForceRef = useRef(false);    // haddii refresh(force) yimaado inta request socdo, halkan ku qabo
  const requestSeqRef = useRef(0);
  const activeRequestRef = useRef(0);
  const nextSilentRef = useRef(null);

  const paramsSignature = buildSignature(effectiveParams);

  const load = useCallback(async (force = false, options = {}) => {
    // When React Query mode is active, never run the legacy local loader.
    if (rqQueryKey) return;
    const { silent = false } = options || {};
    // Prevent overlapping requests (they can race and overwrite newer results).
    // Instead, coalesce: queue a follow-up load.
    if (inFlightRef.current) {
      nextSignatureRef.current = paramsSignature;
      nextForceRef.current = nextForceRef.current || force;
      nextSilentRef.current = nextSilentRef.current === null ? silent : (nextSilentRef.current && silent);
      return;
    }

    // Skip duplicate identical loads unless forced.
    if (!force && lastSignatureRef.current === paramsSignature) return;

    const reqId = (requestSeqRef.current += 1);
    activeRequestRef.current = reqId;
    inFlightRef.current = true;
    lastSignatureRef.current = paramsSignature;
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const result = await fetchRef.current(effectiveParams);

      // Only apply results from the latest started request.
      if (activeRequestRef.current !== reqId) return;

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
      if (activeRequestRef.current !== reqId) return;
      setError(e.message || 'Failed to load data');
    } finally {
      // Only the latest request controls loading state.
      if (activeRequestRef.current === reqId) {
        if (!silent) setIsLoading(false);
      }
      inFlightRef.current = false;

      const queuedSig = nextSignatureRef.current;
      const queuedForce = nextForceRef.current;
      const queuedSilent = nextSilentRef.current;
      nextSignatureRef.current = null;
      nextForceRef.current = false;
      nextSilentRef.current = null;

      // If anything was queued while we were loading, run one more load.
      if (queuedSig && (queuedSig !== lastSignatureRef.current || queuedForce)) {
        Promise.resolve().then(() => load(Boolean(queuedForce), { silent: Boolean(queuedSilent) }));
      }
    }
  }, [effectiveParams, paramsSignature, persistKey, page, rqQueryKey]);
  // Fiiro gaar ah: fetchFn lama gelin dependency sababtoo ah waxaan isticmaalnaa ref.

  // --- Load Effect ---
  useEffect(() => {
    if (rqQueryKey) return;
    load();
  }, [load, rqQueryKey]);

  // --- Public API (Legacy/local mode) ---
  const resetAndReload = async ({ filters: newFilters = {}, search = '' } = {}) => {
    if (rqQueryKey) return;
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

  // --- Return API (React Query mode vs legacy/local mode) ---
  if (rqQueryKey) {
    const result = rqQuery.data || { data: [], meta: { page: 1, limit: initialLimit, total: 0, totalPages: 0 } };
    const nextMeta = result?.meta || { page: 1, limit: initialLimit, total: 0, totalPages: 0 };

    return {
      items: Array.isArray(result?.data) ? result.data : [],
      meta: { ...nextMeta, sortBy, sortDir },
      isLoading: Boolean(rqQuery.isLoading && rqQuery.data == null),
      error: rqQuery.error ? (rqQuery.error?.message || 'Failed to load data') : null,
      searchTerm: searchTermRaw,
      setSearch: (v) => { setSearchTermRaw(v); setPage(1); },
      setFilter,
      setPage,
      setLimit: (v) => { setLimit(v); setPage(1); },
      toggleSort,
      refresh: () => rqQuery.refetch({ cancelRefetch: true }),
      silentRefresh: () => rqQuery.refetch({ cancelRefetch: true }),
      softRefresh: () => rqQuery.refetch({ cancelRefetch: true }),
      currentParams: effectiveParams,
      resetAndReload: async ({ filters: newFilters = {}, search = '' } = {}) => {
        setFilters(newFilters);
        setSearchTermRaw(search);
        setImmediateSearch(search);
        setPage(1);
        try {
          queryClient.invalidateQueries({ queryKey: queryKeyBase, refetchType: 'active' });
        } catch {
          // ignore
        }
      },
    };
  }

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
    refresh: () => load(true),
    silentRefresh: () => load(true, { silent: true }),
    softRefresh: () => load(false),
    currentParams: effectiveParams,
    resetAndReload,
  };
}
