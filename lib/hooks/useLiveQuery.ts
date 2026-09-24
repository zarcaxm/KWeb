"use client";

import { useEffect, useRef, useState } from "react";
import { useDb } from "@/lib/db/DbProvider";

export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: unknown[] = []
): { data: T | undefined; loading: boolean; error: Error | null } {
  const { ready, refreshKey } = useDb();
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const depsKey = JSON.stringify(deps);
  const prevDepsKeyRef = useRef(depsKey);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const depsChanged = prevDepsKeyRef.current !== depsKey;
    prevDepsKeyRef.current = depsKey;

    if (depsChanged) {
      setData(undefined);
      setLoading(true);
      setError(null);
    } else if (data === undefined) {
      setLoading(true);
      setError(null);
    }

    loader()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, refreshKey, depsKey]);

  return { data, loading: !ready || (loading && data === undefined), error };
}
