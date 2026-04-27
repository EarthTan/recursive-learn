"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppState } from "@/domain/app-state";
import {
  addChildNodeFromJustAsk,
  addPlaceholderChild,
  finalizeCreateChild,
  handleAskResult,
  removePlaceholderChild,
  setCreateChildStreamUi,
  setNodeMastery,
  setNodeTitle
} from "@/domain/app-state";
import { getNodePath } from "@/domain/learning-tree";
import { getRelatedConceptsForPath } from "@/domain/related-context";
import type { AskMode, CreateNodeOutput } from "@/domain/types";
import {
  clearCreateChildStream,
  publishCreateChildStreamText
} from "@/lib/create-child-stream-buffer";
import { loadDeepseekSettings } from "@/lib/deepseek-settings";
import { CreateChildStreamAnswerP } from "./CreateChildStreamAnswerP";
import { MarkdownAnswer } from "./MarkdownAnswer";
import { PathTraceTreeView } from "./TopicNodeTreeView";
import {
  IconArrowRight,
  IconCheckCircle,
  IconDot,
  IconExternalLink,
  IconNodeCard
} from "./Icons";

const btnMastery = (on: boolean) =>
  on
    ? "bg-ml-blue-soft text-ml-blue shadow-ml-mastery"
    : "bg-transparent text-ml-muted";

type JustAskPanel = {
  question: string;
  text: string;
  status: "streaming" | "done" | "error";
  errorMessage?: string;
};

type NdOut = {
  t?: string;
  title?: string;
  done?: boolean;
  full?: string;
  err?: string;
  output?: CreateNodeOutput;
};

type StreamDone =
  | { kind: "just_ask"; full: string }
  | { kind: "create_child"; output: CreateNodeOutput }
  | { err: string };

/**
 * Throttles flushes to ~`minIntervalMs` so the answer area re-renders at most ~20/s during streaming
 * (reduces layout jank; first update is immediate when `lastFlush` is 0).
 */
function createStreamThrottler(
  onFlush: (text: string) => void,
  minIntervalMs: number
): { push: (chunk: string) => void; flushNow: () => void; cancel: () => void; getText: () => string } {
  let acc = "";
  let lastFlush = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return {
    getText: () => acc,
    push(chunk: string) {
      acc += chunk;
      const now = performance.now();
      if (now - lastFlush >= minIntervalMs) {
        if (timeout != null) {
          clearTimeout(timeout);
          timeout = null;
        }
        lastFlush = now;
        onFlush(acc);
        return;
      }
      if (timeout != null) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        timeout = null;
        lastFlush = performance.now();
        onFlush(acc);
      }, minIntervalMs - (now - lastFlush));
    },
    flushNow() {
      if (timeout != null) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastFlush = performance.now();
      onFlush(acc);
    },
    cancel() {
      if (timeout != null) {
        clearTimeout(timeout);
        timeout = null;
      }
    }
  };
}

function parseAskNdjsonStream(
  body: ReadableStream<Uint8Array> | null,
  onToken: (delta: string) => void,
  onCreateChildTitle?: (title: string) => void
): Promise<StreamDone> {
  if (!body) return Promise.resolve({ err: "No response body" });
  return (async () => {
    const reader = body.getReader();
    const dec = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          if (buffer.trim()) {
            try {
              const o = JSON.parse(buffer) as NdOut;
              if (o.err) return { err: o.err };
              if (typeof o.title === "string" && o.title) onCreateChildTitle?.(o.title);
              if (o.done && o.output) return { kind: "create_child", output: o.output };
              if (o.done && typeof o.full === "string") {
                return { kind: "just_ask", full: o.full };
              }
            } catch {
              // ignore
            }
          }
          return { err: "Stream closed unexpectedly" };
        }
        buffer += dec.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let o: NdOut;
          try {
            o = JSON.parse(line) as NdOut;
          } catch {
            continue;
          }
          if (o.err) {
            return { err: o.err };
          }
          if (typeof o.title === "string" && o.title) {
            onCreateChildTitle?.(o.title);
          }
          if (o.t) {
            onToken(o.t);
          }
          if (o.done === true) {
            if (o.output) {
              return { kind: "create_child", output: o.output };
            }
            if (typeof o.full === "string") {
              return { kind: "just_ask", full: o.full };
            }
            return { err: "Invalid stream end" };
          }
        }
      }
    } catch (e) {
      return { err: e instanceof Error ? e.message : "Stream read failed" };
    }
  })();
}

