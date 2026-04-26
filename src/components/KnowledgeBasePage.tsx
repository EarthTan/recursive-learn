"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AppState } from "@/domain/app-state";
import { buildConceptGraph } from "@/domain/concept-network";
import { getRelatedConceptRows } from "@/domain/concept-views";
import { ConceptNetworkGraph } from "./ConceptNetworkGraph";

export function KnowledgeBasePage({ state }: { state: AppState }) {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(state.concepts[0]?.id ?? null);

  const graph = useMemo(
    () => buildConceptGraph(state.concepts, state.conceptRelations),
    [state.concepts, state.conceptRelations]
  );

  const filteredNodes = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return graph.nodes;
    return graph.nodes.filter((n) => n.label.toLowerCase().includes(s));
  }, [graph.nodes, q]);

  const selected = state.concepts.find((c) => c.id === selectedId) ?? null;
  const related = selected
    ? getRelatedConceptRows(selected.id, state.concepts, state.conceptRelations)
    : [];

  return (
    <main className="knowledge-page">
      <h1>Knowledge Base</h1>
      <input
        type="search"
        aria-label="Search concepts"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter visible concepts in the list"
      />
      <div className="knowledge-page__body">
        <section aria-label="Concept network" className="network-canvas">
          <ConceptNetworkGraph graph={graph} />
          <div className="concept-pills" role="list">
            {filteredNodes.map((n) => {
              const isSel = n.id === selectedId;
              return (
                <button
                  type="button"
                  key={n.id}
                  className={["concept-pill", isSel ? "is-selected" : ""].join(" ")}
                  onClick={() => setSelectedId(n.id)}
                >
                  {n.label}
                </button>
              );
            })}
          </div>
        </section>
        <aside className="kb-side-panel" aria-label="Selected concept">
          {selected ? (
            <>
              <h2>{selected.name}</h2>
              <p>{selected.description ?? "No description."}</p>
              <h3>Related</h3>
              <ul>
                {related.map((row) => (
                  <li key={`${row.otherId}-${row.label}-${row.direction}`}>
                    <span className="kb-relation-tag">{row.label}</span>{" "}
                    {row.direction === "outgoing" ? "→" : "←"}{" "}
                    <Link href={`/concepts/${row.otherId}`}>{row.otherName}</Link>
                  </li>
                ))}
              </ul>
              {related.length === 0 ? <p className="muted">No relations yet.</p> : null}
              <p>
                <Link className="button-link" href={`/concepts/${selected.id}`}>
                  Open concept
                </Link>
              </p>
            </>
          ) : (
            <p className="muted">Select a concept to inspect.</p>
          )}
        </aside>
      </div>
    </main>
  );
}
