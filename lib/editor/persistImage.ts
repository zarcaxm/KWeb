import { currentVaultPath } from "@/lib/vault/engine";
import { isDesktopApp, writeVaultBytes } from "@/lib/vault/fs";

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    default:
      return "png";
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

/** Persist a pasted/dropped image into the vault and return a markdown-friendly src. */
export async function persistEditorImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Not an image file");
  }

  const root = currentVaultPath();
  if (!root || !isDesktopApp()) {
    return readAsDataUrl(file);
  }

  const ext = extFromMime(file.type);
  const relative = `.kweb/media/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  await writeVaultBytes(root, relative, bytes);
  return relative;
}

export function imageFilesFromDataTransfer(data: DataTransfer | null): File[] {
  if (!data) return [];
  const files: File[] = [];
  if (data.files?.length) {
    for (const file of Array.from(data.files)) {
      if (file.type.startsWith("image/")) files.push(file);
    }
  }
  if (files.length === 0 && data.items?.length) {
    for (const item of Array.from(data.items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
  }
  return files;
}
