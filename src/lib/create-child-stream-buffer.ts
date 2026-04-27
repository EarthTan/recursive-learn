export type CreateChildStreamSnapshot = { childId: string | null; text: string };

let snapshot: CreateChildStreamSnapshot = { childId: null, text: "" };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeCreateChildStreamText(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCreateChildStreamSnapshot(): CreateChildStreamSnapshot {
  return snapshot;
}

export function publishCreateChildStreamText(childId: string, text: string) {
  snapshot = { childId, text };
  emit();
}

export function clearCreateChildStream() {
  snapshot = { childId: null, text: "" };
  emit();
}
