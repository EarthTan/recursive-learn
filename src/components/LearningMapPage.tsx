"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AppState } from "@/domain/app-state";
import { setActiveNodeId, setNodeMastery } from "@/domain/app-state";
import { getChildrenOf, getRootNode, matchesNodeFilter, orderNodesDepthFirst } from "@/domain/topic-tree";
import type { LearningNode } from "@/domain/types";

export function LearningMapPage({
  state,
  onStateChange
}: {
  state: AppState;
  onStateChange: (state: AppState) => void;
}) {
  const topic = state.topics.find((t) => t.id === state.activeTopicId) ?? state.topics[0];
  const [filter, setFilter] = useState<"all" | "unmastered" | "mastered">("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(state.activeNodeId);

  const ordered = useMemo(
    () => (topic ? orderNodesDepthFirst(state.nodes, topic.id) : []),
    [state.nodes, topic]
  );
  const visible = useMemo(() => {
    return ordered.filter(
      (n) =>
        matchesNodeFilter(n, filter) && n.title.toLowerCase().includes(q.trim().toLowerCase())
    );
  }, [ordered, filter, q]);

  const selected = state.nodes.find((n) => n.id === selectedId) ?? state.nodes[0];
  const parent =
    selected?.parentNodeId && topic
      ? state.nodes.find((n) => n.id === selected.parentNodeId)
      : null;
  const childCount =
    topic && selected ? getChildrenOf(state.nodes, topic.id, selected.id).length : 0;
  const linkedName =
    selected?.linkedConceptId && state.concepts.find((c) => c.id === selected.linkedConceptId);

  if (!topic) {
    return <main className="map-page">No topic in session.</main>;
  }

  return (
    <main className="map-page">
      <h1>{topic.title}</h1>
      <input
        type="search"
        aria-label="Search nodes"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter nodes"
      />
      <div className="segmented" role="group" aria-label="Node filters">
        <button type="button" className={filter === "all" ? "is-active" : undefined} onClick={() => setFilter("all")}>
          All
        </button>
        <button
          type="button"
          className={filter === "unmastered" ? "is-active" : undefined}
          onClick={() => setFilter("unmastered")}
        >
          Unmastered
        </button>
        <button
          type="button"
          className={filter === "mastered" ? "is-active" : undefined}
          onClick={() => setFilter("mastered")}
        >
          Mastered
        </button>
      </div>
      <div className="map-page__body">
        <section className="tree-canvas" aria-label="Topic tree">
          <ul className="tree-list">
            {visible.map((n) => (
              <li key={n.id} style={{ marginLeft: depthForNode(n, state.nodes, topic.id) * 20 }}>
                <button
                  type="button"
                  className={["map-node-card", n.id === selectedId ? "is-selected" : ""].join(" ")}
                  onClick={() => {
                    setSelectedId(n.id);
                    onStateChange(setActiveNodeId(state, n.id));
                  }}
                >
                  {n.title}
                  <span className="map-node-card__status">
                    {n.status === "mastered" ? "Mastered" : "Unmastered"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        {selected ? (
          <aside className="map-side-panel" aria-label="Selected node">
            <h2>Selected</h2>
            <p>
              <strong>{selected.title}</strong>
            </p>
            <p>Status: {selected.status === "mastered" ? "Mastered" : "Unmastered"}</p>
            <p>Parent: {parent ? parent.title : "—"}</p>
            <p>Children: {childCount}</p>
            <p>Linked concept: {linkedName ? linkedName.name : "—"}</p>
            <div className="segmented" role="group" aria-label="Mastery (selection)">
              <button
                type="button"
                className={selected.status === "unmastered" ? "is-active" : undefined}
                onClick={() => onStateChange(setNodeMastery(state, selected.id, "unmastered"))}
              >
                Unmastered
              </button>
              <button
                type="button"
                className={selected.status === "mastered" ? "is-active" : undefined}
                onClick={() => onStateChange(setNodeMastery(state, selected.id, "mastered"))}
              >
                Mastered
              </button>
            </div>
            <p>
              <Link className="button-link" href={`/nodes/${selected.id}`}>
                Open node
              </Link>
            </p>
          </aside>
        ) : null}
      </div>
    </main>
  );
}

function depthForNode(node: LearningNode, nodes: LearningNode[], topicId: string): number {
  const root = getRootNode(nodes, topicId);
  if (!root) return 0;
  let d = 0;
  let current: LearningNode | undefined = node;
  const seen = new Set<string>();
  while (current && current.id !== root.id) {
    if (seen.has(current.id)) return d;
    seen.add(current.id);
    d++;
    const parentId: string | null = current.parentNodeId;
    if (!parentId) break;
    current = nodes.find((n) => n.id === parentId);
  }
  return d;
}
