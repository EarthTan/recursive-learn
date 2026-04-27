import { getNodePath } from "./learning-tree";
import type { AskMode, LearningNode, Topic } from "./types";

export type AskContext = {
  topicTitle: string;
  mode: AskMode;
  /** Root → … → current node, each with full `contentBlocks`. */
  pathNodes: LearningNode[];
  path: Array<{ id: string; title: string }>;
  activeNode: LearningNode;
  question: string;
  relatedConcepts: Array<{ name: string; description: string | null }>;
};

export function buildAskContext(input: {
  topic: Topic;
  nodes: LearningNode[];
  activeNodeId: string;
  question: string;
  mode: AskMode;
  relatedConcepts: Array<{ name: string; description: string | null }>;
}): AskContext {
  const pathNodes = getNodePath(input.nodes, input.activeNodeId);
  const activeNode = pathNodes[pathNodes.length - 1];
  if (!activeNode) throw new Error(`Missing active node ${input.activeNodeId}`);
  return {
    topicTitle: input.topic.title,
    mode: input.mode,
    pathNodes,
    path: pathNodes.map((node) => ({ id: node.id, title: node.title })),
    activeNode,
    question: input.question,
    relatedConcepts: input.relatedConcepts
  };
}
