"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Star, Trash2 } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { AddConnectionDialog } from "@/components/topics/AddConnectionDialog";
import { MoveTopicDialog } from "@/components/topics/MoveTopicDialog";
import { RelatedTopics } from "@/components/topics/RelatedTopics";
import { TopicEditor } from "@/components/topics/TopicEditor";
import { Button } from "@/components/ui/Button";
import { useDb } from "@/lib/db/DbProvider";
import { useAsyncData } from "@/lib/hooks/useLiveQuery";
import { useExpandedFoldersContext } from "@/components/folders/ExpandedFoldersContext";
import { getConnectionsForTopic } from "@/lib/repositories/connectionRepository";
import { getFolderPath } from "@/lib/repositories/folderRepository";
import {
  deleteTopic,
  getTopic,
  updateTopic,
} from "@/lib/repositories/topicRepository";

interface TopicPageViewProps {
  topicId: string;
}

export function TopicPageView({ topicId }: TopicPageViewProps) {
  const router = useRouter();
  const { refresh } = useDb();
  const { expand } = useExpandedFoldersContext();
  const [addConnectionOpen, setAddConnectionOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: topic, loading } = useAsyncData(
    () => getTopic(topicId, { recordOpen: true }),
    [topicId]
  );

  const openedRef = useRef<string | null>(null);
  useEffect(() => {
    if (topic && openedRef.current !== topicId) {
      openedRef.current = topicId;
      refresh();
    }
  }, [topic, topicId, refresh]);

  const { data: path } = useAsyncData(
    () => (topic ? getFolderPath(topic.folderId) : Promise.resolve([])),
    [topic?.folderId]
  );

  const { data: connections } = useAsyncData(
    () => getConnectionsForTopic(topicId),
    [topicId]
  );

  const linkedIds = useMemo(
    () => new Set(connections?.map((c) => c.topic.id) ?? []),
    [connections]
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (topic) {
      setTitle(topic.title);
      setDescription(topic.description);
    }
    // Only re-sync when navigating to a different topic
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic?.id]);

  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [description]);

  useEffect(() => {
    if (topic?.folderId) {
      for (const folder of path ?? []) {
        expand(folder.id);
      }
    }
  }, [topic?.folderId, path, expand]);

  const saveField = useCallback(
    async (
      updates: Parameters<typeof updateTopic>[1],
      options?: { refreshUi?: boolean }
    ) => {
      if (!topic) return;
      await updateTopic(topic.id, updates);
      if (options?.refreshUi) refresh();
    },
    [topic, refresh]
  );

  const titleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const descDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTitleChange = (value: string) => {
    if (!topic) return;
    if (titleDebounce.current) clearTimeout(titleDebounce.current);
    titleDebounce.current = setTimeout(() => {
      saveField({ title: value });
    }, 400);
  };

  const handleDescriptionChange = (value: string) => {
    if (!topic) return;
    if (descDebounce.current) clearTimeout(descDebounce.current);
    descDebounce.current = setTimeout(() => {
      saveField({ description: value });
    }, 400);
  };

  const toggleFavorite = async () => {
    if (!topic) return;
    await saveField({ isFavorite: !topic.isFavorite }, { refreshUi: true });
  };

  const handleDelete = async () => {
    if (!topic) return;
    if (!window.confirm(`Delete "${topic.title}"? This cannot be undone.`)) return;
    await deleteTopic(topic.id);
    refresh();
    router.push("/");
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading topic…</p>;
  }

  if (!topic) {
    return (
      <div>
        <h1 className="text-xl font-semibold">Topic not found</h1>
        <Button className="mt-4" variant="secondary" onClick={() => router.push("/")}>
          Go home
        </Button>
      </div>
    );
  }

  return (
    <article>
      <Breadcrumbs folders={path ?? []} currentLabel={topic.title} />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <input
            className="w-full border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-neutral-900 placeholder:text-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              handleTitleChange(e.target.value);
            }}
            onBlur={(e) => saveField({ title: e.target.value })}
            aria-label="Topic title"
          />
          <textarea
            ref={descRef}
            rows={1}
            className="w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-sm text-neutral-600 placeholder:text-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900"
            placeholder="Short description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              handleDescriptionChange(e.target.value);
            }}
            onBlur={(e) => saveField({ description: e.target.value })}
            aria-label="Topic description"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            aria-label={topic.isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={topic.isFavorite}
            onClick={toggleFavorite}
            className="min-h-[44px] min-w-[44px] p-2"
          >
            <Star
              className={`h-5 w-5 ${topic.isFavorite ? "fill-amber-400 text-amber-500" : "text-neutral-400"}`}
              aria-hidden
            />
          </Button>
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              aria-label="Topic actions"
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
                    setMoveOpen(true);
                  }}
                >
                  Move to folder…
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setMenuOpen(false);
                    handleDelete();
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Delete topic
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="my-8 border-t border-neutral-200" role="separator" />

      <TopicEditor
        content={topic.content}
        onChange={(md) => saveField({ content: md })}
      />

      <RelatedTopics
        connections={connections ?? []}
        onAdd={() => setAddConnectionOpen(true)}
      />

      <AddConnectionDialog
        open={addConnectionOpen}
        onClose={() => setAddConnectionOpen(false)}
        sourceTopic={topic}
        linkedTopicIds={linkedIds}
      />
      <MoveTopicDialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        topic={topic}
      />
    </article>
  );
}
