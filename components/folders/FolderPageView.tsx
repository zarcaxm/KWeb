"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Grid3x3, List, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { MoveFolderDialog } from "@/components/folders/MoveFolderDialog";
import { RenameFolderDialog } from "@/components/folders/RenameFolderDialog";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { CreateFolderDialog } from "@/components/folders/CreateFolderDialog";
import { TopicCard } from "@/components/topics/TopicCard";
import { Button } from "@/components/ui/Button";
import { useDb } from "@/lib/db/DbProvider";
import { useAsyncData } from "@/lib/hooks/useLiveQuery";
import { getConnectionCountsByTopicIds } from "@/lib/repositories/connectionRepository";
import {
  deleteFolder,
  FolderNotEmptyError,
  getFolder,
  getFolderPath,
  getFolderTree,
} from "@/lib/repositories/folderRepository";
import { createTopic, getTopicsByFolder } from "@/lib/repositories/topicRepository";
import { useRouter } from "next/navigation";
import type { FolderTreeNode } from "@/types/models";

const VIEW_KEY = "kweb:folderView";

type ViewMode = "grid" | "list";

function findChildFolders(tree: FolderTreeNode[], folderId: string): FolderTreeNode[] {
  for (const node of tree) {
    if (node.folder.id === folderId) return node.children;
    const found = findChildFolders(node.children, folderId);
    if (found.length) return found;
  }
  return [];
}

interface FolderPageViewProps {
  folderId: string;
}

export function FolderPageView({ folderId }: FolderPageViewProps) {
  const router = useRouter();
  const { refresh } = useDb();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "grid";
    return (localStorage.getItem(VIEW_KEY) as ViewMode) || "grid";
  });
  const [createSubfolderOpen, setCreateSubfolderOpen] = useState(false);
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: folder, loading: folderLoading } = useAsyncData(
    () => getFolder(folderId),
    [folderId]
  );
  const { data: path } = useAsyncData(() => getFolderPath(folderId), [folderId]);
  const { data: topics } = useAsyncData(() => getTopicsByFolder(folderId), [folderId]);
  const { data: tree } = useAsyncData(getFolderTree, []);
  const topicIds = useMemo(() => topics?.map((t) => t.id) ?? [], [topics]);
  const { data: connectionCounts } = useAsyncData(
    () => getConnectionCountsByTopicIds(topicIds),
    [topicIds.join(",")]
  );

  const childFolders = useMemo(
    () => (tree ? findChildFolders(tree, folderId) : []),
    [tree, folderId]
  );

  const setView = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_KEY, mode);
  };

  const handleDeleteFolder = async () => {
    if (!folder) return;
    if (!window.confirm(`Delete folder "${folder.name}"?`)) return;
    try {
      await deleteFolder(folder.id);
      refresh();
      router.push("/");
    } catch (e) {
      const message =
        e instanceof FolderNotEmptyError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not delete folder.";
      window.alert(message);
    }
    setMenuOpen(false);
  };

  const handleNewTopic = async () => {
    setCreatingTopic(true);
    try {
      const topic = await createTopic("Untitled topic", folderId);
      refresh();
      router.push(`/topic?id=${topic.id}`);
    } finally {
      setCreatingTopic(false);
    }
  };

  if (folderLoading) {
    return <p className="text-sm text-neutral-500">Loading folder…</p>;
  }

  if (!folder) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Folder not found</h1>
        <p className="mt-2 text-sm text-neutral-600">
          <Link href="/" className="underline">Return home</Link>
        </p>
      </div>
    );
  }

  const topicCount = topics?.length ?? 0;

  return (
    <div>
      <Breadcrumbs folders={path ?? []} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {folder.name}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {topicCount} {topicCount === 1 ? "topic" : "topics"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-md border border-neutral-300 p-0.5"
            role="group"
            aria-label="View mode"
          >
            <Button
              variant={viewMode === "grid" ? "primary" : "ghost"}
              className="min-h-[36px] px-2"
              aria-pressed={viewMode === "grid"}
              onClick={() => setView("grid")}
            >
              <Grid3x3 className="h-4 w-4" aria-hidden />
              <span className="sr-only">Grid view</span>
            </Button>
            <Button
              variant={viewMode === "list" ? "primary" : "ghost"}
              className="min-h-[36px] px-2"
              aria-pressed={viewMode === "list"}
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" aria-hidden />
              <span className="sr-only">List view</span>
            </Button>
          </div>
          <Button variant="secondary" onClick={() => setCreateSubfolderOpen(true)}>
            New subfolder
          </Button>
          <Button variant="primary" onClick={handleNewTopic} disabled={creatingTopic}>
            <Plus className="h-4 w-4" aria-hidden />
            New topic
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              aria-label="Folder actions"
              aria-expanded={menuOpen}
              className="min-h-[44px] min-w-[44px] p-2"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden />
            </Button>
            {menuOpen ? (
              <div
                className="absolute right-0 z-10 mt-1 w-48 rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2 text-left text-sm hover:bg-neutral-100"
                  onClick={() => {
                    setMenuOpen(false);
                    setRenameOpen(true);
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2 text-left text-sm hover:bg-neutral-100"
                  onClick={() => {
                    setMenuOpen(false);
                    setMoveOpen(true);
                  }}
                >
                  Move folder…
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                  onClick={handleDeleteFolder}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {childFolders.length > 0 ? (
        <section className="mt-8" aria-labelledby="subfolders-heading">
          <h2 id="subfolders-heading" className="text-sm font-medium text-neutral-500">
            Subfolders
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {childFolders.map((child) => (
              <li key={child.folder.id}>
                <Link
                  href={`/folder?id=${child.folder.id}`}
                  className="block rounded-lg border border-neutral-200 bg-white px-4 py-3 hover:border-neutral-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                >
                  <span className="font-medium text-neutral-900">{child.folder.name}</span>
                  <span className="mt-1 block text-sm text-neutral-500">
                    {child.topics.length} topics
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8" aria-labelledby="topics-heading">
        <h2 id="topics-heading" className="text-sm font-medium text-neutral-500">
          Topics
        </h2>
        {topicCount === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
            No topics in this folder yet. Create one to start writing.
          </p>
        ) : (
          <ul
            className={`mt-4 ${
              viewMode === "grid"
                ? "grid gap-4 sm:grid-cols-2"
                : "divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white"
            }`}
          >
            {topics?.map((topic) => (
              <li key={topic.id} className={viewMode === "list" ? "px-4" : ""}>
                <TopicCard
                  topic={topic}
                  connectionCount={connectionCounts?.get(topic.id) ?? 0}
                  variant={viewMode}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <CreateFolderDialog
        open={createSubfolderOpen}
        onClose={() => setCreateSubfolderOpen(false)}
        parentFolderId={folderId}
      />
      <RenameFolderDialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        folder={folder}
      />
      <MoveFolderDialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        folder={folder}
      />
    </div>
  );
}
