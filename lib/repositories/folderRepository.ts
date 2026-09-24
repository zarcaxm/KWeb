import { buildFolderTree } from "@/lib/utils/folderTree";
import { buildFolderPath } from "@/lib/utils/folderPath";
import {
  createFolder as createVaultFolder,
  deleteFolder as deleteVaultFolder,
  listFolders,
  listTopics,
  moveFolder as moveVaultFolder,
  updateFolder as updateVaultFolder,
} from "@/lib/vault/engine";
import type { Folder, FolderTreeNode } from "@/types/models";

export class FolderNotEmptyError extends Error {
  constructor(message = "Folder is not empty. Move or delete contents first.") {
    super(message);
    this.name = "FolderNotEmptyError";
  }
}

export class FolderCycleError extends Error {
  constructor(message = "Cannot move folder: would create a cycle.") {
    super(message);
    this.name = "FolderCycleError";
  }
}

function rethrowFolderError(error: unknown): never {
  if (error instanceof Error) {
    if (error.message.includes("subfolders") || error.message.includes("topics")) {
      throw new FolderNotEmptyError(error.message);
    }
    if (error.message.includes("cycle")) {
      throw new FolderCycleError(error.message);
    }
  }
  throw error;
}

export async function createFolder(
  name: string,
  parentFolderId: string | null = null
): Promise<Folder> {
  return createVaultFolder(name, parentFolderId);
}

export async function updateFolder(
  id: string,
  updates: Partial<Pick<Folder, "name">>
): Promise<Folder> {
  return updateVaultFolder(id, updates);
}

export async function deleteFolder(id: string): Promise<void> {
  try {
    await deleteVaultFolder(id);
  } catch (error) {
    rethrowFolderError(error);
  }
}

export async function moveFolder(
  id: string,
  newParentFolderId: string | null
): Promise<Folder> {
  try {
    return await moveVaultFolder(id, newParentFolderId);
  } catch (error) {
    rethrowFolderError(error);
  }
}

export async function getFolder(id: string): Promise<Folder | undefined> {
  return listFolders().find((folder) => folder.id === id);
}

export async function getAllFolders(): Promise<Folder[]> {
  return listFolders();
}

export async function getFolderTree(): Promise<FolderTreeNode[]> {
  return buildFolderTree(listFolders(), listTopics());
}

export async function getFolderPath(folderId: string): Promise<Folder[]> {
  const foldersById = new Map(listFolders().map((folder) => [folder.id, folder]));
  return buildFolderPath(folderId, foldersById);
}

export async function searchFolders(query: string): Promise<Folder[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return listFolders()
    .filter((folder) => folder.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 20);
}
