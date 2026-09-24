import {
  createTopic as createVaultTopic,
  deleteTopic as deleteVaultTopic,
  getTopicRecord,
  listTopics,
  recordTopicOpen,
  updateTopic as updateVaultTopic,
} from "@/lib/vault/engine";
import type { Topic } from "@/types/models";

export async function createTopic(
  title: string,
  folderId: string,
  description = ""
): Promise<Topic> {
  return createVaultTopic(title, folderId, description);
}

export async function updateTopic(
  id: string,
  updates: Partial<
    Pick<Topic, "title" | "description" | "content" | "isFavorite" | "folderId">
  >
): Promise<Topic> {
  return updateVaultTopic(id, updates);
}

export async function deleteTopic(id: string): Promise<void> {
  await deleteVaultTopic(id);
}

export async function moveTopic(id: string, newFolderId: string): Promise<Topic> {
  return updateVaultTopic(id, { folderId: newFolderId });
}

export async function getTopic(
  id: string,
  options?: { recordOpen?: boolean }
): Promise<Topic | undefined> {
  if (options?.recordOpen) return recordTopicOpen(id);
  return getTopicRecord(id);
}

export async function getTopicsByFolder(folderId: string): Promise<Topic[]> {
  return listTopics()
    .filter((topic) => topic.folderId === folderId)
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
}

export async function getAllTopics(): Promise<Topic[]> {
  return listTopics();
}

export async function getFavoriteTopics(): Promise<Topic[]> {
  return listTopics()
    .filter((topic) => topic.isFavorite)
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
}

export async function getRecentTopics(limit = 10): Promise<Topic[]> {
  return listTopics()
    .filter((topic) => topic.lastOpenedAt != null)
    .sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))
    .slice(0, limit);
}

export async function getRecentlyUpdatedTopics(limit = 10): Promise<Topic[]> {
  return listTopics()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

export async function searchTopics(
  query: string,
  options?: { includeContent?: boolean }
): Promise<Topic[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return listTopics()
    .filter((topic) => {
      if (topic.title.toLowerCase().includes(q)) return true;
      if (topic.description.toLowerCase().includes(q)) return true;
      if (options?.includeContent && topic.content.toLowerCase().includes(q)) return true;
      return false;
    })
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 30);
}
