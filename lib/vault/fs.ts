export interface VaultSnapshot {
  files: { path: string; text: string }[];
  directories: string[];
}

export function isDesktopApp(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function invoke<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(command, args);
}

export function pickDirectory(): Promise<string | null> {
  return invoke("pick_directory");
}

export function getLastVault(): Promise<string | null> {
  return invoke("get_last_vault");
}

export function setLastVault(path: string): Promise<void> {
  return invoke("set_last_vault", { path });
}

export function loadVaultSnapshot(root: string): Promise<VaultSnapshot> {
  return invoke("vault_load", { root });
}

export function writeVaultText(
  root: string,
  relative: string,
  text: string
): Promise<void> {
  return invoke("vault_write", { root, relative, text });
}

export function writeVaultBytes(
  root: string,
  relative: string,
  data: Uint8Array
): Promise<void> {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < data.length; i += chunk) {
    binary += String.fromCharCode(...data.subarray(i, i + chunk));
  }
  const base64 = btoa(binary);
  return invoke("vault_write_bytes", { root, relative, base64 });
}

export function joinVaultPath(root: string, relative: string): string {
  const cleanRoot = root.replace(/[/\\]+$/, "");
  const cleanRel = relative.replace(/^[/\\]+/, "").replace(/\\/g, "/");
  return `${cleanRoot}/${cleanRel}`;
}

/** Resolve a vault-relative media path (or pass-through URL) for <img src>. */
export async function resolveVaultMediaSrc(src: string): Promise<string> {
  if (
    !src ||
    src.startsWith("data:") ||
    src.startsWith("blob:") ||
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("asset:") ||
    src.startsWith("asset://")
  ) {
    return src;
  }
  if (!isDesktopApp()) return src;
  try {
    const { convertFileSrc } = await import("@tauri-apps/api/core");
    const { currentVaultPath } = await import("@/lib/vault/engine");
    const root = currentVaultPath();
    if (!root) return src;
    const absolute = src.startsWith("/") || /^[A-Za-z]:[\\/]/.test(src)
      ? src
      : joinVaultPath(root, src);
    return convertFileSrc(absolute);
  } catch {
    return src;
  }
}

export function makeVaultDir(root: string, relative: string): Promise<void> {
  return invoke("vault_mkdir", { root, relative });
}

export function renameVaultPath(
  root: string,
  from: string,
  to: string
): Promise<void> {
  return invoke("vault_rename", { root, from, to });
}

export function removeVaultFile(root: string, relative: string): Promise<void> {
  return invoke("vault_remove_file", { root, relative });
}

export function removeVaultDir(root: string, relative: string): Promise<void> {
  return invoke("vault_remove_dir", { root, relative });
}

export function recordLocalTopicOpen(
  root: string,
  topicId: string,
  openedAt: number
): Promise<void> {
  return invoke("record_local_topic_open", {
    root,
    topicId,
    openedAt,
  });
}

export function getLocalTopicOpens(
  root: string
): Promise<Record<string, number>> {
  return invoke("get_local_topic_opens", { root });
}

export function startVaultWatch(root: string): Promise<void> {
  return invoke("vault_start_watch", { root });
}

export function stopVaultWatch(): Promise<void> {
  return invoke("vault_stop_watch");
}
