"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { AppState } from "@/domain/app-state";
import { handleAskResult, setNodeMastery } from "@/domain/app-state";
import { getNodePath } from "@/domain/learning-tree";
import { getRelatedConceptsForPath } from "@/domain/related-context";
import type { AskMode, ContinueNodeOutput, CreateNodeOutput } from "@/domain/types";

export function NodeDetailPage({
  state,
  onStateChange
}: {
  state: AppState;
  onStateChange: (state: AppState) => void;
}) {
  const [mode, setMode] = useState<AskMode>("create_child_node");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const node = state.nodes.find((item) => item.id === state.activeNodeId) ?? state.nodes[0];
  const topic = state.topics.find((t) => t.id === state.activeTopicId);
  const path = getNodePath(state.nodes, node.id);
  const relatedConcepts = getRelatedConceptsForPath(state, state.activeNodeId);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || !topic) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          nodes: state.nodes,
          activeNodeId: state.activeNodeId,
          question: q,
          mode,
          relatedConcepts
        })
      });
      const body = (await res.json()) as
        | { error: string }
        | { kind: "create_child_node"; output: CreateNodeOutput }
        | { kind: "continue_here"; output: ContinueNodeOutput };
      if (!res.ok) {
        setError("error" in body ? body.error : "Request failed");
        return;
      }
      if (!("kind" in body)) {
        setError("Unexpected response");
        return;
      }
      if (body.kind === "create_child_node") {
        onStateChange(
          handleAskResult(state, { mode: "create_child_node", question: q, output: body.output })
        );
      } else {
        onStateChange(
          handleAskResult(state, { mode: "continue_here", question: q, output: body.output })
        );
      }
      setQuestion("");
    } finally {
      setSubmitting(false);
    }
  }

  if (!node || !topic) {
    return <main className="node-page">Session incomplete.</main>;
  }

  return (
    <main className="node-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        {path.map((n, i) => (
          <span key={n.id} className="breadcrumb__item">
            {i > 0 ? <span className="breadcrumb__sep"> / </span> : null}
            {n.id === node.id ? (
              <span aria-current="page">{n.title}</span>
            ) : (
              <Link href={`/nodes/${n.id}`}>{n.title}</Link>
            )}
          </span>
        ))}
      </nav>
      <h1>{node.title}</h1>
      <p className="node-page__meta">
        Topic: <strong>{topic.title}</strong> ·{" "}
        <Link className="node-page__map-link" href={`/maps/${topic.id}`}>
          Open full map
        </Link>
      </p>
      <div className="node-page__body">
        <div className="node-page__main">
          <div className="segmented" role="group" aria-label="Ask mode">
            <button
              type="button"
              onClick={() => setMode("create_child_node")}
              className={mode === "create_child_node" ? "is-active" : undefined}
            >
              Create child node
            </button>
            <button
              type="button"
              onClick={() => setMode("continue_here")}
              className={mode === "continue_here" ? "is-active" : undefined}
            >
              Continue here
            </button>
          </div>
          <div className="segmented" role="group" aria-label="Mastery">
            <button
              type="button"
              className={node.status === "unmastered" ? "is-active" : undefined}
              onClick={() => onStateChange(setNodeMastery(state, node.id, "unmastered"))}
            >
              Unmastered
            </button>
            <button
              type="button"
              className={node.status === "mastered" ? "is-active" : undefined}
              onClick={() => onStateChange(setNodeMastery(state, node.id, "mastered"))}
            >
              Mastered
            </button>
          </div>
          <article>
            {node.contentBlocks.map((block) => (
              <div key={block.id} className="content-block">
                {block.question ? <p className="content-block__q">{block.question}</p> : null}
                <p>{block.answer}</p>
              </div>
            ))}
          </article>
          <form onSubmit={onSubmit}>
            <textarea
              aria-label="Ask a question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
            />
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" disabled={submitting}>
              {mode === "create_child_node" ? "Create child node" : "Ask here"}
            </button>
          </form>
        </div>
        <aside className="node-page__map-preview" aria-label="Path preview">
          <h2 className="node-page__map-preview-title">Map path</h2>
          <ol>
            {path.map((n) => (
              <li key={n.id}>
                <Link href={`/nodes/${n.id}`}>{n.title}</Link>
                <span className="map-preview__status">
                  {n.status === "mastered" ? "Mastered" : "Unmastered"}
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </main>
  );
}
