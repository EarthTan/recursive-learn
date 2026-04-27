import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Best-effort client IP for rate limiting (Cloudflare and common proxies). */
export function getClientIp(request: Request): string {
  const cf = request.headers.get("CF-Connecting-IP")?.trim();
  if (cf) return cf;
  const xff = request.headers.get("X-Forwarded-For")?.trim();
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

function readLimit(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * KV-backed limiter for `POST /api/ask` on Cloudflare Workers.
 * No-ops when not on Workers or when the RATE_LIMIT KV binding is missing (e.g. `next dev`, tests).
 */
export async function enforceAskRateLimit(request: Request): Promise<NextResponse | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const kv = env.RATE_LIMIT;
    if (!kv) return null;

    const perMinute = readLimit("ASK_RL_PER_MINUTE", 5);
    const perDay = readLimit("ASK_RL_PER_DAY", 30);
    const ip = getClientIp(request);
    const now = Date.now();
    const minuteBucket = Math.floor(now / 60_000);
    const dayKey = new Date(now).toISOString().slice(0, 10);

    const minStoreKey = `ask:m:${ip}:${minuteBucket}`;
    const dayStoreKey = `ask:d:${ip}:${dayKey}`;

    const minuteCount = await bump(kv, minStoreKey, 120);
    if (minuteCount > perMinute) {
      return NextResponse.json(
        {
          code: "rate_limited",
          error: "Too many requests. Please try again in a minute."
        },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const dayCount = await bump(kv, dayStoreKey, 172_800);
    if (dayCount > perDay) {
      return NextResponse.json(
        {
          code: "rate_limited",
          error: "Daily request limit reached. Please try again tomorrow."
        },
        { status: 429, headers: { "Retry-After": "3600" } }
      );
    }

    return null;
  } catch {
    return null;
  }
}

async function bump(kv: KVNamespace, key: string, expirationTtl: number): Promise<number> {
  const cur = await kv.get(key);
  const n = (cur ? parseInt(cur, 10) : 0) + 1;
  if (!Number.isFinite(n) || n < 1) {
    await kv.put(key, "1", { expirationTtl });
    return 1;
  }
  await kv.put(key, String(n), { expirationTtl });
  return n;
}
