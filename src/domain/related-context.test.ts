import { describe, expect, it } from "vitest";
import { getRelatedConceptsForPath } from "./related-context";
import type { Concept, LearningNode } from "./types";

function node(overrides: Partial<LearningNode> & Pick<LearningNode, "id" | "topicId" | "parentNodeId">): LearningNode {
  return {
    title: "T",
    linkedConceptId: null,
    contentBlocks: [],
    justAskEntries: [],
    status: "unmastered",
    createdAt: "x",
    updatedAt: "x",
    ...overrides
  } as LearningNode;
}

describe("getRelatedConceptsForPath", () => {
  it("returns up to three concepts linked to nodes on the path with name and description", () => {
    const concepts: Concept[] = [
      {
        id: "c1",
        name: "Alpha",
        description: "d1",
        aliases: [],
        createdAt: "x",
        updatedAt: "x"
      },
      {
        id: "c2",
        name: "Beta",
        description: null,
        aliases: [],
        createdAt: "x",
        updatedAt: "x"
      }
    ];
    const nodes: LearningNode[] = [
      node({ id: "n1", topicId: "t1", parentNodeId: null, linkedConceptId: "c1" }),
      node({ id: "n2", topicId: "t1", parentNodeId: "n1", linkedConceptId: "c2" })
    ];

    const ctx = getRelatedConceptsForPath({ concepts, nodes }, "n2");

    expect(ctx).toEqual([
      { name: "Alpha", description: "d1" },
      { name: "Beta", description: null }
    ]);
  });

  it("caps the list at three concepts", () => {
    const concepts: Concept[] = [1, 2, 3, 4].map((i) => ({
      id: `c${i}`,
      name: `C${i}`,
      description: null,
      aliases: [],
      createdAt: "x",
      updatedAt: "x"
    }));
    const nodes: LearningNode[] = [1, 2, 3, 4].map((i, idx) =>
      node({
        id: `n${i}`,
        topicId: "t1",
        parentNodeId: idx === 0 ? null : `n${[1, 2, 3, 4][idx - 1]}`,
        linkedConceptId: `c${i}`
      })
    );

    const ctx = getRelatedConceptsForPath({ concepts, nodes }, "n4");

    expect(ctx).toHaveLength(3);
    expect(ctx.map((c) => c.name)).toEqual(["C1", "C2", "C3"]);
  });
});
