import type { Folder } from "@/types/models";

export function buildFolderPath(
  folderId: string | null,
  foldersById: Map<string, Folder>
): Folder[] {
  if (!folderId) return [];
  const path: Folder[] = [];
  let currentId: string | null = folderId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const folder = foldersById.get(currentId);
    if (!folder) break;
    path.unshift(folder);
    currentId = folder.parentFolderId;
  }

  return path;
}

export function wouldCreateFolderCycle(
  folderId: string,
  newParentId: string | null,
  foldersById: Map<string, Folder>
): boolean {
  if (!newParentId) return false;
  if (newParentId === folderId) return true;

  let currentId: string | null = newParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === folderId) return true;
    if (visited.has(currentId)) break;
    visited.add(currentId);
    const folder = foldersById.get(currentId);
    if (!folder) break;
    currentId = folder.parentFolderId;
  }

  return false;
}
