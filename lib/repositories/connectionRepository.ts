import {
  createConnection as createVaultConnection,
  deleteConnection as deleteVaultConnection,
  getTopicRecord,
  listConnections,
} from "@/lib/vault/engine";
import type { Connection, RelationshipType, Topic } from "@/types/models";

export interface TopicConnectionView {
  connection: Connection;
  topic: Topic;
  direction: "outgoing" | "incoming";
}

export async function createConnection(
  sourceTopicId: string,
  targetTopicId: string,
  relationshipType: RelationshipType = "related"
): Promise<Connection> {
  return createVaultConnection(sourceTopicId, targetTopicId, relationshipType);
}

export async function deleteConnection(id: string): Promise<void> {
  await deleteVaultConnection(id);
}

export async function getConnectionsForTopic(
  topicId: string
): Promise<TopicConnectionView[]> {
  const views: TopicConnectionView[] = [];
  for (const connection of listConnections()) {
    if (connection.sourceTopicId === topicId) {
      const topic = getTopicRecord(connection.targetTopicId);
      if (topic) views.push({ connection, topic, direction: "outgoing" });
    } else if (connection.targetTopicId === topicId) {
      const topic = getTopicRecord(connection.sourceTopicId);
      if (topic) views.push({ connection, topic, direction: "incoming" });
    }
  }
  views.sort((a, b) =>
    a.topic.title.localeCompare(b.topic.title, undefined, { sensitivity: "base" })
  );
  return views;
}

export async function countConnectionsForTopic(topicId: string): Promise<number> {
  return listConnections().filter(
    (connection) =>
      connection.sourceTopicId === topicId || connection.targetTopicId === topicId
  ).length;
}

export async function getConnectionCountsByTopicIds(
  topicIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const id of topicIds) counts.set(id, 0);
  for (const connection of listConnections()) {
    if (counts.has(connection.sourceTopicId)) {
      counts.set(
        connection.sourceTopicId,
        (counts.get(connection.sourceTopicId) ?? 0) + 1
      );
    }
    if (counts.has(connection.targetTopicId)) {
      counts.set(
        connection.targetTopicId,
        (counts.get(connection.targetTopicId) ?? 0) + 1
      );
    }
  }
  return counts;
}