export function NodeDetailPage({
  state,
  onStateChange
}: {
  state: AppState;
  onStateChange: (state: AppState) => void;
}) {
  const router = useRouter();
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [mode, setMode] = useState<AskMode>("create_child_node");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [justAskPanel, setJustAskPanel] = useState<JustAskPanel | null>(null);
  const [selectedJustAskId, setSelectedJustAskId] = useState<string | null>(null);

  const node = state.nodes.find((item) => item.id === state.activeNodeId) ?? state.nodes[0];
  const topic = state.topics.find((t) => t.id === state.activeTopicId);
  const path = getNodePath(state.nodes, node.id);
  const relatedConcepts = getRelatedConceptsForPath(state, state.activeNodeId);
  const justAskEntries = node.justAskEntries ?? [];
  const createStream = state.createChildStreamUi;

  const selectedEntry =
    selectedJustAskId == null
      ? null
      : (justAskEntries.find((e) => e.id === selectedJustAskId) ?? null);
  const justAskPanelEntryId = justAskPanel
    ? (justAskEntries.find(
        (entry) => entry.question === justAskPanel.question && entry.answer === justAskPanel.text
      )?.id ?? null)
    : null;
  const currentJustAskEntryId = selectedJustAskId ?? justAskPanelEntryId;
  const displayedJustAsk = justAskPanel
    ? {
        question: justAskPanel.question,
        answer: justAskPanel.text,
        status: justAskPanel.status,
        errorMessage: justAskPanel.errorMessage
      }
    : selectedEntry
      ? {
          question: selectedEntry.question,
          answer: selectedEntry.answer,
          status: "done" as const,
          errorMessage: undefined
        }
      : null;

  async function runJustAskStream(q: string) {
    if (!topic) return;
    setJustAskPanel({ question: q, text: "", status: "streaming" });
    setError(null);
    setSubmitting(true);
    const { apiKey, model } = loadDeepseekSettings();
    const thr = createStreamThrottler((text) => {
      setJustAskPanel((prev) =>
        prev && prev.status === "streaming" ? { ...prev, text } : prev
      );
    }, 48);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          nodes: stateRef.current.nodes,
          activeNodeId: stateRef.current.activeNodeId,
          question: q,
          mode: "just_ask",
          stream: true,
          relatedConcepts: getRelatedConceptsForPath(stateRef.current, stateRef.current.activeNodeId),
          ...(apiKey ? { deepseek: { apiKey, model } } : {})
        })
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        const msg = "error" in errBody && errBody.error ? errBody.error : "Request failed";
        setJustAskPanel({
          question: q,
          text: thr.getText(),
          status: "error",
          errorMessage: msg
        });
        thr.cancel();
        return;
      }
      const out = await parseAskNdjsonStream(res.body, (d) => {
        thr.push(d);
      });
      thr.flushNow();
      if ("err" in out) {
        setJustAskPanel({
          question: q,
          text: thr.getText(),
          status: "error",
          errorMessage: out.err
        });
        return;
      }
      if (out.kind !== "just_ask") {
        setJustAskPanel({
          question: q,
          text: thr.getText(),
          status: "error",
          errorMessage: "Unexpected stream"
        });
        return;
      }
      setJustAskPanel({ question: q, text: out.full, status: "done" });
      onStateChange(
        handleAskResult(stateRef.current, { mode: "just_ask", question: q, answer: out.full })
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function runCreateChildStream(q: string) {
    if (!topic) return;
    setError(null);
    setSubmitting(true);
    const parentId = stateRef.current.activeNodeId;
    const { apiKey, model } = loadDeepseekSettings();
    let childId: string = "";
    try {
      clearCreateChildStream();
      const next = addPlaceholderChild(stateRef.current, parentId, q);
      childId = next.activeNodeId;
      stateRef.current = next;
      const withThinking = setCreateChildStreamUi(next, { childId, phase: "thinking" });
      stateRef.current = withThinking;
      onStateChange(withThinking);
      setQuestion("");

      router.push(`/nodes/${childId}`);

      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          nodes: stateRef.current.nodes.filter((n) => n.id !== childId),
          activeNodeId: parentId,
          question: q,
          mode: "create_child_node",
          stream: true,
          relatedConcepts: getRelatedConceptsForPath(stateRef.current, parentId),
          ...(apiKey ? { deepseek: { apiKey, model } } : {})
        })
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        const msg = "error" in errBody && errBody.error ? errBody.error : "Request failed";
        if (childId) {
          const rolled = removePlaceholderChild(stateRef.current, childId, parentId);
          stateRef.current = rolled;
          onStateChange(rolled);
        }
        router.push(`/nodes/${parentId}`);
        setError(msg);
        return;
      }

      let didStreamingUi = false;
      const markStreaming = () => {
        if (didStreamingUi) return;
        didStreamingUi = true;
        publishCreateChildStreamText(childId, "");
        const s = setCreateChildStreamUi(stateRef.current, { childId, phase: "streaming" });
        stateRef.current = s;
        onStateChange(s);
      };
      const thr = createStreamThrottler((text) => {
        publishCreateChildStreamText(childId, text);
      }, 48);
      const out = await parseAskNdjsonStream(
        res.body,
        (d) => {
          markStreaming();
          thr.push(d);
        },
        (title) => {
          markStreaming();
          const t = setNodeTitle(stateRef.current, childId, title);
          stateRef.current = t;
          onStateChange(t);
        }
      );
      thr.flushNow();

      if ("err" in out) {
        const rolled = removePlaceholderChild(stateRef.current, childId, parentId);
        stateRef.current = rolled;
        onStateChange(rolled);
        router.push(`/nodes/${parentId}`);
        setError(out.err);
        return;
      }
      if (out.kind !== "create_child") {
        const rolled = removePlaceholderChild(stateRef.current, childId, parentId);
        stateRef.current = rolled;
        onStateChange(rolled);
        router.push(`/nodes/${parentId}`);
        setError("Unexpected response");
        return;
      }
      const final = finalizeCreateChild(stateRef.current, childId, q, out.output);
      stateRef.current = final;
      onStateChange(final);
    } finally {
      clearCreateChildStream();
      if (stateRef.current.createChildStreamUi != null) {
        const cleared = setCreateChildStreamUi(stateRef.current, null);
        stateRef.current = cleared;
        onStateChange(cleared);
      }
      setSubmitting(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || !topic) return;
    setError(null);

    if (mode === "just_ask") {
      setQuestion("");
      await runJustAskStream(q);
      return;
    }

    await runCreateChildStream(q);
  }

  if (!node || !topic) {
    return <main className="mx-auto max-w-[1200px] px-10 pb-12 pt-7">Session incomplete.</main>;
  }

  return (
    <main className="mx-auto max-w-[1580px] px-10 pb-12 pt-7 max-[640px]:px-5">
      <div className="grid [grid-template-columns:280px_minmax(0,1fr)_minmax(200px,280px)] items-start gap-8 max-[1180px]:[grid-template-columns:minmax(0,1fr)_minmax(200px,280px)] max-[960px]:[grid-template-columns:1fr]">
        <aside
          className="sticky top-6 self-start rounded-ml border border-ml-line bg-ml-card p-4 shadow-ml-card max-[1180px]:col-span-2 max-[960px]:static max-[960px]:col-span-1"
          aria-label="随问记录"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="m-0 text-base font-semibold text-ml-ink">随问记录</h2>
            {justAskEntries.length > 0 ? (
              <span className="rounded-full bg-ml-blue-soft px-2 py-0.5 text-[0.8rem] font-medium text-ml-blue">
                {justAskEntries.length}
              </span>
            ) : null}
          </div>
          {justAskEntries.length === 0 ? (
            <p className="m-0 text-[0.9rem] leading-relaxed text-ml-muted">
              当前节点还没有随问。使用下方 Just ask 可以留下独立问答记录。
            </p>
          ) : (
            <ul className="m-0 flex max-h-[calc(100vh-12rem)] list-none flex-col gap-2 overflow-y-auto p-0" role="list">
              {justAskEntries.map((entry) => {
                const selected = entry.id === currentJustAskEntryId;
                return (
                  <li key={entry.id} className="m-0 p-0">
                    <button
                      type="button"
                      onClick={() => {
                        setJustAskPanel(null);
                        setSelectedJustAskId(entry.id);
                      }}
                      className={[
                        "w-full cursor-pointer rounded-ml-sm border px-3 py-2.5 text-left text-[0.9rem] font-medium leading-snug",
                        "transition-[border-color,background,color] duration-200",
                        selected
                          ? "border-ml-blue bg-ml-blue-soft text-ml-blue"
                          : "border-ml-line bg-ml-preview-bg text-ml-ink hover:border-ml-hairline"
                      ].join(" ")}
                      title={entry.question}
                      aria-pressed={selected}
                    >
                      {selected ? (
                        <span className="mb-1 block text-[0.78rem] font-semibold text-ml-blue">
                          当前随问
                        </span>
                      ) : null}
                      <span className="line-clamp-2">{entry.question}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="mb-3 text-[0.88rem] text-ml-muted">
            {path.map((n, i) => (
              <span key={n.id} className="inline">
                {i > 0 ? <span className="opacity-60"> &gt; </span> : null}
                {n.id === node.id ? (
                  <span aria-current="page">{n.title}</span>
                ) : (
                  <Link className="text-ml-muted no-underline hover:text-ml-blue" href={`/nodes/${n.id}`}>
                    {n.title}
                  </Link>
                )}
              </span>
            ))}
          </nav>
          <h1 className="mb-5 text-[1.85rem] font-bold leading-tight tracking-tight text-ml-ink">{node.title}</h1>

          <div
            className="mb-5 inline-flex overflow-hidden rounded-full border border-ml-line bg-ml-card"
            role="group"
            aria-label="Mastery"
          >
            <button
              type="button"
              className={[
                "inline-flex items-center gap-2 border-0 bg-transparent px-5 py-2.5 text-[0.9rem] font-medium",
                "cursor-pointer",
                btnMastery(node.status === "unmastered")
              ].join(" ")}
              onClick={() => onStateChange(setNodeMastery(state, node.id, "unmastered"))}
            >
              <IconDot className="shrink-0" />
              Unmastered
            </button>
            <button
              type="button"
              className={[
                "inline-flex items-center gap-2 border-0 bg-transparent px-5 py-2.5 text-[0.9rem] font-medium",
                "cursor-pointer",
                btnMastery(node.status === "mastered")
              ].join(" ")}
              onClick={() => onStateChange(setNodeMastery(state, node.id, "mastered"))}
            >
              <IconCheckCircle className="shrink-0" />
              Mastered
            </button>
          </div>

          <div className="mb-6 rounded-ml border border-ml-line bg-ml-card p-6 shadow-ml-card max-[480px]:px-5 max-[480px]:py-5">
            <article
              aria-busy={createStream?.childId === node.id}
              className="min-w-0 [contain:layout]"
            >
              {node.contentBlocks.map((block, i) => {
                const streamHere = i === 0 && createStream?.childId === node.id;
                const showStreamCaret = streamHere && createStream?.phase === "streaming";
                return (
                <div
                  key={block.id}
                  className="mb-4 min-h-0 [contain:layout] last:mb-0 [transform:translateZ(0)]"
                >
                  {block.question ? <p className="mb-2 text-[0.92rem] text-ml-muted">{block.question}</p> : null}
                  {streamHere && createStream?.phase === "thinking" ? (
                    <div
                      className="flex min-h-[2.5rem] items-center gap-2.5 text-[0.95rem] text-ml-muted"
                      aria-live="polite"
                    >
                      <span
                        className="h-4 w-4 shrink-0 rounded-full border-2 border-ml-line border-t-ml-blue animate-spin [animation-duration:0.7s] [backface-visibility:hidden]"
                        aria-hidden
                      />
                      正在思考中
                    </div>
                  ) : showStreamCaret ? (
                    <CreateChildStreamAnswerP
                      streamChildId={node.id}
                      blockAnswer={block.answer}
                      showCaret
                    />
                  ) : (
                    <MarkdownAnswer source={block.answer} />
                  )}
                </div>
                );
              })}
            </article>
          </div>

          {displayedJustAsk ? (
            <section
              className="mb-6 rounded-ml border border-ml-line bg-ml-card p-5 shadow-ml-card"
              aria-label="随问"
              aria-busy={displayedJustAsk.status === "streaming"}
            >
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2 gap-y-1">
                <p className="m-0 text-[0.8rem] font-medium uppercase tracking-wide text-ml-muted">你的问题</p>
                {displayedJustAsk.status === "done" && displayedJustAsk.answer.trim() ? (
                  <button
                    type="button"
                    className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-ml-sm border-[1.5px] border-ml-blue bg-ml-card px-3.5 py-1.5 text-[0.85rem] font-semibold text-ml-blue shadow-ml-card hover:bg-ml-blue-soft"
                    onClick={() => {
                      const next = addChildNodeFromJustAsk(
                        state,
                        node.id,
                        displayedJustAsk.question,
                        displayedJustAsk.answer,
                        currentJustAskEntryId
                      );
                      onStateChange(next);
                      setJustAskPanel(null);
                      setSelectedJustAskId(null);
                      router.push(`/nodes/${next.activeNodeId}`);
                    }}
                  >
                    <IconNodeCard />
                    Add as child node
                  </button>
                ) : null}
              </div>
              <p className="mb-4 text-[0.95rem] font-medium leading-relaxed text-ml-ink">{displayedJustAsk.question}</p>
              <p className="mb-1 text-[0.8rem] font-medium uppercase tracking-wide text-ml-muted">回答</p>
              {displayedJustAsk.status === "error" ? (
                <p className="m-0 text-[0.95rem] text-ml-error">{displayedJustAsk.errorMessage ?? "出错了"}</p>
              ) : (
                <MarkdownAnswer
                  source={displayedJustAsk.answer}
                  showCaret={displayedJustAsk.status === "streaming"}
                />
              )}
            </section>
          ) : null}

          <div className="mb-5 flex flex-wrap items-center gap-3" role="group" aria-label="Where to put the answer">
            <button
              type="button"
              className={[
                "inline-flex cursor-pointer items-center gap-2.5 rounded-ml-sm border-[1.5px] bg-ml-card px-[18px] py-2.5 text-[0.9rem] font-semibold",
                mode === "create_child_node"
                  ? "border-ml-blue bg-ml-blue-soft text-ml-blue"
                  : "border-ml-line text-ml-muted"
              ].join(" ")}
              onClick={() => setMode("create_child_node")}
            >
              <IconNodeCard />
              Create child node
            </button>
            <button
              type="button"
              className={[
                "inline-flex cursor-pointer items-center gap-2 rounded-ml-sm border-[1.5px] bg-ml-card px-[18px] py-2.5 text-[0.9rem] font-semibold",
                mode === "just_ask"
                  ? "border-ml-blue bg-ml-blue-soft text-ml-blue"
                  : "border-ml-line text-ml-muted"
              ].join(" ")}
              onClick={() => setMode("just_ask")}
            >
              Just ask
              <IconArrowRight />
            </button>
          </div>

          <form onSubmit={onSubmit}>
            <label className="flex items-start gap-3 rounded-ml border border-ml-line bg-ml-card px-4 py-2.5">
              <span className="sr-only">Ask a question</span>
              <span className="mt-1 shrink-0 text-ml-muted" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <circle cx="7.5" cy="7.5" r="4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <path d="M11 11l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <textarea
                aria-label="Ask a question"
                className="min-h-12 w-full flex-1 resize-y border-0 bg-transparent outline-none"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                placeholder="What do you want to learn next?"
              />
            </label>
            {error ? <p className="mt-2 text-[0.9rem] text-ml-error">{error}</p> : null}
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                className="inline-flex cursor-pointer items-center gap-2.5 rounded-ml-sm border-0 bg-ml-blue px-7 py-3 font-semibold text-white shadow-ml-cta-tight disabled:cursor-not-allowed disabled:opacity-55"
                disabled={submitting}
              >
                {mode === "create_child_node" ? "Create child node" : "Just ask"}
                <IconArrowRight />
              </button>
            </div>
          </form>
        </div>

        <aside
          className="sticky top-6 w-full max-w-[280px] rounded-ml border border-ml-line bg-ml-card p-4 shadow-ml-card max-[960px]:static max-[960px]:max-w-none"
          aria-label="Learning trace"
        >
          <div className="mb-4 flex flex-col gap-2.5 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between">
            <h2 className="m-0 text-base font-semibold">Learning trace</h2>
            <Link
              className="inline-flex w-fit cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-ml-sm border-[1.5px] border-ml-blue bg-ml-card px-3 py-1.5 text-[0.85rem] font-semibold text-ml-blue no-underline hover:bg-ml-blue-soft"
              href={`/maps/${topic.id}`}
            >
              full map
              <IconExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
          <PathTraceTreeView
            state={state}
            topicId={topic.id}
            path={path}
            activeNodeId={node.id}
          />
        </aside>
      </div>
    </main>
  );
}
