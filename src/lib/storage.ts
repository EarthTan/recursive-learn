import type { AppState } from "@/domain/app-state";

/** Stable key; keep in sync with any code that must clear the session in tests. */
export const STATE_STORAGE_KEY = "maplearn.state.v1";

export function saveState(state: AppState) {
  localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify({ ...state, createChildStreamUi: null }));
}

export function loadState(): AppState | null {
  const raw = localStorage.getItem(STATE_STORAGE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as AppState;
  return { ...parsed, createChildStreamUi: null };
}

export function clearStoredState() {
  localStorage.removeItem(STATE_STORAGE_KEY);
}
