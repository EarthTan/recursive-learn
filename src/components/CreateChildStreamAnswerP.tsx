"use client";

import { useSyncExternalStore } from "react";
import {
  getCreateChildStreamSnapshot,
  subscribeCreateChildStreamText
} from "@/lib/create-child-stream-buffer";
import { MarkdownAnswer } from "./MarkdownAnswer";

const serverSnap = { childId: null as string | null, text: "" };

type Props = {
  streamChildId: string;
  blockAnswer: string;
  showCaret: boolean;
};

/**
 * Renders the first block’s answer during create-child streaming. Subscribes to a module store
 * so AppState (and the map preview aside) is not updated on every throttled token.
 */
export function CreateChildStreamAnswerP({ streamChildId, blockAnswer, showCaret }: Props) {
  const live = useSyncExternalStore(
    subscribeCreateChildStreamText,
    getCreateChildStreamSnapshot,
    () => serverSnap
  );
  const text = live.childId === streamChildId ? live.text : blockAnswer;
  return <MarkdownAnswer source={text} showCaret={showCaret} />;
}
