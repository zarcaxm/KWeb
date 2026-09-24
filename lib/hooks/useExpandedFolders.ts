"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "kweb:expandedFolders";

export function useExpandedFolders() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const ids = JSON.parse(raw) as string[];
        setExpanded(new Set(ids));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: Set<string>) => {
    setExpanded(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  }, []);

  const toggle = useCallback(
    (folderId: string) => {
      const next = new Set(expanded);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      persist(next);
    },
    [expanded, persist]
  );

  const expand = useCallback(
    (folderId: string) => {
      if (expanded.has(folderId)) return;
      persist(new Set([...expanded, folderId]));
    },
    [expanded, persist]
  );

  const isExpanded = useCallback(
    (folderId: string) => expanded.has(folderId),
    [expanded]
  );

  return { isExpanded, toggle, expand };
}
