import type { Connection, Folder, RelationshipType, Topic } from "@/types/models";
import {
  baseName,
  joinRel,
  normalizeLinks,
  parentDir,
  parseTopicFile,
  replacePrefix,
  safeFileStem,
  serializeTopicFile,
  VAULT_MARKER,
  type FolderFileMeta,
  type TopicFileMeta,
  type TopicLinkMeta,
} from "@/lib/vault/format";
import {
  loadVaultSnapshot,
  makeVaultDir,
  removeVaultDir,
  removeVaultFile,
  renameVaultPath,
  setLastVault,
  writeVaultText,
  type VaultSnapshot,
} from "@/lib/vault/fs";

interface FolderRec {
  folder: Folder;
  dirRel: string;
}

interface TopicRec {
  topic: Topic;
  fileRel: string;
  links: TopicLinkMeta[];
}

interface VaultState {
  root: string;
  folders: Map<string, FolderRec>;
  topics: Map<string, TopicRec>;
}

let state: VaultState | null = null;
let queue: Promise<unknown> = Promise.resolve();

function createId(): string {
  return crypto.randomUUID();
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function requireVault(): VaultState {
  if (!state) throw new Error("No vault is open.");
  return state;
}

export function isVaultOpen(): boolean {
  return state !== null;
}

export function currentVaultPath(): string | null {
  return state?.root ?? null;
}

export function listFolders(): Folder[] {
  if (!state) return [];
  return [...state.folders.values()].map((rec) => rec.folder);
}

export function listTopics(): Topic[] {
  if (!state) return [];
  return [...state.topics.values()].map((rec) => rec.topic);
}

export function listConnections(): Connection[] {
  if (!state) return [];
  const connections: Connection[] = [];
  for (const rec of state.topics.values()) {
    for (const link of rec.links) {
      connections.push({
        id: link.id,
        sourceTopicId: rec.topic.id,
        targetTopicId: link.targetId,
        relationshipType: link.type,
        createdAt: link.createdAt,
      });
    }
  }
  return connections;
}

function topicFileRel(vault: VaultState, dirRel: string, title: string, topicId: string): string {
  const stem = safeFileStem(title);
  const taken = (name: string) => {
    const rel = `${dirRel}/${name}`.toLowerCase();
    for (const rec of vault.topics.values()) {
      if (rec.topic.id !== topicId && rec.fileRel.toLowerCase() === rel) return true;
    }
    return false;
  };
  let name = `${stem}.md`;
  let index = 2;
  while (taken(name)) {
    name = `${stem} (${index}).md`;
    index += 1;
  }
  return `${dirRel}/${name}`;
}

function uniqueDirName(vault: VaultState, parentRel: string, name: string, selfId: string): string {
  const stem = safeFileStem(name);
  const taken = (dirName: string) => {
    const rel = joinRel(parentRel, dirName).toLowerCase();
    for (const rec of vault.folders.values()) {
      if (rec.folder.id !== selfId && rec.dirRel.toLowerCase() === rel) return true;
    }
    return false;
  };
  let dirName = stem;
  let index = 2;
  while (taken(dirName)) {
    dirName = `${stem} (${index})`;
    index += 1;
  }
  return dirName;
}

async function persistTopic(vault: VaultState, rec: TopicRec): Promise<void> {
  const meta: TopicFileMeta = {
    id: rec.topic.id,
    title: rec.topic.title,
    description: rec.topic.description,
    favorite: rec.topic.isFavorite,
    createdAt: rec.topic.createdAt,
    updatedAt: rec.topic.updatedAt,
    lastOpenedAt: rec.topic.lastOpenedAt,
    connections: rec.links,
  };
  await writeVaultText(vault.root, rec.fileRel, serializeTopicFile(meta, rec.topic.content));
}

async function persistFolderMeta(vault: VaultState, rec: FolderRec): Promise<void> {
  const meta: FolderFileMeta = {
    id: rec.folder.id,
    createdAt: rec.folder.createdAt,
    updatedAt: rec.folder.updatedAt,
  };
  await writeVaultText(
    vault.root,
    `${rec.dirRel}/.kweb.json`,
    JSON.stringify(meta, null, 2)
  );
}

function retargetPaths(vault: VaultState, oldPrefix: string, newPrefix: string) {
  for (const rec of vault.folders.values()) {
    rec.dirRel = replacePrefix(rec.dirRel, oldPrefix, newPrefix);
  }
  for (const rec of vault.topics.values()) {
    rec.fileRel = replacePrefix(rec.fileRel, oldPrefix, newPrefix);
  }
}

function buildIndex(root: string, snapshot: VaultSnapshot): {
  vault: VaultState;
  folderWrites: FolderRec[];
  topicWrites: TopicRec[];
} {
  const folderMeta = new Map<string, FolderFileMeta>();
  for (const file of snapshot.files) {
    if (baseName(file.path) !== ".kweb.json") continue;
    const dir = parentDir(file.path);
    if (!dir || dir === ".kweb" || dir.startsWith(".kweb/")) continue;
    try {
      const parsed = JSON.parse(file.text) as Partial<FolderFileMeta>;
      if (parsed.id) {
        folderMeta.set(dir, {
          id: parsed.id,
          createdAt: parsed.createdAt ?? Date.now(),
          updatedAt: parsed.updatedAt ?? Date.now(),
        });
      }
    } catch {
      /* repaired below */
    }
  }

  const dirs = new Set<string>();
  for (const dir of snapshot.directories) {
    if (!dir || dir === ".kweb" || dir.startsWith(".kweb/")) continue;
    dirs.add(dir);
  }
  for (const dir of folderMeta.keys()) dirs.add(dir);
  for (const file of snapshot.files) {
    if (!file.path.endsWith(".md") || file.path.startsWith(".kweb/")) continue;
    const dir = parentDir(file.path);
    if (dir) dirs.add(dir);
  }

  const folderIdByDir = new Map<string, string>();
  const folderWrites: FolderRec[] = [];
  const folders = new Map<string, FolderRec>();

  for (const dir of dirs) {
    let meta = folderMeta.get(dir);
    let needsWrite = false;
    if (!meta?.id) {
      meta = {
        id: createId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      needsWrite = true;
    }
    folderIdByDir.set(dir, meta.id);
    const parentRel = parentDir(dir);
    const folder: Folder = {
      id: meta.id,
      name: baseName(dir),
      parentFolderId: parentRel ? folderIdByDir.get(parentRel) ?? null : null,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
    };
    const rec = { folder, dirRel: dir };
    folders.set(folder.id, rec);
    if (needsWrite) folderWrites.push(rec);
  }

  for (const rec of folders.values()) {
    const parentRel = parentDir(rec.dirRel);
    rec.folder.parentFolderId = parentRel ? folderIdByDir.get(parentRel) ?? null : null;
  }

  const topics = new Map<string, TopicRec>();
  const topicWrites: TopicRec[] = [];
  const usedIds = new Set<string>();

  for (const file of snapshot.files) {
    if (!file.path.endsWith(".md")) continue;
    if (file.path.startsWith(".kweb/") || file.path.includes("/.kweb/")) continue;
    const dir = parentDir(file.path);
    const folderId = dir ? folderIdByDir.get(dir) : undefined;
    if (!folderId) continue;

    const parsed = parseTopicFile(file.text);
    const stem = baseName(file.path).replace(/\.md$/i, "");
    const meta = parsed?.meta ?? {};
    let id = meta.id || createId();
    let needsWrite = !parsed || !meta.id;
    if (usedIds.has(id)) {
      id = createId();
      needsWrite = true;
    }
    usedIds.add(id);

    const links = normalizeLinks(meta.connections);
    const topic: Topic = {
      id,
      title: meta.title?.trim() || stem,
      description: meta.description?.trim() ?? "",
      content: parsed?.content ?? file.text,
      folderId,
      isFavorite: Boolean(meta.favorite),
      createdAt: meta.createdAt ?? Date.now(),
      updatedAt: meta.updatedAt ?? Date.now(),
      lastOpenedAt: meta.lastOpenedAt ?? null,
    };
    const rec = { topic, fileRel: file.path, links };
    topics.set(id, rec);
    if (needsWrite) topicWrites.push(rec);
  }

  return {
    vault: { root, folders, topics },
    folderWrites,
    topicWrites,
  };
}

export async function openVault(root: string): Promise<void> {
  await enqueue(async () => {
    const snapshot = await loadVaultSnapshot(root);
    const hasMarker = snapshot.files.some((file) => file.path === ".kweb/vault.json");
    if (!hasMarker) {
      await makeVaultDir(root, ".kweb");
      await writeVaultText(
        root,
        ".kweb/vault.json",
        JSON.stringify(VAULT_MARKER, null, 2)
      );
    }
    const built = buildIndex(root, snapshot);
    state = built.vault;
    for (const rec of built.folderWrites) {
      await persistFolderMeta(built.vault, rec);
    }
    for (const rec of built.topicWrites) {
      await persistTopic(built.vault, rec);
    }
    await setLastVault(root);
  });
}

export function closeVault(): void {
  state = null;
}

export async function createFolder(
  name: string,
  parentFolderId: string | null
): Promise<Folder> {
  return enqueue(async () => {
    const vault = requireVault();
    const parent = parentFolderId ? vault.folders.get(parentFolderId) : null;
    if (parentFolderId && !parent) throw new Error("Parent folder not found");
    const now = Date.now();
    const dirName = uniqueDirName(vault, parent?.dirRel ?? "", name, "");
    const dirRel = joinRel(parent?.dirRel ?? "", dirName);
    const folder: Folder = {
      id: createId(),
      name: dirName,
      parentFolderId,
      createdAt: now,
      updatedAt: now,
    };
    const rec: FolderRec = { folder, dirRel };
    await makeVaultDir(vault.root, dirRel);
    await persistFolderMeta(vault, rec);
    vault.folders.set(folder.id, rec);
    return folder;
  });
}

export async function updateFolder(
  id: string,
  updates: Partial<Pick<Folder, "name">>
): Promise<Folder> {
  return enqueue(async () => {
    const vault = requireVault();
    const rec = vault.folders.get(id);
    if (!rec) throw new Error("Folder not found");
    if (updates.name && updates.name.trim() && updates.name.trim() !== rec.folder.name) {
      const parentRel = parentDir(rec.dirRel);
      const dirName = uniqueDirName(vault, parentRel, updates.name, id);
      const newRel = joinRel(parentRel, dirName);
      if (newRel !== rec.dirRel) {
        await renameVaultPath(vault.root, rec.dirRel, newRel);
        const oldRel = rec.dirRel;
        retargetPaths(vault, oldRel, newRel);
        rec.folder.name = dirName;
      }
    }
    rec.folder.updatedAt = Date.now();
    await persistFolderMeta(vault, rec);
    return rec.folder;
  });
}

export async function deleteFolder(id: string): Promise<void> {
  return enqueue(async () => {
    const vault = requireVault();
    const rec = vault.folders.get(id);
    if (!rec) throw new Error("Folder not found");
    const hasChild = [...vault.folders.values()].some(
      (folder) => folder.folder.parentFolderId === id
    );
    if (hasChild) throw new Error("Folder has subfolders.");
    const hasTopic = [...vault.topics.values()].some(
      (topic) => topic.topic.folderId === id
    );
    if (hasTopic) throw new Error("Folder contains topics.");
    await removeVaultFile(vault.root, `${rec.dirRel}/.kweb.json`);
    await removeVaultDir(vault.root, rec.dirRel);
    vault.folders.delete(id);
  });
}

export async function moveFolder(id: string, newParentFolderId: string | null): Promise<Folder> {
  return enqueue(async () => {
    const vault = requireVault();
    const rec = vault.folders.get(id);
    if (!rec) throw new Error("Folder not found");
    if (newParentFolderId === id) throw new Error("Cannot move folder: would create a cycle.");
    let cursor = newParentFolderId;
    const seen = new Set<string>();
    while (cursor) {
      if (cursor === id) throw new Error("Cannot move folder: would create a cycle.");
      if (seen.has(cursor)) break;
      seen.add(cursor);
      cursor = vault.folders.get(cursor)?.folder.parentFolderId ?? null;
    }
    const parent = newParentFolderId ? vault.folders.get(newParentFolderId) : null;
    if (newParentFolderId && !parent) throw new Error("Parent folder not found");
    const newRel = joinRel(parent?.dirRel ?? "", baseName(rec.dirRel));
    if (newRel !== rec.dirRel) {
      const collision = [...vault.folders.values()].some(
        (folder) => folder.folder.id !== id && folder.dirRel.toLowerCase() === newRel.toLowerCase()
      );
      if (collision) throw new Error("A folder with that name already exists there.");
      await renameVaultPath(vault.root, rec.dirRel, newRel);
      retargetPaths(vault, rec.dirRel, newRel);
    }
    rec.folder.parentFolderId = newParentFolderId;
    rec.folder.updatedAt = Date.now();
    await persistFolderMeta(vault, rec);
    return rec.folder;
  });
}

export async function createTopic(
  title: string,
  folderId: string,
  description = ""
): Promise<Topic> {
  return enqueue(async () => {
    const vault = requireVault();
    const folder = vault.folders.get(folderId);
    if (!folder) throw new Error("Folder not found");
    const now = Date.now();
    const topic: Topic = {
      id: createId(),
      title: title.trim() || "Untitled",
      description: description.trim(),
      content: "",
      folderId,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: null,
    };
    const rec: TopicRec = {
      topic,
      fileRel: topicFileRel(vault, folder.dirRel, topic.title, topic.id),
      links: [],
    };
    await persistTopic(vault, rec);
    vault.topics.set(topic.id, rec);
    return topic;
  });
}

export async function updateTopic(
  id: string,
  updates: Partial<
    Pick<Topic, "title" | "description" | "content" | "isFavorite" | "folderId">
  >
): Promise<Topic> {
  return enqueue(async () => {
    const vault = requireVault();
    const rec = vault.topics.get(id);
    if (!rec) throw new Error("Topic not found");
    if (updates.title !== undefined) rec.topic.title = updates.title.trim() || "Untitled";
    if (updates.description !== undefined) rec.topic.description = updates.description.trim();
    if (updates.content !== undefined) rec.topic.content = updates.content;
    if (updates.isFavorite !== undefined) rec.topic.isFavorite = updates.isFavorite;
    if (updates.folderId && updates.folderId !== rec.topic.folderId) {
      if (!vault.folders.has(updates.folderId)) throw new Error("Folder not found");
      rec.topic.folderId = updates.folderId;
    }
    rec.topic.updatedAt = Date.now();

    const folder = vault.folders.get(rec.topic.folderId);
    if (!folder) throw new Error("Folder not found");
    const nextRel = topicFileRel(vault, folder.dirRel, rec.topic.title, rec.topic.id);
    if (nextRel !== rec.fileRel) {
      await renameVaultPath(vault.root, rec.fileRel, nextRel);
      rec.fileRel = nextRel;
    }
    await persistTopic(vault, rec);
    return rec.topic;
  });
}

export async function deleteTopic(id: string): Promise<void> {
  return enqueue(async () => {
    const vault = requireVault();
    const rec = vault.topics.get(id);
    if (!rec) return;
    await removeVaultFile(vault.root, rec.fileRel);
    vault.topics.delete(id);
    for (const other of vault.topics.values()) {
      const next = other.links.filter((link) => link.targetId !== id);
      if (next.length !== other.links.length) {
        other.links = next;
        await persistTopic(vault, other);
      }
    }
  });
}

export async function recordTopicOpen(id: string): Promise<Topic | undefined> {
  return enqueue(async () => {
    const vault = requireVault();
    const rec = vault.topics.get(id);
    if (!rec) return undefined;
    rec.topic.lastOpenedAt = Date.now();
    await persistTopic(vault, rec);
    return rec.topic;
  });
}

export function getTopicRecord(id: string): Topic | undefined {
  return state?.topics.get(id)?.topic;
}

export async function createConnection(
  sourceTopicId: string,
  targetTopicId: string,
  relationshipType: RelationshipType
): Promise<Connection> {
  return enqueue(async () => {
    const vault = requireVault();
    if (sourceTopicId === targetTopicId) {
      throw new Error("Cannot connect a topic to itself.");
    }
    const source = vault.topics.get(sourceTopicId);
    const target = vault.topics.get(targetTopicId);
    if (!source || !target) throw new Error("Topic not found");
    const exists = listConnections().some(
      (connection) =>
        (connection.sourceTopicId === sourceTopicId &&
          connection.targetTopicId === targetTopicId) ||
        (connection.sourceTopicId === targetTopicId &&
          connection.targetTopicId === sourceTopicId)
    );
    if (exists) throw new Error("Connection already exists.");
    const link: TopicLinkMeta = {
      id: createId(),
      targetId: targetTopicId,
      type: relationshipType ?? "related",
      createdAt: Date.now(),
    };
    source.links.push(link);
    await persistTopic(vault, source);
    return {
      id: link.id,
      sourceTopicId,
      targetTopicId,
      relationshipType: link.type,
      createdAt: link.createdAt,
    };
  });
}

export async function deleteConnection(id: string): Promise<void> {
  return enqueue(async () => {
    const vault = requireVault();
    for (const rec of vault.topics.values()) {
      const next = rec.links.filter((link) => link.id !== id);
      if (next.length !== rec.links.length) {
        rec.links = next;
        await persistTopic(vault, rec);
        return;
      }
    }
  });
}
