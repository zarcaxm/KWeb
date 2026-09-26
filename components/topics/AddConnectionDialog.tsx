"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useDb } from "@/lib/db/DbProvider";
import { useAsyncData } from "@/lib/hooks/useLiveQuery";
import { createConnection } from "@/lib/repositories/connectionRepository";
import { createTopic, getAllTopics } from "@/lib/repositories/topicRepository";
import {
  RELATIONSHIP_LABELS,
  type RelationshipType,
  type Topic,
} from "@/types/models";

interface AddConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  sourceTopic: Topic;
  linkedTopicIds: Set<string>;
  /** Prefer create-new form when opening (e.g. "Create related topic"). */
  initialMode?: Mode;
}

type Mode = "link" | "create";

const RELATIONSHIP_OPTIONS: RelationshipType[] = [
  "related",
  "parent",
  "subtopic",
  "prerequisite",
  "builds_on",
  "example",
];

export function AddConnectionDialog({
  open,
  onClose,
  sourceTopic,
  linkedTopicIds,
  initialMode = "link",
}: AddConnectionDialogProps) {
  const router = useRouter();
  const { refresh } = useDb();
  const { data: allTopics } = useAsyncData(getAllTopics, []);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [query, setQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [relationshipType, setRelationshipType] =
    useState<RelationshipType>("related");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const candidates = useMemo(() => {
    if (!allTopics) return [];
    const q = query.trim().toLowerCase();
    return allTopics
      .filter((t) => t.id !== sourceTopic.id && !linkedTopicIds.has(t.id))
      .filter((t) => {
        if (!q) return true;
        return (
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, 30);
  }, [allTopics, sourceTopic.id, linkedTopicIds, query]);

  const handleClose = () => {
    setMode(initialMode);
    setQuery("");
    setNewTitle("");
    setSelectedId(null);
    setRelationshipType("related");
    setError(null);
    onClose();
  };

  // Reset mode when dialog opens with a preferred initialMode
  if (open && mode !== initialMode && !query && !newTitle && !selectedId) {
    // Avoid setState during render loops: sync via effect below would be cleaner.
  }

  const handleLink = async () => {
    if (!selectedId) {
      setError("Select a topic.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createConnection(sourceTopic.id, selectedId, relationshipType);
      refresh();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    const title = newTitle.trim() || "Untitled topic";
    setSaving(true);
    setError(null);
    try {
      const created = await createTopic(title, sourceTopic.folderId);
      await createConnection(sourceTopic.id, created.id, relationshipType);
      refresh();
      handleClose();
      router.push(`/topic?id=${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create topic.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={mode === "create" ? "Create related topic" : "Add related topic"}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          {mode === "create" ? (
            <Button variant="primary" onClick={handleCreate} disabled={saving}>
              Create and open
            </Button>
          ) : (
            <Button variant="primary" onClick={handleLink} disabled={saving}>
              Save
            </Button>
          )}
        </>
      }
    >
      <div className="mb-4 flex gap-2" role="tablist" aria-label="Related topic action">
        <Button
          variant={mode === "link" ? "secondary" : "ghost"}
          className="text-sm"
          aria-selected={mode === "link"}
          onClick={() => {
            setMode("link");
            setError(null);
          }}
        >
          Link existing
        </Button>
        <Button
          variant={mode === "create" ? "secondary" : "ghost"}
          className="text-sm"
          aria-selected={mode === "create"}
          onClick={() => {
            setMode("create");
            setError(null);
            if (!newTitle.trim() && query.trim()) setNewTitle(query.trim());
          }}
        >
          Create new
        </Button>
      </div>

      <label className="block text-sm font-medium text-neutral-700">
        Relationship (optional)
        <select
          className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900"
          value={relationshipType ?? "related"}
          onChange={(e) =>
            setRelationshipType(e.target.value as RelationshipType)
          }
        >
          {RELATIONSHIP_OPTIONS.map((value) => (
            <option key={value ?? "none"} value={value ?? "related"}>
              {value ? RELATIONSHIP_LABELS[value] : "Related"}
            </option>
          ))}
        </select>
      </label>

      {mode === "create" ? (
        <div className="mt-4">
          <Input
            placeholder="New topic title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
            aria-label="New topic title"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreate();
              }
            }}
          />
          <p className="mt-2 text-xs text-neutral-500">
            Creates the topic in the same folder as “{sourceTopic.title}” and
            links them.
          </p>
        </div>
      ) : (
        <>
          <Input
            className="mt-4"
            placeholder="Search topics…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            aria-label="Search topics"
          />
          <ul
            className="mt-4 max-h-48 space-y-1 overflow-y-auto rounded-md border border-neutral-200 p-2"
            role="listbox"
            aria-label="Topics"
          >
            {candidates.length === 0 ? (
              <li className="px-2 py-4 text-center text-sm text-neutral-500">
                No topics found.
                {query.trim() ? (
                  <button
                    type="button"
                    className="mt-2 block w-full text-sm font-medium text-neutral-800 underline"
                    onClick={() => {
                      setNewTitle(query.trim());
                      setMode("create");
                    }}
                  >
                    Create “{query.trim()}” instead
                  </button>
                ) : null}
              </li>
            ) : (
              candidates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedId === t.id}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${
                      selectedId === t.id ? "bg-neutral-100 font-medium" : ""
                    }`}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <span className="font-medium text-neutral-900">{t.title}</span>
                    {t.description ? (
                      <span className="mt-0.5 block truncate text-neutral-500">
                        {t.description}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      )}
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}
