import { findOrCreateConcept, upsertConceptRelations } from "./concept-network";
import {
  appendJustAskEntry,
  createChildNode,
  createPlaceholderChildNode,
  createTopicWithRoot,
  removeJustAskEntry,
  updateNodeStatus
} from "./learning-tree";
import { getRootNode } from "./topic-tree";
import type { Concept, ConceptRelation, CreateNodeOutput, LearningNode, NodeStatus, Topic } from "./types";

const nowIso = () => new Date().toISOString();

/** Transient UI for create-child streaming; not persisted to localStorage. */
export type CreateChildStreamUi =
  | { childId: string; phase: "thinking" }
  | { childId: string; phase: "streaming" }
  | null;

export type AppState = {
  topics: Topic[];
  nodes: LearningNode[];
  concepts: Concept[];
  conceptRelations: ConceptRelation[];
  activeTopicId: string;
  activeNodeId: string;
  createChildStreamUi: CreateChildStreamUi;
};

export function setCreateChildStreamUi(state: AppState, ui: CreateChildStreamUi): AppState {
  return { ...state, createChildStreamUi: ui };
}

export function setNodeMastery(state: AppState, nodeId: string, status: NodeStatus): AppState {
  return {
    ...state,
    nodes: state.nodes.map((node) =>
      node.id === nodeId ? updateNodeStatus(node, status) : node
    )
  };
}

export function setActiveNodeId(state: AppState, activeNodeId: string): AppState {
  return { ...state, activeNodeId };
}

/** 流式过程中一旦解析出最终标题，可先更新节点名（如 LLM 已写出标题行而正文未结束）。 */
export function setNodeTitle(state: AppState, nodeId: string, title: string): AppState {
  return {
    ...state,
    nodes: state.nodes.map((n) =>
      n.id === nodeId ? { ...n, title, updatedAt: nowIso() } : n
    )
  };
}

export function addPlaceholderChild(state: AppState, parentId: string, question: string): AppState {
  const { nodes, child } = createPlaceholderChildNode(state.nodes, parentId, question);
  return { ...state, nodes, activeNodeId: child.id };
}

export function replaceChildFirstBlockAnswer(state: AppState, childId: string, answer: string): AppState {
  return {
    ...state,
    nodes: state.nodes.map((node) => {
      if (node.id !== childId) return node;
      const b0 = node.contentBlocks[0];
      if (!b0) return node;
      return {
        ...node,
        contentBlocks: [{ ...b0, answer }, ...node.contentBlocks.slice(1)],
        updatedAt: nowIso()
      };
    })
  };
}

export function removePlaceholderChild(state: AppState, childId: string, parentId: string): AppState {
  return {
    ...state,
    nodes: state.nodes.filter((n) => n.id !== childId),
    activeNodeId: parentId,
    createChildStreamUi: null
  };
}

/**
 * Fills in title, final answer, and concept data on a child that was created as a placeholder.
 */
export function finalizeCreateChild(
  state: AppState,
  childId: string,
  question: string,
  output: CreateNodeOutput
): AppState {
  const child = state.nodes.find((n) => n.id === childId);
  if (!child) {
    throw new Error(`Missing child node ${childId}`);
  }

  const conceptResult = output.conceptCandidate
    ? findOrCreateConcept(state.concepts, output.conceptCandidate)
    : null;
  let nextConcepts = conceptResult?.created ? [...state.concepts, conceptResult.concept] : state.concepts;
  for (const c of output.relatedConceptCandidates) {
    const rel = findOrCreateConcept(nextConcepts, c.name);
    if (rel.created) nextConcepts = [...nextConcepts, rel.concept];
  }

  const sourceConceptId: string | null = conceptResult?.concept.id ?? null;

  let nextRelations = state.conceptRelations;
  if (sourceConceptId) {
    nextRelations = upsertConceptRelations(
      nextConcepts,
      state.conceptRelations,
      sourceConceptId,
      output.relatedConceptCandidates
    );
  }

  const b0 = child.contentBlocks[0];
  const updatedChild: LearningNode = {
    ...child,
    title: output.title,
    linkedConceptId: conceptResult?.concept.id ?? null,
    contentBlocks: b0
      ? [{ ...b0, question, answer: output.answer, createdAt: b0.createdAt }, ...child.contentBlocks.slice(1)]
      : child.contentBlocks,
    updatedAt: nowIso()
  };

  return {
    ...state,
    concepts: nextConcepts,
    conceptRelations: nextRelations,
    nodes: state.nodes.map((n) => (n.id === childId ? updatedChild : n)),
    activeNodeId: childId,
    createChildStreamUi: null
  };
}

