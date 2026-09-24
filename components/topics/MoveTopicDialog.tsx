"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useDb } from "@/lib/db/DbProvider";
import { useAsyncData } from "@/lib/hooks/useLiveQuery";
import { getAllFolders } from "@/lib/repositories/folderRepository";
import { moveTopic } from "@/lib/repositories/topicRepository";
import { buildFolderPath } from "@/lib/utils/folderPath";
import type { Topic } from "@/types/models";

interface MoveTopicDialogProps {
  open: boolean;
  onClose: () => void;
  topic: Topic | null;
}

export function MoveTopicDialog({ open, onClose, topic }: MoveTopicDialogProps) {
  const { refresh } = useDb();
  const { data: folders } = useAsyncData(getAllFolders, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const options = useMemo(() => {
    if (!folders) return [];
    const byId = new Map(folders.map((f) => [f.id, f]));
    return folders
      .map((f) => {
        const path = buildFolderPath(f.id, byId)
          .map((p) => p.name)
          .join(" / ");
        return { id: f.id, label: path || f.name };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [folders]);

  const handleSubmit = async () => {
    if (!topic || !selectedId) {
      setError("Select a folder.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await moveTopic(topic.id, selectedId);
      refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to move topic.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Move topic"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            Move
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-neutral-600">Select destination folder.</p>
      <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-neutral-200 p-2">
        {options.map((opt) => (
          <li key={opt.id}>
            <button
              type="button"
              className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${
                selectedId === opt.id ? "bg-neutral-100 font-medium" : ""
              }`}
              onClick={() => setSelectedId(opt.id)}
            >
              {opt.label}
            </button>
          </li>
        ))}
      </ul>
      {error ? <p className="mt-2 text-sm text-red-600" role="alert">{error}</p> : null}
    </Dialog>
  );
}
