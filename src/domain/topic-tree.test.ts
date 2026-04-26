import { describe, expect, it } from "vitest";
import { getChildrenOf, getRootNode, orderNodesDepthFirst } from "./topic-tree";
import type { LearningNode } from "./types";

function node(overrides: Partial<LearningNode> & Pick<LearningNode, "id" | "topicId" | "parentNodeId">): LearningNode {
  return {
    title: "T",
    linkedConceptId: null,
    contentBlocks: [],
    status: "unmastered",
    createdAt: "x",
    updatedAt: "x",
    ...overrides
  } as LearningNode;
}

describe("topic tree helpers", () => {
  it("finds the root node for a topic", () => {
    const nodes: LearningNode[] = [
      node({ id: "r", topicId: "t1", parentNodeId: null, title: "Root" }),
      node({ id: "c", topicId: "t1", parentNodeId: "r", title: "Child" })
    ];
    expect(getRootNode(nodes, "t1")?.id).toBe("r");
  });

  it("lists children for a parent id", () => {
    const nodes: LearningNode[] = [
      node({ id: "r", topicId: "t1", parentNodeId: null }),
      node({ id: "a", topicId: "t1", parentNodeId: "r", title: "A" }),
      node({ id: "b", topicId: "t1", parentNodeId: "r", title: "B" })
    ];
    const kids = getChildrenOf(nodes, "t1", "r");
    expect(kids.map((k) => k.title).sort()).toEqual(["A", "B"]);
  });

  it("orders nodes depth-first from the topic root", () => {
    const nodes: LearningNode[] = [
      node({ id: "r", topicId: "t1", parentNodeId: null, title: "R" }),
      node({ id: "a", topicId: "t1", parentNodeId: "r", title: "A" }),
      node({ id: "b", topicId: "t1", parentNodeId: "r", title: "B" }),
      node({ id: "a1", topicId: "t1", parentNodeId: "a", title: "A1" })
    ];
    expect(orderNodesDepthFirst(nodes, "t1").map((n) => n.title)).toEqual(["R", "A", "A1", "B"]);
  });
});
