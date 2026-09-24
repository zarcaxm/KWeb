import type { Folder, FolderTreeNode, Topic } from "@/types/models";

export function buildFolderTree(
  folders: Folder[],
  topics: Topic[]
): FolderTreeNode[] {
  const sortedFolders = [...folders].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  const topicsByFolder = new Map<string, Topic[]>();
  for (const topic of topics) {
    const list = topicsByFolder.get(topic.folderId) ?? [];
    list.push(topic);
    topicsByFolder.set(topic.folderId, list);
  }
  for (const [, list] of topicsByFolder) {
    list.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
    );
  }

  const nodeMap = new Map<string, FolderTreeNode>();
  for (const folder of sortedFolders) {
    nodeMap.set(folder.id, {
      folder,
      children: [],
      topics: topicsByFolder.get(folder.id) ?? [],
    });
  }

  const roots: FolderTreeNode[] = [];
  for (const folder of sortedFolders) {
    const node = nodeMap.get(folder.id)!;
    if (folder.parentFolderId && nodeMap.has(folder.parentFolderId)) {
      nodeMap.get(folder.parentFolderId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortChildren = (nodes: FolderTreeNode[]) => {
    nodes.sort((a, b) =>
      a.folder.name.localeCompare(b.folder.name, undefined, {
        sensitivity: "base",
      })
    );
    for (const node of nodes) sortChildren(node.children);
  };
  sortChildren(roots);

  return roots;
}
