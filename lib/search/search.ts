import { searchFolders } from "@/lib/repositories/folderRepository";
import { searchTopics } from "@/lib/repositories/topicRepository";
import type { Folder, Topic } from "@/types/models";

export interface SearchResults {
  folders: Folder[];
  topics: Topic[];
}

export async function globalSearch(
  query: string,
  options?: { includeContent?: boolean }
): Promise<SearchResults> {
  const [folders, topics] = await Promise.all([
    searchFolders(query),
    searchTopics(query, options),
  ]);
  return { folders, topics };
}
