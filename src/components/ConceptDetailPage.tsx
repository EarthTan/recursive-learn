"use client";

import Link from "next/link";
import type { AppState } from "@/domain/app-state";
import { getNodePath } from "@/domain/learning-tree";
import {
  getLocalNetworkGraph,
  getRelatedConceptRows,
  listNodesLinkedToConcept
} from "@/domain/concept-views";
import { ConceptNetworkGraph } from "./ConceptNetworkGraph";

export function ConceptDetailPage({ state, conceptId }: { state: AppState; conceptId: string }) {
  const concept = state.concepts.find((c) => c.id === conceptId);
  if (!concept) {
    return <main className="concept-page">Concept not found</main>;
  }

  const related = getRelatedConceptRows(concept.id, state.concepts, state.conceptRelations);
  const linkedNodes = listNodesLinkedToConcept(state.nodes, concept.id);
  const topicTitles = new Map(state.topics.map((t) => [t.id, t.title]));
  const localGraph = getLocalNetworkGraph(concept.id, state.concepts, state.conceptRelations);
  const appearsInTopicIds = new Set(linkedNodes.map((n) => n.topicId));

  return (
    <main className="concept-page">
      <p>
        <Link href="/knowledge-base">Back to Knowledge Base</Link>
      </p>
      <h1>{concept.name}</h1>
      <p className="concept-page__description">{concept.description ?? "No description yet."}</p>
      {concept.aliases.length > 0 ? (
        <p className="concept-page__aliases">
          <span className="muted">Aliases: </span>
          {concept.aliases.join(", ")}
        </p>
      ) : null}
      <section>
        <h2>Appears in topics</h2>
        <ul>
          {[...appearsInTopicIds].map((id) => (
            <li key={id}>{topicTitles.get(id) ?? id}</li>
          ))}
        </ul>
        {appearsInTopicIds.size === 0 ? <p className="muted">Not linked to a node yet.</p> : null}
      </section>
      <section>
        <h2>Linked learning nodes</h2>
        <ul>
          {linkedNodes.map((n) => {
            const path = getNodePath(state.nodes, n.id);
            const pathLabel = path.map((p) => p.title).join(" / ");
            return (
              <li key={n.id}>
                <Link href={`/nodes/${n.id}`}>{n.title}</Link>
                <div className="muted path-line">{pathLabel}</div>
              </li>
            );
          })}
        </ul>
        {linkedNodes.length === 0 ? <p className="muted">No nodes use this concept.</p> : null}
      </section>
      <section>
        <h2>Related concepts</h2>
        <ul>
          {related.map((row) => (
            <li key={`${row.otherId}-${row.label}-${row.direction}`}>
              <span className="kb-relation-tag">{row.label}</span> {row.direction === "outgoing" ? "→" : "←"}{" "}
              <Link href={`/concepts/${row.otherId}`}>{row.otherName}</Link>
            </li>
          ))}
        </ul>
      </section>
      <aside aria-label="Local network preview">
        <h2>Local network preview</h2>
        <div className="local-network">
          <ConceptNetworkGraph graph={localGraph} />
        </div>
      </aside>
    </main>
  );
}
