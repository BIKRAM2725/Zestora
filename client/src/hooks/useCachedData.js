// src/hooks/useCachedData.js
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tiny stale-while-revalidate cache for page data.
 * - First visit to a key: `loading` is true until the fetch finishes.
 * - Later visits: cached data shows instantly (loading = false).
 *   If it is older than `ttl`, it refreshes silently in the background.
 * - The cache lives in memory only (cleared by a full browser refresh or clearAllCache()).
 */

const store = new Map(); // key -> { data, fetchedAt }
const inflight = new Map(); // key -> Promise (dedupes simultaneous requests)

/** Mark every cached key that starts with `prefix` as stale (data stays visible, refetches next visit). */
export function invalidateCache(prefix = "") {
  store.forEach((entry, key) => {
    if (key.startsWith(prefix)) entry.fetchedAt = 0;
  });
}

/** Drop everything (call on sign out so the next login never sees the previous user's data). */
export function clearAllCache() {
  store.clear();
  inflight.clear();
}

function request(key, fetcherRef) {
  if (inflight.has(key)) return inflight.get(key);
  const p = Promise.resolve()
    .then(() => fetcherRef.current())
    .then((result) => {
      store.set(key, { data: result, fetchedAt: Date.now() });
      return result;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

export default function useCachedData(key, fetcher, { ttl = 30000, enabled = true } = {}) {
  const active = enabled && !!key;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(key);
  keyRef.current = key;

  const cachedNow = active ? store.get(key) : undefined;
  const [data, setData] = useState(cachedNow ? cachedNow.data : null);
  const dataRef = useRef(data);
  const [loading, setLoading] = useState(active && !cachedNow);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const commit = useCallback((next) => {
    dataRef.current = next;
    setData(next);
  }, []);

  useEffect(() => {
    if (!active) {
      commit(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const cached = store.get(key);
    setError(null);

    if (cached) {
      commit(cached.data);
      setLoading(false);
    } else {
      commit(null);
      setLoading(true);
    }

    // Fresh enough: no request at all
    if (cached && Date.now() - cached.fetchedAt < ttl) {
      setRefreshing(false);
      return undefined;
    }

    setRefreshing(Boolean(cached));
    request(key, fetcherRef)
      .then((result) => {
        if (cancelled) return;
        commit(result);
        setLoading(false);
        setRefreshing(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, active, ttl, commit]);

  /** Update the data locally (optimistic updates). Also updates the cache. */
  const mutate = useCallback(
    (updater) => {
      const next = typeof updater === "function" ? updater(dataRef.current) : updater;
      commit(next);
      const k = keyRef.current;
      if (k) {
        const prev = store.get(k);
        store.set(k, { data: next, fetchedAt: prev ? prev.fetchedAt : Date.now() });
      }
    },
    [commit]
  );

  /** Force a fresh fetch now (keeps current data visible meanwhile). */
  const refetch = useCallback(async () => {
    const k = keyRef.current;
    if (!k) return;
    setRefreshing(true);
    setError(null);
    try {
      const result = await request(k, fetcherRef);
      if (keyRef.current === k) commit(result);
    } catch (err) {
      setError(err);
    } finally {
      setRefreshing(false);
    }
  }, [commit]);

  return { data, loading: active && loading, refreshing, error, mutate, refetch };
}