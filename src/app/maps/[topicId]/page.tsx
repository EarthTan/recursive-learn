"use client";

import Link from "next/link";
import { use } from "react";
import { LearningMapPage } from "@/components/LearningMapPage";
import { useAppState } from "@/state/app-state-context";

export default function MapRoutePage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = use(params);
  const { rehydrated, state, setState } = useAppState();

  if (!rehydrated) {
    return null;
  }
  if (!state) {
    return (
      <main className="mx-auto max-w-[1320px] px-10 py-12">
        <p>
          No learning session. <Link href="/">Start from home</Link>.
        </p>
      </main>
    );
  }
  if (!state.topics.some((t) => t.id === topicId)) {
    return (
      <main className="mx-auto max-w-[900px] px-10 py-12">
        <p>That topic is not in your session.</p>
        <p className="mt-2 text-ml-muted">
          <Link className="font-medium text-ml-blue" href="/maps">
            Back to all topics
          </Link>{" "}
          or <Link href="/">home</Link>.
        </p>
      </main>
    );
  }

  return (
    <LearningMapPage
      key={topicId}
      state={state}
      onStateChange={setState}
      mapTopicId={topicId}
    />
  );
}