/** Select a topic for the map and focus its root node. No-op if the topic is missing. */
export function setActiveTopicById(state: AppState, topicId: string): AppState {
  if (!state.topics.some((t) => t.id === topicId)) {
    return state;
  }
  if (state.activeTopicId === topicId) {
    return state;
  }
  const root = getRootNode(state.nodes, topicId);
  return {
    ...state,
    activeTopicId: topicId,
    activeNodeId: root?.id ?? state.activeNodeId
  };
}

export function createInitialState(topicTitle: string): AppState {
  const session = createTopicWithRoot(topicTitle, `Start learning ${topicTitle}.`);
  return {
    topics: [session.topic],
    nodes: session.nodes,
    concepts: [],
    conceptRelations: [],
    activeTopicId: session.topic.id,
    activeNodeId: session.activeNodeId,
    createChildStreamUi: null
  };
}

export function handleAskResult(
  state: AppState,
  input:
    | { mode: "create_child_node"; question: string; output: CreateNodeOutput }
    | { mode: "just_ask"; question: string; answer: string }
): AppState {
  const active = state.nodes.find((node) => node.id === state.activeNodeId);
  if (!active) throw new Error(`Missing active node ${state.activeNodeId}`);

  if (input.mode === "just_ask") {
    const updated = appendJustAskEntry(active, input.question, input.answer);
    return {
      ...state,
      nodes: state.nodes.map((node) => (node.id === active.id ? updated : node))
    };
  }

  const conceptResult = input.output.conceptCandidate
    ? findOrCreateConcept(state.concepts, input.output.conceptCandidate)
    : null;
  let nextConcepts = conceptResult?.created ? [...state.concepts, conceptResult.concept] : state.concepts;
  for (const c of input.output.relatedConceptCandidates) {
    const rel = findOrCreateConcept(nextConcepts, c.name);
    if (rel.created) nextConcepts = [...nextConcepts, rel.concept];
  }

  const sourceConceptId: string | null = conceptResult?.concept.id ?? null;

  let nextRelations = state.conceptRelations;
  if (sourceConceptId) {
    nextRelations = upsertConceptRelations(
      nextConcepts,
      state.conceptRelations,
      sourceConceptId,
      input.output.relatedConceptCandidates
    );
  }

  const generatedChild = createChildNode(active, input.output);
  const child = {
    ...generatedChild,
    linkedConceptId: conceptResult?.concept.id ?? null,
    contentBlocks: [{ ...generatedChild.contentBlocks[0], question: input.question }]
  };
  return {
    ...state,
    concepts: nextConcepts,
    conceptRelations: nextRelations,
    nodes: [...state.nodes, child],
    activeNodeId: child.id
  };
}

/**
 * New child with the just-ask Q&A as body (no API). Title is truncated from the question.
 * Removes the matching 随问 record on the parent so it cannot be promoted twice.
 */
export function addChildNodeFromJustAsk(
  state: AppState,
  parentId: string,
  question: string,
  answer: string,
  justAskEntryId: string | null
): AppState {
  const shortTitle = question.length > 52 ? `${question.slice(0, 49)}…` : question;
  const withChild = handleAskResult(
    { ...state, activeNodeId: parentId },
    {
      mode: "create_child_node",
      question,
      output: {
        title: shortTitle,
        answer,
        conceptCandidate: null,
        relatedConceptCandidates: []
      }
    }
  );
  const parent = withChild.nodes.find((n) => n.id === parentId);
  if (!parent) {
    return withChild;
  }
  let idToRemove = justAskEntryId;
  if (!idToRemove) {
    idToRemove =
      (parent.justAskEntries ?? []).find(
        (e) => e.question === question && e.answer === answer
      )?.id ?? null;
  }
  if (!idToRemove) {
    return withChild;
  }
  return {
    ...withChild,
    nodes: withChild.nodes.map((n) =>
      n.id === parentId ? removeJustAskEntry(n, idToRemove!) : n
    )
  };
}
