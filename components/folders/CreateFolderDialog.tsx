"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useDb } from "@/lib/db/DbProvider";
import { createFolder } from "@/lib/repositories/folderRepository";

interface CreateFolderDialogProps {
  open: boolean;
  onClose: () => void;
  parentFolderId?: string | null;
}

export function CreateFolderDialog({
  open,
  onClose,
  parentFolderId = null,
}: CreateFolderDialogProps) {
  const { refresh } = useDb();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setName("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createFolder(name, parentFolderId);
      refresh();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create folder.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="New folder"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            Create
          </Button>
        </>
      }
    >
      <label className="block text-sm font-medium text-neutral-700">
        Name
        <Input
          className="mt-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
      </label>
      {error ? <p className="mt-2 text-sm text-red-600" role="alert">{error}</p> : null}
    </Dialog>
  );
}
