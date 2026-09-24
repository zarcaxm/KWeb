"use client";

import { Button } from "@/components/ui/Button";
import { useDb } from "@/lib/db/DbProvider";

export function DbGate({ children }: { children: React.ReactNode }) {
  const { ready, vaultPath, isDesktop, opening, error, openOrCreateVault } = useDb();

  if (!ready || opening) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-neutral-500" role="status">
          {opening ? "Opening vault…" : "Loading workspace…"}
        </p>
      </div>
    );
  }

  if (!isDesktop) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">KWeb</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Knowledge is stored in a folder on your computer, like an Obsidian vault.
          Open the desktop app to choose that folder.
        </p>
        <pre className="mt-6 overflow-x-auto rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800">
          npm run desktop
        </pre>
      </div>
    );
  }

  if (!vaultPath) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Open a vault</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Choose a folder. KWeb keeps topics as Markdown files and folders as directories.
          You can point a future sync service at this same folder.
        </p>
        {error ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <Button className="mt-6" variant="primary" onClick={openOrCreateVault}>
          Choose folder
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
