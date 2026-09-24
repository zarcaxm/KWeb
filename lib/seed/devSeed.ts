import { createConnection } from "@/lib/repositories/connectionRepository";
import { createFolder } from "@/lib/repositories/folderRepository";
import { createTopic, updateTopic } from "@/lib/repositories/topicRepository";

export async function seedDevData(): Promise<void> {
  const programming = await createFolder("Programming");
  const ai = await createFolder("Artificial Intelligence", programming.id);
  const languages = await createFolder("Languages");
  const history = await createFolder("History");

  const ml = await createTopic(
    "Machine Learning",
    ai.id,
    "Learning from data to make predictions."
  );
  await updateTopic(ml.id, {
    content:
      "## Overview\n\nMachine learning is a subset of AI focused on learning patterns from data.\n\n- Supervised learning\n- Unsupervised learning\n- Reinforcement learning",
  });

  const aiTopic = await createTopic(
    "Artificial Intelligence",
    ai.id,
    "Machines performing tasks associated with intelligence."
  );

  const german = await createTopic(
    "German Grammar",
    languages.id,
    "Cases, articles, and sentence structure."
  );

  const roman = await createTopic(
    "Roman Empire",
    history.id,
    "From Republic to Empire and its legacy."
  );

  await createConnection(ml.id, aiTopic.id, "subtopic");
  await createConnection(german.id, roman.id, "related");
}
