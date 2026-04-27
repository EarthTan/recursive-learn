"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import type { AppState } from "@/domain/app-state";
import { setActiveNodeId, setActiveTopicById, setNodeMastery } from "@/domain/app-state";
import { getChildrenOf, getRootNode } from "@/domain/topic-tree";
import { IconClose, IconExternalLink, IconNodeCard } from "./Icons";
import { TopicNodeTreeView } from "./TopicNodeTreeView";

const filterBtn = (on: boolean) =>
  [
    "cursor-pointer border-0 px-4 py-2.5 text-[0.88rem] font-medium",
    on ? "bg-ml-blue-soft text-ml-blue" : "bg-ml-card text-ml-ink"
  ].join(" ");

export function LearningMapPage({
  state,
  onStateChange,
  mapTopicId
}: {
  state: AppState;
  onStateChange: (state: AppState) => void;
  /** When set (e.g. from `/maps/[topicId]`), show this topic even before global `activeTopicId` catches up, and align session to it. */
  mapTopicId?: string;
}) {
  const topic =
    state.topics.find((t) => t.id === (mapTopicId ?? state.activeTopicId)) ?? state.topics[0];
  const [q, setQ] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);

  useLayoutEffect(() => {
    let next = state;
    if (mapTopicId && state.activeTopicId !== mapTopicId) {
      next = setActiveTopicById(state, mapTopicId);
    }
    const tid = mapTopicId ?? next.activeTopicId;
    const a = next.nodes.find((n) => n.id === next.activeNodeId);
    if (a && a.topicId === tid) {
      if (next !== state) {
        onStateChange(next);
      }
      return;
    }
    const r = getRootNode(next.nodes, tid);
    if (r) {
      if (r.id === next.activeNodeId) {
        if (next !== state) {
          onStateChange(next);
        }
        return;
      }
      onStateChange(setActiveNodeId(next, r.id));
      return;
    }
    if (next !== state) {
      onStateChange(next);
    }
  }, [mapTopicId, state, onStateChange]);

  const selected = topic
    ? state.nodes.find((n) => n.id === state.activeNodeId && n.topicId === topic.id) ??
      getRootNode(state.nodes, topic.id) ??
      state.nodes[0]
    : state.nodes[0];
  const parent =
    selected?.parentNodeId && topic
      ? state.nodes.find((n) => n.id === selected.parentNodeId)
      : null;
  const childCount =
    topic && selected ? getChildrenOf(state.nodes, topic.id, selected.id).length : 0;
  const linkedConcept =
    selected?.linkedConceptId && state.concepts.find((c) => c.id === selected.linkedConceptId);

  if (!topic) {
    return <main className="mx-auto max-w-[1320px] px-10 pb-12 pt-6">No topic in session.</main>;
  }

  return (
    <main className="mx-auto max-w-[1320px] px-10 pb-12 pt-6">
      <nav className="mb-2 text-[0.88rem]" aria-label="Breadcrumb">
        <Link className="font-medium text-ml-blue no-underline hover:underline" href="/maps">
          Learning Map
        </Link>
        <span className="mx-2 text-ml-muted">&gt;</span>
        <span>{topic.title}</span>
      </nav>
      <h1 className="mb-5 text-[1.75rem] font-bold text-ml-ink">{topic.title}</h1>

      <div
        className={[
          "grid items-stretch gap-6",
          panelOpen ? "[grid-template-columns:1fr_320px]" : "[grid-template-columns:1fr_48px]",
          "max-[960px]:[grid-template-columns:1fr]"
        ].join(" ")}
      >
        <div className="flex min-h-[520px] flex-col overflow-hidden rounded-ml border border-ml-line bg-ml-card shadow-ml-card">
          <div className="flex flex-wrap items-center border-b border-ml-line bg-ml-toolbar px-5 py-4">
            <input
              type="search"
              aria-label="Search nodes"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search nodes…"
              className="w-full min-w-0 rounded-full border border-ml-line bg-ml-card px-3.5 py-2.5"
            />
          </div>
          <TopicNodeTreeView
            state={state}
            topicId={topic.id}
            q={q}
            selectedId={selected.id}
            onSelect={(id) => {
              onStateChange(setActiveNodeId(state, id));
              setPanelOpen(true);
            }}
          />
        </div>

        {selected ? (
          <aside
            className={[
              "sticky top-5 self-start rounded-ml border border-ml-line bg-ml-card shadow-ml-card max-[960px]:static",
              panelOpen ? "p-5" : "flex items-start justify-center p-2"
            ].join(" ")}
            aria-label="Selected node"
          >
            {panelOpen ? (
              <>
                <div className="mb-3 flex items-start justify-between">
                  <button
                    type="button"
                    className="cursor-pointer rounded-ml-sm border-0 bg-ml-segment-bg p-1.5 text-ml-muted"
                    aria-label="Close panel"
                    onClick={() => setPanelOpen(false)}
                  >
                    <IconClose />
                  </button>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ml-blue-soft text-ml-blue" aria-hidden>
                    <IconNodeCard />
                  </div>
                </div>
                <h2 className="mb-4 text-[1.2rem] font-semibold leading-tight">{selected.title}</h2>
                <div
                  className="flex w-full overflow-hidden rounded-ml-sm border border-ml-line [&>button]:flex-1"
                  role="group"
                  aria-label="Mastery (selection)"
                >
                  <button
                    type="button"
                    className={filterBtn(selected.status === "unmastered")}
                    onClick={() => onStateChange(setNodeMastery(state, selected.id, "unmastered"))}
                  >
                    Unmastered
                  </button>
                  <button
                    type="button"
                    className={filterBtn(selected.status === "mastered")}
                    onClick={() => onStateChange(setNodeMastery(state, selected.id, "mastered"))}
                  >
                    Mastered
                  </button>
                </div>
                <dl className="my-4 grid gap-3">
                  <div>
                    <dt className="text-[0.75rem] uppercase tracking-wide text-ml-muted">Parent node</dt>
                    <dd className="m-0 mt-1 font-semibold">{parent ? parent.title : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[0.75rem] uppercase tracking-wide text-ml-muted">Child nodes</dt>
                    <dd className="m-0 mt-1 font-semibold">{childCount}</dd>
                  </div>
                </dl>
                <Link
                  className="mt-2 flex w-full items-center justify-center gap-2.5 rounded-ml-sm bg-ml-blue px-5 py-3.5 font-semibold !text-white no-underline shadow-ml-cta-tight hover:bg-ml-blue-deep"
                  href={`/nodes/${selected.id}`}
                >
                  Open node
                  <IconExternalLink />
                </Link>
                <div className="mt-6 border-t border-ml-line pt-5">
                  <h3 className="mb-2.5 text-[0.85rem] uppercase tracking-wide text-ml-muted">Linked concept</h3>
                  {linkedConcept ? (
                    <>
                      <Link className="font-semibold text-ml-blue no-underline" href={`/concepts/${linkedConcept.id}`}>
                        {linkedConcept.name}
                      </Link>
                      <p className="mt-2 text-[0.88rem] text-ml-muted">
                        {linkedConcept.description ?? "Concept linked from your learning map."}
                      </p>
                    </>
                  ) : (
                    <p className="text-[0.95rem] text-ml-muted">No concept linked yet.</p>
                  )}
                </div>
              </>
            ) : (
              <button
                type="button"
                className="cursor-pointer rounded-ml-sm border border-ml-line bg-ml-card px-2 py-3 text-[0.85rem] text-ml-muted [writing-mode:vertical-rl]"
                onClick={() => setPanelOpen(true)}
              >
                Details
              </button>
            )}
          </aside>
        ) : null}
      </div>
    </main>
  );
}
