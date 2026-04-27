import type { LearningNode } from "./types";
import type { AskContext } from "./context";
import type { CreateNodeOutput } from "./types";
import { CreateChildProtocolStreamParser } from "./create-child-stream-protocol";

const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/v1/chat/completions";

function nodeBlocksDigest(node: LearningNode): string {
  if (node.contentBlocks.length === 0) {
    return "（此条下尚未有问与答）";
  }
  return node.contentBlocks
    .map((b) => {
      const q = b.question ? `问：${b.question}\n` : "";
      return `${q}答：${b.answer}`;
    })
    .join("\n\n");
}

function justAskDigestForPrompt(node: LearningNode): string {
  const entries = node.justAskEntries ?? [];
  if (entries.length === 0) {
    return "";
  }
  return (
    "\n\n此条上另有即兴追问与回复（与主线问答并列）：\n" +
    entries
      .map((e) => `问：${e.question}\n答：${e.answer}`)
      .join("\n\n")
  );
}

/**
 * 上文：根节点、此前问与答记录、可选相关知识、最新要答的问题。流式/仅问/建子段共用。
 */
export function buildPromptContextForAsk(ctx: AskContext): string {
  const rootTitle = ctx.pathNodes[0]?.title ?? ctx.topicTitle;
  const pathSection = ctx.pathNodes
    .map((node) => {
      return `### ${node.title}\n${nodeBlocksDigest(node)}${justAskDigestForPrompt(node)}`;
    })
    .join("\n\n");
  const related = ctx.relatedConcepts
    .map((c) => (c.description ? `${c.name}：${c.description}` : c.name))
    .join("\n");
  return [
    `根节点：${rootTitle}`,
    "用户此前已进行多轮问与答。下为按顺序整理出来的记录。每个「###」小标题只用于区分不同条目的范围；条目下依次是当时留下的提问与回答，同一条下可以有多问多答。",
    pathSection,
    related ? `相关知识：\n${related}` : "",
    `最新问题：\n${ctx.question}`
  ]
    .filter(Boolean)
    .join("\n\n");
}

const JUST_ASK_USER_SUFFIX =
  "就「最新问题」写一段直接回答。尽量用与问题相同的主要语言。可用纯文本或轻量 Markdown。";

const JUST_ASK_SYSTEM = "根据上文，只写对最新问题的回答，不要题外话。";

function getJustAskUserContent(ctx: AskContext): string {
  return [buildPromptContextForAsk(ctx), JUST_ASK_USER_SUFFIX].join("\n\n");
}

function getJustAskMessages(ctx: AskContext) {
  return [
    { role: "system" as const, content: JUST_ASK_SYSTEM },
    { role: "user" as const, content: getJustAskUserContent(ctx) }
  ];
}

const CREATE_CHILD_PROTOCOL_SYSTEM = "分节与分隔行必须和 user 中约定的一致；除此之外不要加开场白、尾声或题外话。";

/**
 * OpenAI-style SSE: stream `delta.content` to `onToken`, return the full (trimmed) string.
 */
async function streamChatCompletionDeltas(
  model: string,
  apiKey: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  onToken: (delta: string) => void
): Promise<string> {
  const res = await fetch(DEEPSEEK_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      stream: true,
      messages
    })
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`DeepSeek API ${res.status}: ${errBody.slice(0, 800)}`);
  }
  if (!res.body) {
    throw new Error("DeepSeek returned an empty body.");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    for (;;) {
      const n = buffer.indexOf("\n");
      if (n < 0) break;
      let line = buffer.slice(0, n);
      buffer = buffer.slice(n + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      const t = line.trim();
      if (!t.startsWith("data: ")) continue;
      const data = t.slice(6);
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string | null } }>;
        };
        const c = json.choices?.[0]?.delta?.content;
        if (c) {
          full += c;
          onToken(c);
        }
      } catch {
        // skip
      }
    }
  }
  return full.trim();
}

/**
 * Stream tokens from DeepSeek; calls `onToken` for each `delta.content` chunk.
 * Returns the full answer (trimmed) for persistence.
 */
export async function streamDeepseekJustAsk(
  ctx: AskContext,
  model: string,
  apiKey: string,
  onToken: (delta: string) => void
): Promise<string> {
  return streamChatCompletionDeltas(model, apiKey, getJustAskMessages(ctx), onToken);
}

/**
 * Single streamed completion: title + body + JSON metadata in a fixed wire format. Passes only body text to onBodyDelta.
 */
export async function streamDeepseekCreateChildProtocol(
  ctx: AskContext,
  model: string,
  apiKey: string,
  onBodyDelta: (s: string) => void,
  onTitleLine?: (t: string) => void
): Promise<CreateNodeOutput> {
  const user = [
    buildPromptContextForAsk(ctx),
    "",
    "请一次写完回复，分四段，行首的标记须与下面逐字相同（且各占单独一行，顺序不可变）：",
    "",
    "第一行只写：---ML-TITLE---",
    "下一行写「标题」：用一句话概括上面「最新问题」在问什么，中文时该行总字数（汉字）不超过 10 个；以英文为主时该行不超过 10 个词。",
    "再下一行只写：---ML-BODY---",
    "接着写对「最新问题」的讲解正文，可用轻量 Markdown。正文中不要出现子串：---ML-META---。",
    "再下一行只写：---ML-META---",
    "最后一行是单个 JSON 对象，不用代码块。键为 conceptCandidate（string 或 null）与 relatedConceptCandidates（数组，元素 { name, relation }，relation 只能是 related、part_of、uses、used_by 之一）。"
  ].join("\n");
  const parser = new CreateChildProtocolStreamParser(onTitleLine);
  const full = await streamChatCompletionDeltas(
    model,
    apiKey,
    [
      { role: "system", content: CREATE_CHILD_PROTOCOL_SYSTEM },
      { role: "user", content: user }
    ],
    (delta) => {
      onBodyDelta(parser.append(delta));
    }
  );
  if (full.length < 1) {
    throw new Error("Model returned an empty child reply.");
  }
  return parser.finish();
}
