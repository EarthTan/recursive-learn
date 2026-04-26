import { describe, expect, it } from "vitest";
import {
  getLocalNetworkGraph,
  getRelatedConceptRows,
  listNodesLinkedToConcept
} from "./concept-views";
import type { Concept, ConceptRelation, LearningNode, Topic } from "./types";

describe("concept view helpers", () => {
  const concepts: Concept[] = [
    { id: "a", name: "A", description: null, aliases: [], createdAt: "x", updatedAt: "x" },
    { id: "b", name: "B", description: null, aliases: [], createdAt: "x", updatedAt: "x" }
  ];
  const relations: ConceptRelation[] = [
    { id: "r1", sourceConceptId: "a", targetConceptId: "b", label: "uses" }
  ];
  const topics: Topic[] = [{ id: "t1", title: "T1", createdAt: "x", updatedAt: "x" }];
  const nodes: LearningNode[] = [
    {
      id: "n1",
      topicId: "t1",
      parentNodeId: null,
      linkedConceptId: "a",
      title: "N1",
      contentBlocks: [],
      status: "unmastered",
      createdAt: "x",
      updatedAt: "x"
    }
  ];

  it("lists learning nodes that reference a concept", () => {
    expect(listNodesLinkedToConcept(nodes, "a").map((n) => n.id)).toEqual(["n1"]);
    expect(listNodesLinkedToConcept(nodes, "b")).toHaveLength(0);
  });

  it("builds related concept rows for a concept id", () => {
    const rows = getRelatedConceptRows("a", concepts, relations);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ otherName: "B", label: "uses", direction: "outgoing" });
  });

  it("builds a local network graph for neighborhood preview", () => {
    const g = getLocalNetworkGraph("a", concepts, relations);
    expect(g.nodes.map((n) => n.id).sort()).toEqual(["a", "b"]);
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0].label).toBe("uses");
  });
});
