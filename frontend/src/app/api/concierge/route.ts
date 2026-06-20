import { NextResponse, type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildConciergeSystem, MAX_QUERY_LENGTH, sanitizeVoice, clampMessages } from '@/lib/conciergeContext';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Sonnet follows the voice + no-em-dash + anti-recitation instructions far
// better than Haiku; cost stays bounded by max_tokens, prompt caching, and the
// rate limit below. Override via env.
const DEFAULT_MODEL = 'claude-sonnet-4-6';
// Bound the answer (and the cost). Concierge replies are 2-3 sentences.
const MAX_TOKENS = 400;

// Throttle: per-IP sliding window + a global daily ceiling (spend cap).
// Chat is multi-turn, so a single conversation sends several requests a minute.
const RATE_PER_MINUTE = 20;
const DAILY_CEILING = 400;

type Limiter = { limit: (ip: string) => Promise<{ tooMany: boolean } | void> };

// In-memory fallback so the concierge is ALWAYS rate-limited, even without
// Upstash. Per serverless instance (resets on cold start) — fine for a
// portfolio; set Upstash for durable, cross-instance limiting in production.
const ipHits = new Map<string, number[]>();
let dayStamp = '';
let dayCount = 0;

function inMemoryLimit(ip: string): { tooMany: boolean } {
  const now = Date.now();
  const recent = (ipHits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= RATE_PER_MINUTE) return { tooMany: true };
  recent.push(now);
  ipHits.set(ip, recent);

  const today = new Date().toISOString().slice(0, 10);
  if (today !== dayStamp) { dayStamp = today; dayCount = 0; }
  dayCount += 1;
  if (dayCount > DAILY_CEILING) return { tooMany: true };
  return { tooMany: false };
}

let limiterPromise: Promise<Limiter> | null = null;

async function getLimiter(): Promise<Limiter> {
  if (limiterPromise) return limiterPromise;
  limiterPromise = (async () => {
    // Durable path: Upstash (survives cold starts, shared across instances).
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const { Ratelimit } = await import('@upstash/ratelimit');
      const { Redis } = await import('@upstash/redis');
      const redis = Redis.fromEnv();
      const perIp = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(RATE_PER_MINUTE, '60 s'),
        prefix: 'concierge:ip',
      });
      return {
        async limit(ip: string) {
          const { success } = await perIp.limit(ip);
          if (!success) return { tooMany: true };
          const dayKey = `concierge:day:${new Date().toISOString().slice(0, 10)}`;
          const count = await redis.incr(dayKey);
          if (count === 1) await redis.expire(dayKey, 86400);
          if (count > DAILY_CEILING) return { tooMany: true };
        },
      };
    }
    // Always-on in-memory fallback.
    return { async limit(ip: string) { return inMemoryLimit(ip); } };
  })();
  return limiterPromise;
}

export async function POST(req: NextRequest) {
  // Hard gate: without a key the concierge is "offline" and the UI falls back.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'concierge_unconfigured' }, { status: 503 });
  }

  let body: { query?: unknown; messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // Multi-turn: prefer a messages[] thread; fall back to a single {query}.
  const thread = Array.isArray(body.messages)
    ? clampMessages(body.messages)
    : typeof body.query === 'string'
      ? clampMessages([{ role: 'user', content: body.query }])
      : [];

  if (thread.length === 0) {
    return NextResponse.json({ error: 'empty_query' }, { status: 400 });
  }
  const latestUser = [...thread].reverse().find((m) => m.role === 'user');
  if (latestUser && latestUser.content.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: 'query_too_long' }, { status: 413 });
  }

  // Throttle + daily spend ceiling (always on; Upstash if configured).
  const limiter = await getLimiter();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon';
  const limited = await limiter.limit(ip);
  if (limited?.tooMany) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: process.env.CONCIERGE_MODEL || DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    // Grounding lives in a cached system block: stable prefix, so repeat
    // questions read it at ~0.1x input cost instead of re-billing it.
    system: [
      {
        type: 'text',
        text: buildConciergeSystem(),
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: thread,
  });

  // Stream only the text deltas as plain text — the client just appends them.
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            // Strip em/en dashes server-side too (defense in depth).
            controller.enqueue(encoder.encode(sanitizeVoice(event.delta.text)));
          }
        }
        controller.close();
      } catch (err) {
        console.error('Concierge stream error:', err);
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
