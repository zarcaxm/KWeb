"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { isDesktopApp } from "@/lib/vault/fs";

type AvailableUpdate = {
  version: string;
  downloadAndInstall: () => Promise<void>;
};

export function UpdateBanner() {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDesktopApp()) return;
    let cancelled = false;
    (async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const found = await check();
        if (!cancelled && found) {
          setUpdate({
            version: found.version,
            downloadAndInstall: () => found.downloadAndInstall(),
          });
        }
      } catch (err) {
        console.warn("Update check failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!update) return null;

  const install = async () => {
    setInstalling(true);
    setError(null);
    try {
      await update.downloadAndInstall();
      const windows = navigator.userAgent.includes("Windows");
      if (!windows) {
        const { relaunch } = await import("@tauri-apps/plugin-process");
        await relaunch();
      }
    } catch (err) {
      setInstalling(false);
      setError(err instanceof Error ? err.message : "Could not install the update.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-800">
      <p className="min-w-0 flex-1">
        Version {update.version} is ready. It replaces this app and leaves your vault folder untouched.
      </p>
      {error ? (
        <p className="text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <Button variant="primary" className="min-h-[36px]" onClick={install} disabled={installing}>
        {installing ? "Installing…" : "Update and restart"}
      </Button>
    </div>
  );
}
