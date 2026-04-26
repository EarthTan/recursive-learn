import { getNodePath } from "./learning-tree";
import type { Concept, LearningNode } from "./types";

const MAX = 3;

type MinimalState = { concepts: Concept[]; nodes: LearningNode[] };

/**
 * Picks a small, stable set of concepts tied to the active path for the ask API
 * (design: top few candidates, not the full knowledge base).
 */
export function getRelatedConceptsForPath(
  state: MinimalState,
  activeNodeId: string
): Array<{ name: string; description: string | null }> {
  const path = getNodePath(state.nodes, activeNodeId);
  const used = new Set<string>();
  const out: Array<{ name: string; description: string | null }> = [];

  for (const p of path) {
    if (!p.linkedConceptId || used.has(p.linkedConceptId)) continue;
    const concept = state.concepts.find((c) => c.id === p.linkedConceptId);
    if (!concept) continue;
    used.add(p.linkedConceptId);
    out.push({ name: concept.name, description: concept.description });
    if (out.length >= MAX) break;
  }

  return out;
}
