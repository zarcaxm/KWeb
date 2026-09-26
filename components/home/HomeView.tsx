"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  FileText,
  Folder as FolderIcon,
  FolderPlus,
  Star,
} from "lucide-react";
import { CreateFolderDialog } from "@/components/folders/CreateFolderDialog";
import { Button } from "@/components/ui/Button";
import { useDb } from "@/lib/db/DbProvider";
import { useAsyncData } from "@/lib/hooks/useLiveQuery";
import { getFolderTree } from "@/lib/repositories/folderRepository";
import {
  getFavoriteTopics,
  getRecentTopics,
} from "@/lib/repositories/topicRepository";
import { seedDevData } from "@/lib/seed/devSeed";
import type { FolderTreeNode, Topic } from "@/types/models";

function countTopicsDeep(node: FolderTreeNode): number {
  return (
    node.topics.length +
    node.children.reduce((sum, child) => sum + countTopicsDeep(child), 0)
  );
}

function countFoldersDeep(node: FolderTreeNode): number {
  return (
    node.children.length +
    node.children.reduce((sum, child) => sum + countFoldersDeep(child), 0)
  );
}

function vaultDisplayName(path: string | null): string {
  if (!path) return "Library";
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] || "Library";
}

export function HomeView() {
  const searchParams = useSearchParams();
  const showDev = searchParams.get("dev") === "1";
  const { refresh, vaultPath } = useDb();
  const [seeding, setSeeding] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);

  const { data: recent } = useAsyncData(() => getRecentTopics(8), []);
  const { data: favorites } = useAsyncData(() => getFavoriteTopics(), []);
  const { data: tree } = useAsyncData(getFolderTree, []);

  const rootFolders = useMemo(
    () =>
      [...(tree ?? [])].sort((a, b) =>
        a.folder.name.localeCompare(b.folder.name, undefined, {
          sensitivity: "base",
        })
      ),
    [tree]
  );

  const folderStats = useMemo(() => {
    let folders = rootFolders.length;
    let topics = 0;
    for (const node of rootFolders) {
      folders += countFoldersDeep(node);
      topics += countTopicsDeep(node);
    }
    return { folders, topics };
  }, [rootFolders]);

  const quickAccess = useMemo(() => {
    const seen = new Set<string>();
    const items: { kind: "favorite" | "recent"; topic: Topic }[] = [];
    for (const topic of favorites ?? []) {
      if (seen.has(topic.id)) continue;
      seen.add(topic.id);
      items.push({ kind: "favorite", topic });
    }
    for (const topic of recent ?? []) {
      if (seen.has(topic.id)) continue;
      seen.add(topic.id);
      items.push({ kind: "recent", topic });
      if (items.length >= 10) break;
    }
    return items.slice(0, 10);
  }, [favorites, recent]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDevData();
      refresh();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div>
      <header className="mb-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              {vaultDisplayName(vaultPath)}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {folderStats.folders}{" "}
              {folderStats.folders === 1 ? "folder" : "folders"}
              <span className="mx-1.5 text-neutral-300" aria-hidden>
                ·
              </span>
              {folderStats.topics}{" "}
              {folderStats.topics === 1 ? "topic" : "topics"}
            </p>
            {vaultPath ? (
              <p className="mt-1 truncate font-mono text-xs text-neutral-400">
                {vaultPath}
              </p>
            ) : null}
          </div>
          <Button
            variant="secondary"
            className="text-sm"
            onClick={() => setCreateFolderOpen(true)}
          >
            <FolderPlus className="h-4 w-4" aria-hidden />
            New folder
          </Button>
        </div>

        {showDev ? (
          <Button className="mt-4" variant="secondary" onClick={handleSeed} disabled={seeding}>
            Load sample data
          </Button>
        ) : null}
      </header>

      {quickAccess.length > 0 ? (
        <section className="mb-10" aria-labelledby="quick-access-heading">
          <h2
            id="quick-access-heading"
            className="text-sm font-medium text-neutral-500"
          >
            Quick access
          </h2>
          <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {quickAccess.map(({ kind, topic }) => (
              <li key={topic.id}>
                <Link
                  href={`/topic?id=${topic.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-900"
                >
                  <FileText
                    className="h-4 w-4 shrink-0 text-neutral-400"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">
                    {topic.title}
                  </span>
                  {kind === "favorite" ? (
                    <Star
                      className="h-3.5 w-3.5 shrink-0 fill-neutral-300 text-neutral-400"
                      aria-label="Favorite"
                    />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="directories-heading">
        <h2
          id="directories-heading"
          className="text-sm font-medium text-neutral-500"
        >
          Directories
        </h2>

        {rootFolders.length === 0 ? (
          <div className="mt-6">
            <p className="text-sm text-neutral-500">
              Create a folder to organize topics.
            </p>
            <Button
              className="mt-4"
              variant="secondary"
              onClick={() => setCreateFolderOpen(true)}
            >
              <FolderPlus className="h-4 w-4" aria-hidden />
              New folder
            </Button>
          </div>
        ) : (
          <ul className="mt-3 grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rootFolders.map((node) => {
              const topicCount = countTopicsDeep(node);
              const nestedFolders = countFoldersDeep(node);
              const childPreview = node.children
                .slice(0, 3)
                .map((child) => child.folder.name);
              return (
                <li key={node.folder.id} className="min-h-0">
                  <Link
                    href={`/folder?id=${node.folder.id}`}
                    className="flex h-full min-h-[5.5rem] items-start gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 hover:border-neutral-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                  >
                    <FolderIcon
                      className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-neutral-900">
                        {node.folder.name}
                      </div>
                      <div className="mt-0.5 text-sm text-neutral-500">
                        {topicCount} {topicCount === 1 ? "topic" : "topics"}
                        {nestedFolders > 0
                          ? ` · ${nestedFolders} ${nestedFolders === 1 ? "folder" : "folders"}`
                          : ""}
                      </div>
                      <div className="mt-1 truncate text-xs text-neutral-400">
                        {childPreview.length > 0
                          ? `${childPreview.join(", ")}${node.children.length > 3 ? "…" : ""}`
                          : "\u00A0"}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-10 text-sm text-neutral-500">
        Cloud sync: put this vault folder inside Google Drive (or another sync
        client). Avoid editing the same topic on two devices at once.
      </p>

      <CreateFolderDialog
        open={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        parentFolderId={null}
      />
    </div>
  );
}
