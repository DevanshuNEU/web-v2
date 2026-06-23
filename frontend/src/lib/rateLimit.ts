import type { NextRequest } from 'next/server';

/**
 * Reusable rate limiter, generalized from the concierge route's limiter.
 *
 * Every instance has an ALWAYS-on in-memory sliding-window fallback (per
 * serverless instance, resets on cold start) plus an optional durable Upstash
 * path that activates when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * are set. The `prefix` namespaces the Upstash keys and is used to keep each
 * limiter's in-memory state independent.
 */

export type RateLimiter = { limit: (ip: string) => Promise<{ tooMany: boolean }> };

export type RateLimiterOptions = {
  prefix: string;
  perMinute: number;
  dailyCeiling: number;
};

/**
 * Extract the client IP the same way the concierge route does: first value of
 * `x-forwarded-for`, trimmed, falling back to 'anon'.
 */
export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon';
}

export function createRateLimiter({ prefix, perMinute, dailyCeiling }: RateLimiterOptions): RateLimiter {
  // Own in-memory state per limiter instance, never shared across prefixes.
  const ipHits = new Map<string, number[]>();
  let dayStamp = '';
  let dayCount = 0;

  function inMemoryLimit(ip: string): { tooMany: boolean } {
    const now = Date.now();
    const recent = (ipHits.get(ip) ?? []).filter((t) => now - t < 60_000);
    if (recent.length >= perMinute) return { tooMany: true };
    recent.push(now);
    ipHits.set(ip, recent);

    const today = new Date().toISOString().slice(0, 10);
    if (today !== dayStamp) { dayStamp = today; dayCount = 0; }
    dayCount += 1;
    if (dayCount > dailyCeiling) return { tooMany: true };
    return { tooMany: false };
  }

  type Inner = { limit: (ip: string) => Promise<{ tooMany: boolean } | void> };
  let limiterPromise: Promise<Inner> | null = null;

  async function getLimiter(): Promise<Inner> {
    if (limiterPromise) return limiterPromise;
    limiterPromise = (async () => {
      // Durable path: Upstash (survives cold starts, shared across instances).
      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        const { Ratelimit } = await import('@upstash/ratelimit');
        const { Redis } = await import('@upstash/redis');
        const redis = Redis.fromEnv();
        const perIp = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(perMinute, '60 s'),
          prefix: `${prefix}:ip`,
        });
        return {
          async limit(ip: string) {
            const { success } = await perIp.limit(ip);
            if (!success) return { tooMany: true };
            const dayKey = `${prefix}:day:${new Date().toISOString().slice(0, 10)}`;
            const count = await redis.incr(dayKey);
            if (count === 1) await redis.expire(dayKey, 86400);
            if (count > dailyCeiling) return { tooMany: true };
          },
        };
      }
      // Always-on in-memory fallback.
      return { async limit(ip: string) { return inMemoryLimit(ip); } };
    })();
    return limiterPromise;
  }

  return {
    async limit(ip: string): Promise<{ tooMany: boolean }> {
      const inner = await getLimiter();
      const result = await inner.limit(ip);
      return { tooMany: Boolean(result?.tooMany) };
    },
  };
}
