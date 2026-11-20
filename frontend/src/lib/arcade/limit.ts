/**
 * Per-IP limit on score submits, following lib/rateLimit.ts: an always-on
 * in-memory sliding window, plus a durable Upstash window when the Upstash
 * env is set. The shared helper only does per-minute windows, and this one
 * needs ten minutes, so it lives here.
 */

// Rounds of Aura Tower can be 15 seconds and two people may share one
// network, so this allows a post every 15 seconds on average.
export const SUBMITS_PER_WINDOW = 40;
export const WINDOW_MS = 10 * 60 * 1000;

const hits = new Map<string, number[]>();

function inMemoryLimit(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= SUBMITS_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

type Durable = { limit: (ip: string) => Promise<{ success: boolean }> };
let durable: { url: string; limiter: Durable } | null = null;

async function getDurable(): Promise<Durable | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (durable?.url === url) return durable.limiter;
  const { Ratelimit } = await import('@upstash/ratelimit');
  const { Redis } = await import('@upstash/redis');
  const limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(SUBMITS_PER_WINDOW, '10 m'),
    prefix: 'arcade:score:ip',
  });
  durable = { url, limiter };
  return limiter;
}

/** True when this IP has used up its submits for the window. */
export async function submitLimited(ip: string): Promise<boolean> {
  try {
    const limiter = await getDurable();
    if (limiter) return !(await limiter.limit(ip)).success;
  } catch (err) {
    // A dead Upstash must not take the leaderboard down: fall back.
    console.error('Arcade limiter failed, using in-memory fallback:', err);
  }
  return inMemoryLimit(ip);
}

/** Tests: forget every IP. */
export function resetLimiter(): void {
  hits.clear();
  durable = null;
}
