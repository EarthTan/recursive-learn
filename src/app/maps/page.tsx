"use client";

import Link from "next/link";
import { useAppState } from "@/state/app-state-context";
import { getRootNode } from "@/domain/topic-tree";
import { IconNodeCard, IconExternalLink } from "@/components/Icons";

export default function MapsIndexPage() {
  const { rehydrated, state } = useAppState();

  if (!rehydrated) {
    return null;
  }
  if (!state || state.topics.length === 0) {
    return (
      <main className="mx-auto max-w-[900px] px-10 py-12">
        <h1 className="m-0 text-[1.5rem] font-bold text-ml-ink">Learning maps</h1>
        <p className="mt-3 text-ml-muted">
          No topics yet.{" "}
          <Link className="font-semibold text-ml-blue no-underline hover:underline" href="/">
            Start a topic from home
          </Link>{" "}
          to see it here.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[900px] px-10 py-10">
      <nav className="mb-2 text-[0.88rem] text-ml-muted" aria-label="Breadcrumb">
        <span>Learning Map</span>
      </nav>
      <h1 className="m-0 text-[1.75rem] font-bold tracking-tight text-ml-ink">Your topics</h1>
      <p className="mt-2 max-w-lg text-[0.95rem] text-ml-muted">
        Choose a topic to open its learning map. Each map shows the node tree for that subject.
      </p>
      <ul className="mt-8 list-none p-0">
        {state.topics.map((topic) => {
          const root = getRootNode(state.nodes, topic.id);
          const nodeCount = state.nodes.filter((n) => n.topicId === topic.id).length;
          return (
            <li key={topic.id} className="mb-3">
              <Link
                href={`/maps/${topic.id}`}
                className={[
                  "group flex w-full max-w-lg items-center justify-between gap-4 rounded-ml",
                  "border border-ml-line bg-ml-card px-5 py-4 no-underline",
                  "shadow-ml-card transition-[box-shadow,transform] duration-200",
                  "hover:-translate-y-px hover:border-ml-hairline hover:shadow-ml-card"
                ].join(" ")}
              >
                <span className="flex min-w-0 items-start gap-3.5">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-ml-sm bg-ml-blue-soft text-ml-blue"
                    aria-hidden
                  >
                    <IconNodeCard className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block text-[1.02rem] font-semibold text-ml-ink group-hover:text-ml-blue">
                      {topic.title}
                    </span>
                    <span className="mt-0.5 block text-[0.85rem] text-ml-muted">
                      {nodeCount} node{nodeCount === 1 ? "" : "s"}
                      {root ? " · root: " + root.title : ""}
                    </span>
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.86rem] font-semibold text-ml-blue">
                  Open map
                  <IconExternalLink />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
