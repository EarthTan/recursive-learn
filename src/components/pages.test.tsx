import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn()
  })
}));
import { createInitialState, handleAskResult } from "@/domain/app-state";
import { HomePage } from "./HomePage";
import { NodeDetailPage } from "./NodeDetailPage";
import { LearningMapPage } from "./LearningMapPage";
import { KnowledgeBasePage } from "./KnowledgeBasePage";

describe("pages", () => {
  it("renders homepage start form", () => {
    render(<HomePage onStart={() => undefined} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/learning map/i);
    expect(screen.getByPlaceholderText("What do you want to learn?")).toBeInTheDocument();
  });

  it("renders node detail with ask mode switch and node-scoped ad-hoc Q&A sidebar", () => {
    const base = createInitialState("Transformer");
    const state = {
      ...base,
      nodes: base.nodes.map((node) =>
        node.id === base.activeNodeId
          ? {
              ...node,
              justAskEntries: [
                {
                  id: "ja_1",
                  question: "How does attention relate to embeddings?",
                  answer: "Attention uses embeddings as contextual signals.",
                  createdAt: "2026-04-27T00:00:00.000Z"
                },
                {
                  id: "ja_2",
                  question: "Who introduced the Transformer?",
                  answer: "The Transformer was introduced in Attention Is All You Need.",
                  createdAt: "2026-04-27T00:01:00.000Z"
                }
              ]
            }
          : node
      )
    };
    render(<NodeDetailPage state={state} onStateChange={() => undefined} />);
    expect(screen.getAllByRole("button", { name: "Create child node" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Just ask" })).toBeInTheDocument();
    const sidebar = screen.getByRole("complementary", { name: "随问记录" });
    expect(sidebar).toBeInTheDocument();
    expect(within(sidebar).getAllByRole("button")).toHaveLength(2);
    fireEvent.click(within(sidebar).getByRole("button", { name: /How does attention/ }));
    expect(within(sidebar).getByRole("button", { name: /当前随问.*How does attention/s })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^随问记录/ })).not.toBeInTheDocument();
  });

  it("renders the node-detail learning trace as a compact scrollable path list", () => {
    let state = createInitialState("Transformer");
    state = handleAskResult(state, {
      mode: "create_child_node",
      question: "What is self-attention?",
      output: {
        title: "Self-attention",
        answer: "Self-attention compares tokens with each other.",
        conceptCandidate: null,
        relatedConceptCandidates: []
      }
    });
    state = handleAskResult(state, {
      mode: "create_child_node",
      question: "What are Q/K/V projections?",
      output: {
        title: "Q/K/V projections",
        answer: "Q/K/V are learned projections used by attention.",
        conceptCandidate: null,
        relatedConceptCandidates: []
      }
    });

    render(<NodeDetailPage state={state} onStateChange={() => undefined} />);

    const preview = screen.getByRole("list", { name: "Path from root to this node" });
    expect(within(preview).getAllByRole("listitem")).toHaveLength(3);
    expect(within(preview).getByRole("link", { name: "Transformer" })).toBeInTheDocument();
    expect(within(preview).getByRole("link", { name: "Self-attention" })).toBeInTheDocument();
    expect(within(preview).getByRole("link", { name: "Q/K/V projections" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.queryByRole("toolbar", { name: "Trace preview zoom" })).not.toBeInTheDocument();
  });

  it("renders learning map as a tree page", () => {
    const state = createInitialState("Transformer");
    render(<LearningMapPage state={state} onStateChange={() => undefined} />);
    expect(screen.getByRole("heading", { level: 1, name: "Transformer" })).toBeInTheDocument();
    expect(screen.getAllByText("Unmastered").length).toBeGreaterThan(0);
  });

  it("renders knowledge base as a network page", () => {
    const state = createInitialState("Transformer");
    render(<KnowledgeBasePage state={state} />);
    expect(screen.getByText("Knowledge Base")).toBeInTheDocument();
    expect(screen.getByLabelText("Concept network")).toBeInTheDocument();
  });
});
