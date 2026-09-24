"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useDb } from "@/lib/db/DbProvider";
import { updateFolder } from "@/lib/repositories/folderRepository";
import type { Folder } from "@/types/models";

interface RenameFolderDialogProps {
  open: boolean;
  onClose: () => void;
  folder: Folder | null;
}

export function RenameFolderDialog({ open, onClose, folder }: RenameFolderDialogProps) {
  const { refresh } = useDb();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (folder) setName(folder.name);
  }, [folder]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!folder || !name.trim()) return;
    setSaving(true);
    try {
      await updateFolder(folder.id, { name });
      refresh();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rename folder.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Rename folder"
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
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
      />
      {error ? <p className="mt-2 text-sm text-red-600" role="alert">{error}</p> : null}
    </Dialog>
  );
}
