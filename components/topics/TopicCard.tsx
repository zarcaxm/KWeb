import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils/dates";
import type { Topic } from "@/types/models";

interface TopicCardProps {
  topic: Topic;
  connectionCount?: number;
  variant?: "grid" | "list";
}

export function TopicCard({
  topic,
  connectionCount = 0,
  variant = "grid",
}: TopicCardProps) {
  const relatedLabel =
    connectionCount === 1
      ? "1 related topic"
      : `${connectionCount} related topics`;

  if (variant === "list") {
    return (
      <Link
        href={`/topic?id=${topic.id}`}
        className="flex flex-col gap-1.5 py-4 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-900"
      >
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold text-neutral-900">
            {topic.title}
          </h3>
          {topic.description ? (
            <p className="mt-0.5 truncate text-sm text-neutral-600">{topic.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
          <span>{relatedLabel}</span>
          <span>Updated {formatRelativeTime(topic.updatedAt)}</span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/topic?id=${topic.id}`}
      className="flex h-full flex-col rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
    >
      <h3 className="break-words text-lg font-semibold text-neutral-900">{topic.title}</h3>
      {topic.description ? (
        <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{topic.description}</p>
      ) : (
        <p className="mt-2 text-sm text-neutral-400 italic">No description</p>
      )}
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
        <span>{relatedLabel}</span>
        <span>Updated {formatRelativeTime(topic.updatedAt)}</span>
      </div>
    </Link>
  );
}
