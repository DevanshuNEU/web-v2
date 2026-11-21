/**
 * Per-IP limits for the arcade routes, following lib/rateLimit.ts: an
 * always-on in-memory sliding window, plus a durable Upstash window when the
 * Upstash env is set. The shared helper only does per-minute windows, and
 * most of these need ten minutes, so they live here. Each bucket counts separately,
 * so guessing the crown code never uses up a player's score posts.
 */

// Rounds of Aura Tower can be 15 seconds and two people may share one
// network, so this allows a post every 15 seconds on average.
export const SUBMITS_PER_WINDOW = 40;
export const WINDOW_MS = 10 * 60 * 1000;

// Crown code guesses: a person who knows the code needs one try; ten in ten
// minutes leaves room for typos. The code is 16+ characters and wrong codes
// are also capped per day across every network (lib/arcade/crown.ts).
export const SECRET_TRIES_PER_WINDOW = 10;

// Board reads: a page view loads one board per tab switch; 120 a minute is
// far above a person and well below a scraper looping on the route.
export const BOARD_READS_PER_MINUTE = 120;
// Run starts: one per round, and the shortest round is about 15 seconds.
export const STARTS_PER_WINDOW = 60;

// Admin calls: the owner removes a cheater now and then; 10 in ten minutes
// is plenty, and it slows anyone guessing the admin token.
export const ADMIN_CALLS_PER_WINDOW = 10;

// How long an Upstash check may take. A slow Upstash must not stall a
// route; on a timeout the check passes, except crown code tries, which are
// blocked instead (see secretLimited).
export const UPSTASH_TIMEOUT_MS = 1500;

type Bucket = 'score' | 'secret' | 'board' | 'start' | 'admin';
type Rule = { max: number; windowMs: number; window: '1 m' | '10 m' };
const TEN_MINUTES: Pick<Rule, 'windowMs' | 'window'> = { windowMs: WINDOW_MS, window: '10 m' };
const RULE: Record<Bucket, Rule> = {
  score: { max: SUBMITS_PER_WINDOW, ...TEN_MINUTES },
  secret: { max: SECRET_TRIES_PER_WINDOW, ...TEN_MINUTES },
  board: { max: BOARD_READS_PER_MINUTE, windowMs: 60_000, window: '1 m' },
  start: { max: STARTS_PER_WINDOW, ...TEN_MINUTES },
  admin: { max: ADMIN_CALLS_PER_WINDOW, ...TEN_MINUTES },
};

const hits = new Map<string, number[]>();

/**
 * The key an address is limited under. One IPv6 host usually holds a whole
 * /64 and can rotate through it at will, so IPv6 counts per /64. IPv4, and
 * IPv4 written as IPv6 (::ffff:a.b.c.d), counts per address.
 */
export function ipBucket(ip: string): string {
  const addr = ip.trim().toLowerCase().replace(/%.*$/, '');
  if (!addr.includes(':')) return addr;
  const mapped = /^[0:]*:ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(addr);
  if (mapped) return mapped[1];
  const [head, tail] = addr.split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const groups = tail === undefined ? left : [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right];
  return `${groups.slice(0, 4).map((g) => (parseInt(g, 16) || 0).toString(16)).join(':')}::/64`;
}

function inMemoryLimit(bucket: Bucket, ip: string): boolean {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const { max, windowMs } = RULE[bucket];
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

type Durable = { limit: (ip: string) => Promise<{ success: boolean; reason?: string }> };
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
    limiter: Ratelimit.slidingWindow(RULE[bucket].max, RULE[bucket].window),
    prefix: `arcade:${bucket}:ip`,
    timeout: UPSTASH_TIMEOUT_MS,
  });
  durable[bucket] = { url, limiter };
  return limiter;
}

async function limited(bucket: Bucket, rawIp: string, blockOnTimeout = false): Promise<boolean> {
  const ip = ipBucket(rawIp);
  try {
    const limiter = await getDurable(bucket);
    if (limiter) {
      const { success, reason } = await limiter.limit(ip);
      return !success || (blockOnTimeout && reason === 'timeout');
    }
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

/**
 * True when this IP has used up its crown code tries for the window. When
 * Upstash times out the try is blocked: a guesser must not get free tries
 * by making the limiter slow.
 */
export function secretLimited(ip: string): Promise<boolean> {
  return limited('secret', ip, true);
}

/** True when this IP has read the board too often this minute. */
export function boardLimited(ip: string): Promise<boolean> {
  return limited('board', ip);
}

/** True when this IP has started too many runs in the window. */
export function startLimited(ip: string): Promise<boolean> {
  return limited('start', ip);
}

/** True when this IP has made too many admin calls in the window. */
export function adminLimited(ip: string): Promise<boolean> {
  return limited('admin', ip);
}

/** Tests: forget every IP. */
export function resetLimiter(): void {
  hits.clear();
  for (const bucket of Object.keys(durable) as Bucket[]) delete durable[bucket];
}
