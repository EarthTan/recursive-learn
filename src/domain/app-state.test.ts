import { describe, expect, it } from "vitest";
import { addChildNodeFromJustAsk, createInitialState, handleAskResult, setNodeMastery } from "./app-state";

describe("app state", () => {
  it("creates a topic, root node, and empty concept list", () => {
    const state = createInitialState("Transformer");
    expect(state.topics).toHaveLength(1);
    expect(state.nodes).toHaveLength(1);
    expect(state.activeNodeId).toBe(state.nodes[0].id);
    expect(state.concepts).toEqual([]);
  });

  it("adds a child node for create child mode", () => {
    const state = createInitialState("Transformer");
    const next = handleAskResult(state, {
      mode: "create_child_node",
      question: "Q/K/V 是什么？",
      output: {
        title: "Q/K/V",
        answer: "Answer",
        conceptCandidate: "Q/K/V",
        relatedConceptCandidates: []
      }
    });
    expect(next.nodes).toHaveLength(2);
    expect(next.activeNodeId).toBe(next.nodes[1].id);
    expect(next.concepts.some((concept) => concept.name === "Q/K/V")).toBe(true);
  });

  it("adds a child from just-ask Q&A without a second API call", () => {
    const state = createInitialState("Transformer");
    const rootId = state.nodes[0].id;
    const next = addChildNodeFromJustAsk(state, rootId, "What is X?", "X is Y", null);
    expect(next.nodes).toHaveLength(2);
    expect(next.activeNodeId).toBe(next.nodes[1].id);
    const child = next.nodes[1];
    expect(child.parentNodeId).toBe(rootId);
    expect(child.contentBlocks[0]).toMatchObject({
      question: "What is X?",
      answer: "X is Y"
    });
  });

  it("removes the promoted 随问 entry on the parent", () => {
    const state0 = createInitialState("Transformer");
    const withAsk = handleAskResult(state0, {
      mode: "just_ask",
      question: "What is X?",
      answer: "X is Y"
    });
    const rootId = withAsk.nodes[0].id;
    const entryId = withAsk.nodes[0].justAskEntries[0]!.id;
    const next = addChildNodeFromJustAsk(withAsk, rootId, "What is X?", "X is Y", entryId);
    expect(next.nodes[0].justAskEntries).toHaveLength(0);
  });

  it("just ask stores the exchange on the current node without changing map content or adding a child", () => {
    const state = createInitialState("Transformer");
    const next = handleAskResult(state, {
      mode: "just_ask",
      question: "Give an example",
      answer: "Example answer"
    });
    expect(next.nodes).toHaveLength(1);
    expect(next.nodes[0].contentBlocks).toHaveLength(1);
    expect(next.nodes[0].justAskEntries).toHaveLength(1);
    expect(next.nodes[0].justAskEntries[0]).toMatchObject({
      question: "Give an example",
      answer: "Example answer"
    });
  });

  it("updates mastery for a node by id", () => {
    const state = createInitialState("T");
    const id = state.nodes[0].id;
    const next = setNodeMastery(state, id, "mastered");
    expect(next.nodes[0].status).toBe("mastered");
  });

  it("adds concept relations for related candidates when creating a child", () => {
    const state = createInitialState("Transformer");
    const next = handleAskResult(state, {
      mode: "create_child_node",
      question: "Q/K/V?",
      output: {
        title: "Q/K/V",
        answer: "Answer",
        conceptCandidate: "Q/K/V",
        relatedConceptCandidates: [{ name: "Self-attention", relation: "part_of" }]
      }
    });
    const qk = next.concepts.find((c) => c.name === "Q/K/V");
    const sa = next.concepts.find((c) => c.name === "Self-attention");
    expect(qk).toBeDefined();
    expect(sa).toBeDefined();
    expect(next.conceptRelations).toHaveLength(1);
    expect(next.conceptRelations[0].sourceConceptId).toBe(qk!.id);
    expect(next.conceptRelations[0].targetConceptId).toBe(sa!.id);
    expect(next.conceptRelations[0].label).toBe("part_of");
  });
});
