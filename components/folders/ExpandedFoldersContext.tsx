"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "kweb:expandedFolders";

type ContextValue = {
  isExpanded: (folderId: string) => boolean;
  toggle: (folderId: string) => void;
  expand: (folderId: string) => void;
};

const ExpandedFoldersContext = createContext<ContextValue | null>(null);

export function ExpandedFoldersProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setExpanded(new Set(JSON.parse(raw) as string[]));
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

  const value = useMemo(
    () => ({ isExpanded, toggle, expand }),
    [isExpanded, toggle, expand]
  );

  return (
    <ExpandedFoldersContext.Provider value={value}>
      {children}
    </ExpandedFoldersContext.Provider>
  );
}

export function useExpandedFoldersContext() {
  const ctx = useContext(ExpandedFoldersContext);
  if (!ctx) {
    throw new Error("useExpandedFoldersContext requires ExpandedFoldersProvider");
  }
  return ctx;
}
