"use client";

import Link from "next/link";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useDb } from "@/lib/db/DbProvider";
import { deleteConnection } from "@/lib/repositories/connectionRepository";
import type { TopicConnectionView } from "@/lib/repositories/connectionRepository";
import { RELATIONSHIP_LABELS } from "@/types/models";

interface RelatedTopicsProps {
  connections: TopicConnectionView[];
  onAdd: () => void;
  onCreate: () => void;
}

function relationshipLabel(view: TopicConnectionView): string | null {
  const type = view.connection.relationshipType;
  if (!type || type === "related") return null;
  if (view.direction === "incoming" && type === "subtopic") return "Parent";
  if (view.direction === "incoming" && type === "parent") return "Subtopic";
  return RELATIONSHIP_LABELS[type];
}

export function RelatedTopics({ connections, onAdd, onCreate }: RelatedTopicsProps) {
  const { refresh } = useDb();

  const handleRemove = async (connectionId: string) => {
    await deleteConnection(connectionId);
    refresh();
  };

  return (
    <section className="mt-10 border-t border-neutral-200 pt-8" aria-labelledby="related-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="related-heading" className="text-sm font-medium text-neutral-500">
          Related topics
        </h2>
        <div className="flex flex-wrap gap-1">
          <Button variant="ghost" className="text-sm" onClick={onCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Create related
          </Button>
          <Button variant="ghost" className="text-sm" onClick={onAdd}>
            Link existing
          </Button>
        </div>
      </div>
      {connections.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">
          No connections yet. Create a related topic or link one that already exists.
        </p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {connections.map((view) => {
            const label = relationshipLabel(view);
            return (
              <li key={view.connection.id}>
                <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50">
                  <Link
                    href={`/topic?id=${view.topic.id}`}
                    className="rounded-l-full px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                  >
                    {view.topic.title}
                    {label ? (
                      <span className="ml-1.5 text-xs font-normal text-neutral-500">
                        · {label}
                      </span>
                    ) : null}
                  </Link>
                  <button
                    type="button"
                    className="rounded-r-full px-2 py-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                    aria-label={`Remove connection to ${view.topic.title}`}
                    onClick={() => handleRemove(view.connection.id)}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
