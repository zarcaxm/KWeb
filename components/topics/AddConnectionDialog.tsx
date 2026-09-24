"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useDb } from "@/lib/db/DbProvider";
import { useAsyncData } from "@/lib/hooks/useLiveQuery";
import { createConnection } from "@/lib/repositories/connectionRepository";
import { getAllTopics } from "@/lib/repositories/topicRepository";
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
}

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
}: AddConnectionDialogProps) {
  const { refresh } = useDb();
  const { data: allTopics } = useAsyncData(getAllTopics, []);
  const [query, setQuery] = useState("");
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
    setQuery("");
    setSelectedId(null);
    setRelationshipType("related");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Add related topic"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            Save
          </Button>
        </>
      }
    >
      <Input
        placeholder="Search topics…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        aria-label="Search topics"
      />
      <label className="mt-4 block text-sm font-medium text-neutral-700">
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
      <ul
        className="mt-4 max-h-48 space-y-1 overflow-y-auto rounded-md border border-neutral-200 p-2"
        role="listbox"
        aria-label="Topics"
      >
        {candidates.length === 0 ? (
          <li className="px-2 py-4 text-center text-sm text-neutral-500">
            No topics found.
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
      {error ? <p className="mt-2 text-sm text-red-600" role="alert">{error}</p> : null}
    </Dialog>
  );
}
