export type NodeStatus = "unmastered" | "mastered";
export type AskMode = "create_child_node" | "continue_here";
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

export type LearningNode = {
  id: string;
  topicId: string;
  parentNodeId: string | null;
  linkedConceptId: string | null;
  title: string;
  contentBlocks: NodeContentBlock[];
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

export type ContinueNodeOutput = {
  answer: string;
  conceptCandidate: string | null;
  relatedConceptCandidates: Array<{ name: string; relation: ConceptRelationLabel }>;
};
