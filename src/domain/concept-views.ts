import { buildConceptGraph } from "./concept-network";
import type { Concept, ConceptRelation, ConceptRelationLabel, LearningNode } from "./types";

export function listNodesLinkedToConcept(nodes: LearningNode[], conceptId: string): LearningNode[] {
  return nodes.filter((n) => n.linkedConceptId === conceptId);
}

export type RelatedConceptRow = {
  otherId: string;
  otherName: string;
  label: ConceptRelationLabel;
  direction: "outgoing" | "incoming";
};

export function getRelatedConceptRows(
  conceptId: string,
  concepts: Concept[],
  relations: ConceptRelation[]
): RelatedConceptRow[] {
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const rows: RelatedConceptRow[] = [];

  for (const r of relations) {
    if (r.sourceConceptId === conceptId) {
      const other = byId.get(r.targetConceptId);
      if (other) {
        rows.push({
          otherId: other.id,
          otherName: other.name,
          label: r.label,
          direction: "outgoing"
        });
      }
    } else if (r.targetConceptId === conceptId) {
      const other = byId.get(r.sourceConceptId);
      if (other) {
        rows.push({
          otherId: other.id,
          otherName: other.name,
          label: r.label,
          direction: "incoming"
        });
      }
    }
  }

  return rows;
}

export function getLocalNetworkGraph(conceptId: string, concepts: Concept[], relations: ConceptRelation[]) {
  const neighborIds = new Set<string>([conceptId]);
  for (const r of relations) {
    if (r.sourceConceptId === conceptId) neighborIds.add(r.targetConceptId);
    if (r.targetConceptId === conceptId) neighborIds.add(r.sourceConceptId);
  }
  const subset = concepts.filter((c) => neighborIds.has(c.id));
  const subsetIds = new Set(subset.map((c) => c.id));
  const rels = relations.filter((r) => subsetIds.has(r.sourceConceptId) && subsetIds.has(r.targetConceptId));
  return buildConceptGraph(subset, rels);
}
