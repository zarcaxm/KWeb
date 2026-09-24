import Link from "next/link";
import type { Folder } from "@/types/models";

interface BreadcrumbsProps {
  folders: Folder[];
  currentLabel?: string;
}

export function Breadcrumbs({ folders, currentLabel }: BreadcrumbsProps) {
  if (folders.length === 0 && !currentLabel) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-neutral-500">
      <ol className="flex flex-wrap items-center gap-1">
        {folders.map((folder, index) => (
          <li key={folder.id} className="flex items-center gap-1">
            {index > 0 ? <span aria-hidden className="text-neutral-300">/</span> : null}
            <Link
              href={`/folder?id=${folder.id}`}
              className="rounded px-1 py-0.5 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            >
              {folder.name}
            </Link>
          </li>
        ))}
        {currentLabel ? (
          <li className="flex items-center gap-1">
            {folders.length > 0 ? (
              <span aria-hidden className="text-neutral-300">/</span>
            ) : null}
            <span className="text-neutral-900 font-medium" aria-current="page">
              {currentLabel}
            </span>
          </li>
        ) : null}
      </ol>
    </nav>
  );
}
