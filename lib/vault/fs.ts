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
