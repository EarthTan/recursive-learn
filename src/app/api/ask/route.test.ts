import { describe, expect, it } from "vitest";
import { POST } from "./route";
import { createTopicWithRoot } from "@/domain/learning-tree";

describe("POST /api/ask", () => {
  it("rejects when stream is not true", async () => {
    const session = createTopicWithRoot("Transformer", "Root");
    const response = await POST(
      new Request("http://localhost/api/ask", {
        method: "POST",
        body: JSON.stringify({
          topic: session.topic,
          nodes: session.nodes,
          activeNodeId: session.activeNodeId,
          question: "Hi",
          mode: "just_ask",
          relatedConcepts: []
        })
      })
    );
    expect(response.status).toBe(400);
  });

  it("streams create child with mock when stream: true", async () => {
    const session = createTopicWithRoot("Transformer", "Root");
    const response = await POST(
      new Request("http://localhost/api/ask", {
        method: "POST",
        body: JSON.stringify({
          topic: session.topic,
          nodes: session.nodes,
          activeNodeId: session.activeNodeId,
          question: "Q/K/V 是什么？",
          mode: "create_child_node",
          stream: true,
          relatedConcepts: []
        })
      })
    );
    expect(response.status).toBe(200);
    const text = await response.text();
    const lines = text.trim().split("\n").filter(Boolean);
    const last = JSON.parse(lines[lines.length - 1]!) as { done?: boolean; output?: { title: string } };
    expect(last.done).toBe(true);
    expect(last.output?.title).toBe("Q/K/V");
  });

  it("streams just ask with mock when stream: true", async () => {
    const session = createTopicWithRoot("Transformer", "Root");
    const response = await POST(
      new Request("http://localhost/api/ask", {
        method: "POST",
        body: JSON.stringify({
          topic: session.topic,
          nodes: session.nodes,
          activeNodeId: session.activeNodeId,
          question: "Explain with an example",
          mode: "just_ask",
          stream: true,
          relatedConcepts: []
        })
      })
    );
    const text = await response.text();
    const lines = text.trim().split("\n").filter(Boolean);
    const last = JSON.parse(lines[lines.length - 1]!) as { done?: boolean; full?: string };
    expect(response.status).toBe(200);
    expect(last.done).toBe(true);
    expect(last.full).toContain("example");
  });

  it("streams ndjson for just ask with stream: true", async () => {
    const session = createTopicWithRoot("Transformer", "Root");
    const response = await POST(
      new Request("http://localhost/api/ask", {
        method: "POST",
        body: JSON.stringify({
          topic: session.topic,
          nodes: session.nodes,
          activeNodeId: session.activeNodeId,
          question: "Hi",
          mode: "just_ask",
          stream: true,
          relatedConcepts: []
        })
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toMatch(/ndjson/);
    const text = await response.text();
    const lines = text.trim().split("\n").filter(Boolean);
    expect(lines.length).toBeGreaterThan(1);
    const last = JSON.parse(lines[lines.length - 1]!) as { done?: boolean; full?: string };
    expect(last.done).toBe(true);
    expect(typeof last.full).toBe("string");
    expect(last.full!.length).toBeGreaterThan(0);
  });

  it("streams ndjson for create child with stream: true", async () => {
    const session = createTopicWithRoot("Transformer", "Root");
    const response = await POST(
      new Request("http://localhost/api/ask", {
        method: "POST",
        body: JSON.stringify({
          topic: session.topic,
          nodes: session.nodes,
          activeNodeId: session.activeNodeId,
          question: "What is attention?",
          mode: "create_child_node",
          stream: true,
          relatedConcepts: []
        })
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toMatch(/ndjson/);
    const text = await response.text();
    const lines = text.trim().split("\n").filter(Boolean);
    expect(lines.length).toBeGreaterThan(1);
    const last = JSON.parse(lines[lines.length - 1]!) as { done?: boolean; output?: { title: string; answer: string } };
    expect(last.done).toBe(true);
    expect(last.output?.title).toBeDefined();
    expect(last.output?.answer?.length).toBeGreaterThan(0);
  });
});
