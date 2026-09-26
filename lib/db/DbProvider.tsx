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
import {
  getLastVault,
  isDesktopApp,
  pickDirectory,
  startVaultWatch,
  stopVaultWatch,
} from "@/lib/vault/fs";
import { openVault, reloadVaultFromDisk } from "@/lib/vault/engine";

type DbContextValue = {
  ready: boolean;
  refreshKey: number;
  refresh: () => void;
  vaultPath: string | null;
  isDesktop: boolean;
  opening: boolean;
  error: string | null;
  openOrCreateVault: () => Promise<void>;
};

const DbContext = createContext<DbContextValue | null>(null);

export function DbProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const desktop = isDesktopApp();
      if (!cancelled) setIsDesktop(desktop);
      if (!desktop) {
        if (!cancelled) setReady(true);
        return;
      }
      try {
        const last = await getLastVault();
        if (last) {
          await openVault(last);
          if (!cancelled) setVaultPath(last);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not reopen the last vault.");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isDesktop || !vaultPath) return;
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    (async () => {
      try {
        await startVaultWatch(vaultPath);
        if (cancelled) return;
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<string>("vault-external-change", async () => {
          try {
            await reloadVaultFromDisk();
            refresh();
          } catch (err) {
            console.warn("Vault reload after external change failed", err);
          }
        });
      } catch (err) {
        console.warn("Vault watch failed", err);
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
      void stopVaultWatch();
    };
  }, [isDesktop, vaultPath, refresh]);

  const openOrCreateVault = useCallback(async () => {
    setOpening(true);
    setError(null);
    try {
      const picked = await pickDirectory();
      if (!picked) return;
      await openVault(picked);
      setVaultPath(picked);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open that folder.");
    } finally {
      setOpening(false);
    }
  }, [refresh]);

  const value = useMemo(
    () => ({
      ready,
      refreshKey,
      refresh,
      vaultPath,
      isDesktop,
      opening,
      error,
      openOrCreateVault,
    }),
    [ready, refreshKey, refresh, vaultPath, isDesktop, opening, error, openOrCreateVault]
  );

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb(): DbContextValue {
  const ctx = useContext(DbContext);
  if (!ctx) throw new Error("useDb must be used within DbProvider");
  return ctx;
}
