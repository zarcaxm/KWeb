"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, FileText, Folder as FolderIcon } from "lucide-react";
import type { FolderTreeNode } from "@/types/models";
import { useExpandedFoldersContext } from "@/components/folders/ExpandedFoldersContext";

interface FolderTreeProps {
  nodes: FolderTreeNode[];
  depth?: number;
  activeTopicId?: string;
  activeFolderId?: string;
}

function FolderTreeNodeItem({
  node,
  depth,
  activeTopicId,
  activeFolderId,
}: {
  node: FolderTreeNode;
  depth: number;
  activeTopicId?: string;
  activeFolderId?: string;
}) {
  const { isExpanded, toggle } = useExpandedFoldersContext();
  const expanded = isExpanded(node.folder.id);
  const hasChildren = node.children.length > 0 || node.topics.length > 0;
  const isActiveFolder = activeFolderId === node.folder.id;

  return (
    <li>
      <div
        className="flex items-center gap-0.5 rounded-md pr-1"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${node.folder.name}` : `Expand ${node.folder.name}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            onClick={() => toggle(node.folder.id)}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden />
            )}
          </button>
        ) : (
          <span className="w-8 shrink-0" aria-hidden />
        )}
        <Link
          href={`/folder?id=${node.folder.id}`}
          className={`flex min-h-[36px] flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${
            isActiveFolder ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-700"
          }`}
        >
          <FolderIcon className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
          <span className="truncate">{node.folder.name}</span>
        </Link>
      </div>
      {expanded && (
        <ul className="mt-0.5 space-y-0.5">
          {node.topics.map((topic) => (
            <li key={topic.id}>
              <Link
                href={`/topic?id=${topic.id}`}
                className={`flex min-h-[36px] items-center gap-2 rounded-md py-1.5 pr-2 text-sm hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${
                  activeTopicId === topic.id
                    ? "bg-neutral-100 font-medium text-neutral-900"
                    : "text-neutral-600"
                }`}
                style={{ paddingLeft: `${(depth + 1) * 12 + 36}px` }}
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
                <span className="truncate">{topic.title}</span>
              </Link>
            </li>
          ))}
          {node.children.map((child) => (
            <FolderTreeNodeItem
              key={child.folder.id}
              node={child}
              depth={depth + 1}
              activeTopicId={activeTopicId}
              activeFolderId={activeFolderId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function FolderTree({
  nodes,
  depth = 0,
  activeTopicId,
  activeFolderId,
}: FolderTreeProps) {
  if (nodes.length === 0) {
    return (
      <p className="px-3 py-2 text-sm text-neutral-500">No folders yet.</p>
    );
  }

  return (
    <ul className="space-y-0.5" role="tree" aria-label="Folders">
      {nodes.map((node) => (
        <FolderTreeNodeItem
          key={node.folder.id}
          node={node}
          depth={depth}
          activeTopicId={activeTopicId}
          activeFolderId={activeFolderId}
        />
      ))}
    </ul>
  );
}
