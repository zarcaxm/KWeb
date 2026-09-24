export type RelationshipType =
  | "related"
  | "parent"
  | "subtopic"
  | "prerequisite"
  | "builds_on"
  | "example"
  | null;

export interface Folder {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  content: string;
  folderId: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number | null;
}

export interface Connection {
  id: string;
  sourceTopicId: string;
  targetTopicId: string;
  relationshipType: RelationshipType;
  createdAt: number;
}

export interface FolderTreeNode {
  folder: Folder;
  children: FolderTreeNode[];
  topics: Topic[];
}

export const RELATIONSHIP_LABELS: Record<
  NonNullable<RelationshipType>,
  string
> = {
  related: "Related",
  parent: "Parent",
  subtopic: "Subtopic",
  prerequisite: "Prerequisite",
  builds_on: "Builds on",
  example: "Example",
};
