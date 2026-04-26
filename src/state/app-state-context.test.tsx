import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppStateProvider, useAppState } from "./app-state-context";
import { STATE_STORAGE_KEY } from "@/lib/storage";
import { createInitialState } from "@/domain/app-state";

const memory: Record<string, string> = {};

function mockLocalStorage() {
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (k in memory ? memory[k] : null),
    setItem: (k: string, v: string) => {
      memory[k] = v;
    },
    removeItem: (k: string) => {
      delete memory[k];
    },
    clear: () => {
      for (const k of Object.keys(memory)) delete memory[k];
    }
  } as Storage);
}

function Probe() {
  const { rehydrated, state } = useAppState();
  if (!rehydrated) return <div>loading</div>;
  if (!state) return <div>no-session</div>;
  return <div>topic:{state.topics[0].title}</div>;
}

describe("AppStateProvider", () => {
  beforeEach(() => {
    for (const k of Object.keys(memory)) delete memory[k];
    mockLocalStorage();
  });

  afterEach(() => {
    for (const k of Object.keys(memory)) delete memory[k];
  });

  it("rehydrates persisted state from localStorage", async () => {
    const saved = createInitialState("Physics");
    memory[STATE_STORAGE_KEY] = JSON.stringify(saved);

    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("topic:Physics")).toBeInTheDocument();
    });
  });

  it("starts with no session when storage is empty", async () => {
    render(
      <AppStateProvider>
        <Probe />
      </AppStateProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("no-session")).toBeInTheDocument();
    });
  });
});
