import { NextResponse } from "next/server";
import { createNodeOutputSchema } from "@/domain/ai-schema";
import { buildAskContext } from "@/domain/context";
import {
  buildCreateChildMockProtocolString,
  CreateChildProtocolStreamParser
} from "@/domain/create-child-stream-protocol";
import { streamDeepseekCreateChildProtocol, streamDeepseekJustAsk } from "@/domain/deepseek-ask";
import { mockCreateNode, mockJustAsk } from "@/domain/mock-ai";
import { DEFAULT_DEEPSEEK_MODEL, type DeepseekModelId } from "@/lib/deepseek-settings";
import type { AskMode, LearningNode, Topic } from "@/domain/types";

type AskRequest = {
  topic: Topic;
  nodes: LearningNode[];
  activeNodeId: string;
  question: string;
  mode: AskMode;
  relatedConcepts: Array<{ name: string; description: string | null }>;
  /** 必须传 `true`；本接口仅支持流式响应。 */
  stream?: boolean;
  /** When empty, falls back to mock answers or DEEPSEEK_API_KEY. */
  deepseek?: { apiKey?: string; model?: DeepseekModelId };
};

function resolveDeepseek(
  body: AskRequest
): { apiKey: string; model: DeepseekModelId } | null {
  const fromBody = body.deepseek?.apiKey?.trim() ?? "";
  const fromEnv = process.env.DEEPSEEK_API_KEY?.trim() ?? "";
  const apiKey = fromBody || fromEnv;
  if (!apiKey) return null;
  const model = body.deepseek?.model ?? (process.env.DEEPSEEK_MODEL as DeepseekModelId | undefined) ?? DEFAULT_DEEPSEEK_MODEL;
  if (model !== "deepseek-v4-pro" && model !== "deepseek-v4-flash") {
    return { apiKey, model: DEFAULT_DEEPSEEK_MODEL };
  }
  return { apiKey, model };
}

export async function POST(request: Request) {
  const body = (await request.json()) as AskRequest;
  const question = body.question.trim();
  if (!question) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }
  if (body.stream !== true) {
    return NextResponse.json(
      { error: "本接口只支持流式，请在请求体中设置 stream: true" },
      { status: 400 }
    );
  }

  const context = buildAskContext({ ...body, question });
  const ds = resolveDeepseek(body);
  const enc = new TextEncoder();
  const writeLine = (obj: object, controller: ReadableStreamDefaultController<Uint8Array>) => {
    controller.enqueue(enc.encode(`${JSON.stringify(obj)}\n`));
  };

  if (body.mode === "just_ask") {
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (ds) {
            const full = await streamDeepseekJustAsk(
              context,
              ds.model,
              ds.apiKey,
              (delta) => writeLine({ t: delta }, controller)
            );
            writeLine({ done: true, full }, controller);
          } else {
            const text = await mockJustAsk(context);
            const step = 6;
            for (let i = 0; i < text.length; i += step) {
              if (i > 0) {
                await new Promise((r) => setTimeout(r, 8));
              }
              const t = text.slice(i, i + step);
              writeLine({ t }, controller);
            }
            writeLine({ done: true, full: text }, controller);
          }
          controller.close();
        } catch (e) {
          const message = e instanceof Error ? e.message : "Request failed";
          writeLine({ err: message }, controller);
          controller.close();
        }
      }
    });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8" }
    });
  }

  if (body.mode === "create_child_node") {
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          if (ds) {
            const output = await streamDeepseekCreateChildProtocol(
              context,
              ds.model,
              ds.apiKey,
              (delta) => {
                if (delta) writeLine({ t: delta }, controller);
              },
              (title) => writeLine({ title }, controller)
            );
            writeLine({ done: true, output }, controller);
          } else {
            const out = createNodeOutputSchema.parse(await mockCreateNode(context));
            const text = buildCreateChildMockProtocolString(out);
            const p = new CreateChildProtocolStreamParser((title) => writeLine({ title }, controller));
            for (let i = 0; i < text.length; i += 1) {
              if (i > 0 && i % 6 === 0) {
                await new Promise((r) => setTimeout(r, 8));
              }
              const d = p.append(text[i]!);
              if (d) writeLine({ t: d }, controller);
            }
            const parsed = p.finish();
            writeLine({ done: true, output: parsed }, controller);
          }
          controller.close();
        } catch (e) {
          const message = e instanceof Error ? e.message : "Request failed";
          writeLine({ err: message }, controller);
          controller.close();
        }
      }
    });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8" }
    });
  }

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
}
