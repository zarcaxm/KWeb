"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Folder as FolderIcon } from "lucide-react";
import { TopicCard } from "@/components/topics/TopicCard";
import { Button } from "@/components/ui/Button";
import { useDb } from "@/lib/db/DbProvider";
import { useAsyncData } from "@/lib/hooks/useLiveQuery";
import { getConnectionCountsByTopicIds } from "@/lib/repositories/connectionRepository";
import { getFolderTree } from "@/lib/repositories/folderRepository";
import {
  getFavoriteTopics,
  getRecentTopics,
  getRecentlyUpdatedTopics,
} from "@/lib/repositories/topicRepository";
import { seedDevData } from "@/lib/seed/devSeed";
import { useMemo, useState } from "react";
import type { Topic } from "@/types/models";

export function HomeView() {
  const searchParams = useSearchParams();
  const showDev = searchParams.get("dev") === "1";
  const { refresh } = useDb();
  const [seeding, setSeeding] = useState(false);

  const { data: recent } = useAsyncData(() => getRecentTopics(5), []);
  const { data: updated } = useAsyncData(() => getRecentlyUpdatedTopics(5), []);
  const { data: favorites } = useAsyncData(() => getFavoriteTopics(), []);
  const { data: tree } = useAsyncData(getFolderTree, []);

  const continueTopic = recent?.[0];
  const topicIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of recent ?? []) ids.add(t.id);
    for (const t of updated ?? []) ids.add(t.id);
    for (const t of favorites ?? []) ids.add(t.id);
    return [...ids];
  }, [recent, updated, favorites]);

  const { data: connectionCounts } = useAsyncData(
    () => getConnectionCountsByTopicIds(topicIds),
    [topicIds.join(",")]
  );

  const rootFolders = tree ?? [];

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDevData();
      refresh();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div>
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Home</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Quick access to your knowledge workspace.
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          Cloud sync: put this vault folder inside Google Drive (or another sync client).
          KWeb reads and writes local files; Drive syncs the folder. Avoid editing the same
          topic on two devices at once. Folder names like{" "}
          <code className="text-xs">build</code>, <code className="text-xs">dist</code>,{" "}
          <code className="text-xs">out</code>, and <code className="text-xs">target</code>{" "}
          are ignored.
        </p>
        {showDev ? (
          <Button className="mt-4" variant="secondary" onClick={handleSeed} disabled={seeding}>
            Load sample data
          </Button>
        ) : null}
      </header>

      {continueTopic ? (
        <section className="mb-10" aria-labelledby="continue-heading">
          <h2 id="continue-heading" className="text-sm font-medium text-neutral-500">
            Continue learning
          </h2>
          <div className="mt-3">
            <TopicCard
              topic={continueTopic}
              connectionCount={connectionCounts?.get(continueTopic.id) ?? 0}
            />
          </div>
        </section>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-2">
        <TopicListSection
          title="Recently opened"
          topics={recent ?? []}
          connectionCounts={connectionCounts}
          empty="No recent topics yet."
        />
        <TopicListSection
          title="Recently updated"
          topics={updated ?? []}
          connectionCounts={connectionCounts}
          empty="No updates yet."
        />
      </div>

      <section className="mt-10" aria-labelledby="favorites-heading">
        <h2 id="favorites-heading" className="text-sm font-medium text-neutral-500">
          Favorites
        </h2>
        {favorites && favorites.length > 0 ? (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {favorites.map((topic) => (
              <li key={topic.id}>
                <TopicCard
                  topic={topic}
                  connectionCount={connectionCounts?.get(topic.id) ?? 0}
                  variant="list"
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-neutral-500">
            Star topics to pin them here.
          </p>
        )}
      </section>

      <section className="mt-10" aria-labelledby="folders-heading">
        <h2 id="folders-heading" className="text-sm font-medium text-neutral-500">
          Folders
        </h2>
        {rootFolders.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            Create a folder from the sidebar to organize topics.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {rootFolders.map((node) => (
              <li key={node.folder.id}>
                <Link
                  href={`/folder?id=${node.folder.id}`}
                  className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 hover:border-neutral-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                >
                  <FolderIcon className="mt-0.5 h-5 w-5 text-neutral-400" aria-hidden />
                  <div>
                    <div className="font-medium text-neutral-900">{node.folder.name}</div>
                    <div className="text-sm text-neutral-500">
                      {node.topics.length} topics
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TopicListSection({
  title,
  topics,
  connectionCounts,
  empty,
}: {
  title: string;
  topics: Topic[];
  connectionCounts?: Map<string, number>;
  empty: string;
}) {
  return (
    <section aria-labelledby={title}>
      <h2 id={title} className="text-sm font-medium text-neutral-500">{title}</h2>
      {topics.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {topics.map((topic) => (
            <li key={topic.id} className="px-4">
              <TopicCard
                topic={topic}
                connectionCount={connectionCounts?.get(topic.id) ?? 0}
                variant="list"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
