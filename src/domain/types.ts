export type NodeStatus = "unmastered" | "mastered";
export type AskMode = "create_child_node" | "just_ask";
export type ConceptRelationLabel = "related" | "part_of" | "uses" | "used_by";

export type Topic = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type NodeContentBlock = {
  id: string;
  question: string | null;
  answer: string;
  createdAt: string;
};

/** A one-off "just ask" Q&A on a node, kept separate from the node's map content. */
export type JustAskEntry = {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
};

export type LearningNode = {
  id: string;
  topicId: string;
  parentNodeId: string | null;
  linkedConceptId: string | null;
  title: string;
  contentBlocks: NodeContentBlock[];
  justAskEntries: JustAskEntry[];
  status: NodeStatus;
  createdAt: string;
  updatedAt: string;
};

export type Concept = {
  id: string;
  name: string;
  description: string | null;
  aliases: string[];
  createdAt: string;
  updatedAt: string;
};

export type ConceptRelation = {
  id: string;
  sourceConceptId: string;
  targetConceptId: string;
  label: ConceptRelationLabel;
};

export type CreateNodeOutput = {
  title: string;
  answer: string;
  conceptCandidate: string | null;
  relatedConceptCandidates: Array<{ name: string; relation: ConceptRelationLabel }>;
};
