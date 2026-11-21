/**
 * Per-IP limits for the arcade routes, following lib/rateLimit.ts: an
 * always-on in-memory sliding window, plus a durable Upstash window when the
 * Upstash env is set. The shared helper only does per-minute windows, and
 * these need ten minutes, so they live here. Each bucket counts separately,
 * so guessing the crown code never uses up a player's score posts.
 */

// Rounds of Aura Tower can be 15 seconds and two people may share one
// network, so this allows a post every 15 seconds on average.
export const SUBMITS_PER_WINDOW = 40;
export const WINDOW_MS = 10 * 60 * 1000;

// Crown code guesses: a person who knows the code needs one try; ten in ten
// minutes leaves room for typos and makes guessing a decent code hopeless.
export const SECRET_TRIES_PER_WINDOW = 10;

type Bucket = 'score' | 'secret';
const MAX: Record<Bucket, number> = { score: SUBMITS_PER_WINDOW, secret: SECRET_TRIES_PER_WINDOW };

const hits = new Map<string, number[]>();

function inMemoryLimit(bucket: Bucket, ip: string): boolean {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX[bucket]) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

type Durable = { limit: (ip: string) => Promise<{ success: boolean }> };
const durable: Partial<Record<Bucket, { url: string; limiter: Durable }>> = {};

async function getDurable(bucket: Bucket): Promise<Durable | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const cached = durable[bucket];
  if (cached?.url === url) return cached.limiter;
  const { Ratelimit } = await import('@upstash/ratelimit');
  const { Redis } = await import('@upstash/redis');
  const limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(MAX[bucket], '10 m'),
    prefix: `arcade:${bucket}:ip`,
  });
  durable[bucket] = { url, limiter };
  return limiter;
}

async function limited(bucket: Bucket, ip: string): Promise<boolean> {
  try {
    const limiter = await getDurable(bucket);
    if (limiter) return !(await limiter.limit(ip)).success;
  } catch (err) {
    // A dead Upstash must not take the leaderboard down: fall back.
    console.error('Arcade limiter failed, using in-memory fallback:', err);
  }
  return inMemoryLimit(bucket, ip);
}

/** True when this IP has used up its score submits for the window. */
export function submitLimited(ip: string): Promise<boolean> {
  return limited('score', ip);
}

/** True when this IP has used up its crown code tries for the window. */
export function secretLimited(ip: string): Promise<boolean> {
  return limited('secret', ip);
}

/** Tests: forget every IP. */
export function resetLimiter(): void {
  hits.clear();
  delete durable.score;
  delete durable.secret;
}
