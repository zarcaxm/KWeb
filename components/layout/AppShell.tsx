"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { ExpandedFoldersProvider } from "@/components/folders/ExpandedFoldersContext";
import { DbGate } from "@/components/layout/DbGate";
import { Button } from "@/components/ui/Button";
import { UpdateBanner } from "@/components/layout/UpdateBanner";
import { APP_VERSION } from "@/lib/version";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  return (
    <ExpandedFoldersProvider>
      <div className="flex h-dvh overflow-hidden bg-neutral-100 text-neutral-900">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow"
        >
          Skip to main content
        </a>

        {sidebarOpen ? (
          <div
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            aria-hidden
            onClick={closeSidebar}
          />
        ) : null}

        <Suspense
          fallback={
            <aside className="hidden h-full w-[260px] shrink-0 border-r border-neutral-200 bg-neutral-50 md:block" />
          }
        >
          <Sidebar open={sidebarOpen} onClose={closeSidebar} />
        </Suspense>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-2 py-1 md:hidden">
            <Button
              variant="ghost"
              className="min-h-[44px] min-w-[44px] p-2"
              aria-label="Open navigation"
              aria-expanded={sidebarOpen}
              aria-controls="app-sidebar"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </Button>
            <div className="min-w-0">
              <span className="block text-base font-semibold tracking-tight">KWeb</span>
              <span className="block text-xs text-neutral-500">v{APP_VERSION}</span>
            </div>
          </header>

          <UpdateBanner />

          <main id="main-content" className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
              <DbGate>{children}</DbGate>
            </div>
          </main>
        </div>
      </div>
    </ExpandedFoldersProvider>
  );
}
