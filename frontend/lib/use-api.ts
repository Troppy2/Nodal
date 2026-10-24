"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

// Small stale-while-revalidate cache: revisiting a screen shows the last data instantly, then refreshes.
const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

/** Drop cached responses whose path starts with any prefix, and refetch mounted users of them. */
export function invalidate(...prefixes: string[]) {
  for (const key of [...cache.keys()]) {
    if (prefixes.some((p) => key.startsWith(p))) {
      cache.delete(key);
      notify(key);
    }
  }
}

/**
 * GET `path` (null skips the request). Returns cached data immediately when present.
 * `mutate` updates the cached value locally for optimistic UI.
 */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | undefined>(() => (path ? (cache.get(path) as T | undefined) : undefined));
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(Boolean(path) && !cache.has(path ?? ""));
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!path) return;
    const fn = () => setVersion((v) => v + 1);
    if (!listeners.has(path)) listeners.set(path, new Set());
    listeners.get(path)!.add(fn);
    return () => {
      listeners.get(path)?.delete(fn);
    };
  }, [path]);

  useEffect(() => {
    if (!path) {
      setData(undefined);
      setLoading(false);
      return;
    }
    let live = true;
    setData(cache.get(path) as T | undefined);
    setLoading(!cache.has(path));
    setError(null);
    api<T>(path)
      .then((d) => {
        if (!live) return;
        cache.set(path, d);
        setData(d);
      })
      .catch((e: Error) => live && setError(e))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [path, version]);

  const mutate = useCallback(
    (update: T | ((prev: T | undefined) => T)) => {
      setData((prev) => {
        const next = typeof update === "function" ? (update as (p: T | undefined) => T)(prev) : update;
        if (path) cache.set(path, next);
        return next;
      });
    },
    [path],
  );

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { data, error, loading, mutate, reload };
}
