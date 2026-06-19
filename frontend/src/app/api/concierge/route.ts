import { NextResponse, type NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildConciergeSystem, MAX_QUERY_LENGTH } from '@/lib/conciergeContext';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Bound the answer (and the cost) — concierge replies are 2-4 sentences.
const MAX_TOKENS = 400;
const DEFAULT_MODEL = 'claude-opus-4-8';

// Per-IP sliding window and a global daily ceiling, both via Upstash. Rate
// limiting is OPTIONAL: with no Upstash env the route still works (useful for
// local dev), it just isn't throttled. The API-key check below is the only
// hard gate.
const RATE_PER_MINUTE = 6;
const DAILY_CEILING = 500;

type Limiter = {
  limit: (ip: string) => Promise<void | { tooMany: boolean }>;
};

let limiterPromise: Promise<Limiter | null> | null = null;

async function getLimiter(): Promise<Limiter | null> {
  if (limiterPromise) return limiterPromise;
  limiterPromise = (async () => {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return null;
    }
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
  })();
  return limiterPromise;
}

export async function POST(req: NextRequest) {
  // Hard gate: without a key the concierge is "offline" and the UI falls back.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'concierge_unconfigured' }, { status: 503 });
  }

  let query: unknown;
  try {
    ({ query } = await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (typeof query !== 'string' || query.trim().length === 0) {
    return NextResponse.json({ error: 'empty_query' }, { status: 400 });
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: 'query_too_long' }, { status: 413 });
  }

  // Optional throttle + spend ceiling.
  const limiter = await getLimiter();
  if (limiter) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon';
    const res = await limiter.limit(ip);
    if (res?.tooMany) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }
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
    messages: [{ role: 'user', content: query }],
  });

  // Stream only the text deltas as plain text — the client just appends them.
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
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
