import type { RelationshipType } from "@/types/models";

/**
 * On-disk vault format.
 *
 * A vault is a normal folder. Knowledge is files, so a later cloud sync
 * can synchronize the folder itself (each topic file is independent).
 *
 * Vault/
 *   .kweb/vault.json          marker { version, format }
 *   Programming/.kweb.json    stable folder id
 *   Programming/Topic Name.md JSON frontmatter + markdown body
 */

export interface TopicLinkMeta {
  id: string;
  targetId: string;
  type: RelationshipType;
  createdAt: number;
}

export interface TopicFileMeta {
  id: string;
  title: string;
  description: string;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number | null;
  connections: TopicLinkMeta[];
}

export interface FolderFileMeta {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export interface VaultMarker {
  version: 1;
  format: "kweb-vault";
}

export const VAULT_MARKER: VaultMarker = {
  version: 1,
  format: "kweb-vault",
};

const RELATIONSHIP_TYPES = new Set<string>([
  "related",
  "parent",
  "subtopic",
  "prerequisite",
  "builds_on",
  "example",
]);

export function serializeTopicFile(meta: TopicFileMeta, content: string): string {
  const body = content.replace(/^\n+/, "");
  return `---\n${JSON.stringify(meta, null, 2)}\n---\n\n${body}`;
}

export function parseTopicFile(raw: string): {
  meta: Partial<TopicFileMeta>;
  content: string;
} | null {
  if (!raw.startsWith("---")) return null;
  const start = raw.indexOf("\n");
  if (start < 0) return null;
  const end = raw.indexOf("\n---", start);
  if (end < 0) return null;
  const jsonText = raw.slice(start + 1, end).trim();
  try {
    const meta = JSON.parse(jsonText) as Partial<TopicFileMeta>;
    let content = raw.slice(end + 4);
    if (content.startsWith("\n")) content = content.slice(1);
    if (content.startsWith("\n")) content = content.slice(1);
    return { meta, content };
  } catch {
    return null;
  }
}

export function normalizeLinks(value: unknown): TopicLinkMeta[] {
  if (!Array.isArray(value)) return [];
  const links: TopicLinkMeta[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const link = item as Partial<TopicLinkMeta>;
    if (!link.id || !link.targetId) continue;
    const type =
      link.type && RELATIONSHIP_TYPES.has(link.type) ? link.type : "related";
    links.push({
      id: link.id,
      targetId: link.targetId,
      type,
      createdAt: typeof link.createdAt === "number" ? link.createdAt : Date.now(),
    });
  }
  return links;
}

const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export function safeFileStem(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();
  const stem = cleaned || "Untitled";
  return RESERVED.test(stem) ? `${stem}_` : stem;
}

export function parentDir(relativePath: string): string {
  const index = relativePath.lastIndexOf("/");
  return index === -1 ? "" : relativePath.slice(0, index);
}

export function baseName(relativePath: string): string {
  const index = relativePath.lastIndexOf("/");
  return index === -1 ? relativePath : relativePath.slice(index + 1);
}

export function joinRel(...parts: string[]): string {
  return parts.filter(Boolean).join("/");
}

export function replacePrefix(path: string, oldPrefix: string, newPrefix: string): string {
  if (path === oldPrefix) return newPrefix;
  const prefix = `${oldPrefix}/`;
  if (path.startsWith(prefix)) return `${newPrefix}/${path.slice(prefix.length)}`;
  return path;
}
