"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useDb } from "@/lib/db/DbProvider";
import { useAsyncData } from "@/lib/hooks/useLiveQuery";
import { getAllFolders, moveFolder } from "@/lib/repositories/folderRepository";
import { buildFolderPath } from "@/lib/utils/folderPath";
import type { Folder } from "@/types/models";

interface MoveFolderDialogProps {
  open: boolean;
  onClose: () => void;
  folder: Folder | null;
}

export function MoveFolderDialog({ open, onClose, folder }: MoveFolderDialogProps) {
  const { refresh } = useDb();
  const { data: folders } = useAsyncData(getAllFolders, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const options = useMemo(() => {
    if (!folders || !folder) return [];
    const byId = new Map(folders.map((f) => [f.id, f]));
    const descendants = new Set<string>();
    const collect = (id: string) => {
      descendants.add(id);
      folders.filter((f) => f.parentFolderId === id).forEach((f) => collect(f.id));
    };
    collect(folder.id);

    const items: { id: string | null; label: string }[] = [
      { id: null, label: "Root (no parent)" },
    ];

    for (const f of folders) {
      if (descendants.has(f.id)) continue;
      const path = buildFolderPath(f.id, byId)
        .map((p) => p.name)
        .join(" / ");
      items.push({ id: f.id, label: path || f.name });
    }
    return items.sort((a, b) => a.label.localeCompare(b.label));
  }, [folders, folder]);

  const handleSubmit = async () => {
    if (!folder) return;
    setSaving(true);
    setError(null);
    try {
      await moveFolder(folder.id, selectedId);
      refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to move folder.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Move folder"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            Move
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-neutral-600">Select a new parent folder.</p>
      <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-neutral-200 p-2">
        {options.map((opt) => (
          <li key={opt.id ?? "root"}>
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
