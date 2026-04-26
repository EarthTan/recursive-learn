import { describe, expect, it } from "vitest";
import "./types";
import type { Concept, LearningNode, NodeStatus } from "./types";

describe("domain types", () => {
  it("keeps mastery state on learning nodes only", () => {
    const status: NodeStatus = "mastered";
    const node: LearningNode = {
      id: "node_1",
      topicId: "topic_1",
      parentNodeId: null,
      linkedConceptId: "concept_1",
      title: "Q/K/V",
      contentBlocks: [{ id: "block_1", question: null, answer: "Root answer", createdAt: "2026-04-26T00:00:00.000Z" }],
      status,
      createdAt: "2026-04-26T00:00:00.000Z",
      updatedAt: "2026-04-26T00:00:00.000Z"
    };
    const concept: Concept = {
      id: "concept_1",
      name: "Self-attention",
      description: null,
      aliases: [],
      createdAt: "2026-04-26T00:00:00.000Z",
      updatedAt: "2026-04-26T00:00:00.000Z"
    };

    expect(node.status).toBe("mastered");
    expect("status" in concept).toBe(false);
  });
});
