import type { LearningNode } from "./types";

export function getRootNode(nodes: LearningNode[], topicId: string): LearningNode | undefined {
  return nodes.find((n) => n.topicId === topicId && n.parentNodeId === null);
}

export function getChildrenOf(
  nodes: LearningNode[],
  topicId: string,
  parentId: string | null
): LearningNode[] {
  return nodes.filter((n) => n.topicId === topicId && n.parentNodeId === parentId);
}

export function orderNodesDepthFirst(nodes: LearningNode[], topicId: string): LearningNode[] {
  const root = getRootNode(nodes, topicId);
  if (!root) return [];

  const out: LearningNode[] = [];

  function walk(node: LearningNode) {
    out.push(node);
    const children = getChildrenOf(nodes, topicId, node.id).slice().sort((a, b) => a.title.localeCompare(b.title));
    for (const child of children) {
      walk(child);
    }
  }

  walk(root);
  return out;
}

export function matchesNodeFilter(node: LearningNode, filter: "all" | "unmastered" | "mastered"): boolean {
  if (filter === "all") return true;
  if (filter === "unmastered") return node.status === "unmastered";
  return node.status === "mastered";
}
