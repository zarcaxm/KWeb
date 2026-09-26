"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FolderPlus, Home, Search, Star, Clock, X } from "lucide-react";
import { FolderTree } from "@/components/folders/FolderTree";
import { CreateFolderDialog } from "@/components/folders/CreateFolderDialog";
import { useSearchPalette } from "@/components/layout/SearchContext";
import { Button } from "@/components/ui/Button";
import { useDb } from "@/lib/db/DbProvider";
import { useAsyncData } from "@/lib/hooks/useLiveQuery";
import { getFolderTree } from "@/lib/repositories/folderRepository";
import {
  getFavoriteTopics,
  getRecentTopics,
} from "@/lib/repositories/topicRepository";
import { APP_VERSION } from "@/lib/version";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    onClose();
  }, [pathname, search, onClose]);
  const { openSearch } = useSearchPalette();
  const { vaultPath, openOrCreateVault, isDesktop } = useDb();
  const activeTopicId =
    pathname === "/topic" ? searchParams.get("id") ?? undefined : undefined;
  const activeFolderId =
    pathname === "/folder" ? searchParams.get("id") ?? undefined : undefined;

  const { data: tree } = useAsyncData(getFolderTree, []);
  const { data: favorites } = useAsyncData(() => getFavoriteTopics(), []);
  const { data: recent } = useAsyncData(() => getRecentTopics(8), []);

  const [createFolderOpen, setCreateFolderOpen] = useState(false);

  const rootFolders = tree ?? [];

  return (
    <aside
      id="app-sidebar"
      className={`fixed inset-y-0 left-0 z-40 flex h-full w-[260px] max-w-[85vw] shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 transition-transform md:static md:z-auto md:translate-x-0 ${
        open ? "translate-x-0 shadow-xl md:shadow-none" : "-translate-x-full max-md:invisible"
      }`}
    >
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <Link
          href="/"
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
        >
          <span className="block text-lg font-semibold tracking-tight text-neutral-900">
            KWeb
          </span>
          <span className="block text-xs text-neutral-500">v{APP_VERSION}</span>
        </Link>
        <Button
          variant="ghost"
          className="min-h-[40px] min-w-[40px] p-2 md:hidden"
          aria-label="Close navigation"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-2 py-4" aria-label="Main">
        <ul className="space-y-0.5">
          <li>
            <Link
              href="/"
              className={`flex min-h-[44px] items-center gap-2 rounded-md px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${
                pathname === "/"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              <Home className="h-4 w-4" aria-hidden />
              Home
            </Link>
          </li>
          <li>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 px-3 text-neutral-700"
              onClick={openSearch}
            >
              <Search className="h-4 w-4" aria-hidden />
              Search
              <kbd className="ml-auto hidden rounded border border-neutral-200 bg-white px-1 text-[10px] text-neutral-500 lg:inline">
                ⌘K
              </kbd>
            </Button>
          </li>
        </ul>

        <section aria-labelledby="sidebar-folders">
          <div className="mb-2 flex items-center justify-between px-2">
            <h2 id="sidebar-folders" className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Folders
            </h2>
            <Button
              variant="ghost"
              className="min-h-[32px] min-w-[32px] p-1"
              aria-label="New folder"
              onClick={() => setCreateFolderOpen(true)}
            >
              <FolderPlus className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <FolderTree
            nodes={rootFolders}
            activeTopicId={activeTopicId}
            activeFolderId={activeFolderId}
          />
        </section>

        <section aria-labelledby="sidebar-favorites">
          <h2 id="sidebar-favorites" className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Favorites
          </h2>
          {favorites && favorites.length > 0 ? (
            <ul className="space-y-0.5">
              {favorites.map((topic) => (
                <li key={topic.id}>
                  <Link
                    href={`/topic?id=${topic.id}`}
                    className={`flex min-h-[36px] items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${
                      activeTopicId === topic.id
                        ? "bg-neutral-100 font-medium text-neutral-900"
                        : "text-neutral-700"
                    }`}
                  >
                    <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden />
                    <span className="truncate">{topic.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 text-sm text-neutral-500">No favorites yet.</p>
          )}
        </section>

        <section aria-labelledby="sidebar-recent">
          <h2 id="sidebar-recent" className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Recent
          </h2>
          {recent && recent.length > 0 ? (
            <ul className="space-y-0.5">
              {recent.map((topic) => (
                <li key={topic.id}>
                  <Link
                    href={`/topic?id=${topic.id}`}
                    className={`flex min-h-[36px] items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${
                      activeTopicId === topic.id
                        ? "bg-neutral-100 font-medium text-neutral-900"
                        : "text-neutral-700"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
                    <span className="truncate">{topic.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 text-sm text-neutral-500">Open a topic to see it here.</p>
          )}
        </section>
      </nav>

      {isDesktop ? (
        <div className="border-t border-neutral-200 px-3 py-3">
          <p className="truncate text-xs text-neutral-500" title={vaultPath ?? undefined}>
            {vaultPath ? vaultPath.split(/[/\\]/).filter(Boolean).pop() : "No vault"}
          </p>
          <Button
            variant="ghost"
            className="mt-1 w-full justify-start px-2 text-sm"
            onClick={openOrCreateVault}
          >
            {vaultPath ? "Change vault" : "Open vault"}
          </Button>
        </div>
      ) : null}

      <CreateFolderDialog
        open={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
      />
    </aside>
  );
}
