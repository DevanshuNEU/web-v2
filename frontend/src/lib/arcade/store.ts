import type { Redis } from '@upstash/redis';

/**
 * The small slice of Redis the leaderboard needs. Upstash backs it in
 * production; an in-memory map backs it when the Upstash env is missing
 * (local dev, tests), so every route works without a database.
 */
export type ScoredMember = { member: string; score: number };

export interface ArcadeStore {
  /** ZADD GT: only raises a member's score, never lowers it. */
  zaddGt(key: string, score: number, member: string): Promise<void>;
  /** Highest first, inclusive range, like ZREVRANGE ... WITHSCORES. */
  zrevrangeWithScores(key: string, start: number, stop: number): Promise<ScoredMember[]>;
  /** 0-based position from the top, or null when absent. */
  zrevrank(key: string, member: string): Promise<number | null>;
  zscore(key: string, member: string): Promise<number | null>;
  zrem(key: string, member: string): Promise<number>;
  hset(key: string, field: string, value: string): Promise<void>;
  hget(key: string, field: string): Promise<string | null>;
  hmget(key: string, fields: string[]): Promise<(string | null)[]>;
  get(key: string): Promise<string | null>;
  /** SET NX EX. True when this call created the key. */
  setNx(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  expire(key: string, ttlSeconds: number): Promise<void>;
}

// ---------- in-memory ----------

type Entry =
  | { kind: 'zset'; value: Map<string, number> }
  | { kind: 'hash'; value: Map<string, string> }
  | { kind: 'string'; value: string };

// Redis orders equal scores by member, and ZREVRANGE reverses that.
function revOrder(a: ScoredMember, b: ScoredMember): number {
  if (b.score !== a.score) return b.score - a.score;
  return a.member < b.member ? 1 : a.member > b.member ? -1 : 0;
}

export function createMemoryStore(): ArcadeStore {
  const data = new Map<string, Entry>();
  const expiry = new Map<string, number>();

  function live(key: string): Entry | undefined {
    const at = expiry.get(key);
    if (at !== undefined && Date.now() >= at) {
      data.delete(key);
      expiry.delete(key);
    }
    return data.get(key);
  }
  function zset(key: string, create: boolean): Map<string, number> | null {
    const e = live(key);
    if (e?.kind === 'zset') return e.value;
    if (!create) return null;
    const value = new Map<string, number>();
    data.set(key, { kind: 'zset', value });
    return value;
  }
  function hash(key: string, create: boolean): Map<string, string> | null {
    const e = live(key);
    if (e?.kind === 'hash') return e.value;
    if (!create) return null;
    const value = new Map<string, string>();
    data.set(key, { kind: 'hash', value });
    return value;
  }
  function sorted(key: string): ScoredMember[] {
    const z = zset(key, false);
    if (!z) return [];
    return Array.from(z, ([member, score]) => ({ member, score })).sort(revOrder);
  }

  return {
    async zaddGt(key, score, member) {
      const z = zset(key, true)!;
      const prev = z.get(member);
      if (prev === undefined || score > prev) z.set(member, score);
    },
    async zrevrangeWithScores(key, start, stop) {
      return sorted(key).slice(start, stop < 0 ? undefined : stop + 1);
    },
    async zrevrank(key, member) {
      const i = sorted(key).findIndex((m) => m.member === member);
      return i === -1 ? null : i;
    },
    async zscore(key, member) {
      return zset(key, false)?.get(member) ?? null;
    },
    async zrem(key, member) {
      return zset(key, false)?.delete(member) ? 1 : 0;
    },
    async hset(key, field, value) {
      hash(key, true)!.set(field, value);
    },
    async hget(key, field) {
      return hash(key, false)?.get(field) ?? null;
    },
    async hmget(key, fields) {
      const h = hash(key, false);
      return fields.map((f) => h?.get(f) ?? null);
    },
    async get(key) {
      const e = live(key);
      return e?.kind === 'string' ? e.value : null;
    },
    async setNx(key, value, ttlSeconds) {
      if (live(key)) return false;
      data.set(key, { kind: 'string', value });
      expiry.set(key, Date.now() + ttlSeconds * 1000);
      return true;
    },
    async expire(key, ttlSeconds) {
      if (live(key)) expiry.set(key, Date.now() + ttlSeconds * 1000);
    },
  };
}

// ---------- Upstash ----------

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return typeof v === 'string' ? v : JSON.stringify(v);
}

export function createUpstashStore(redis: Redis): ArcadeStore {
  return {
    async zaddGt(key, score, member) {
      await redis.zadd(key, { gt: true }, { score, member });
    },
    async zrevrangeWithScores(key, start, stop) {
      const flat = await redis.zrange<unknown[]>(key, start, stop, { rev: true, withScores: true });
      const out: ScoredMember[] = [];
      for (let i = 0; i + 1 < flat.length; i += 2) {
        out.push({ member: String(flat[i]), score: toNum(flat[i + 1]) ?? 0 });
      }
      return out;
    },
    async zrevrank(key, member) {
      return toNum(await redis.zrevrank(key, member));
    },
    async zscore(key, member) {
      return toNum(await redis.zscore(key, member));
    },
    async zrem(key, member) {
      return (await redis.zrem(key, member)) ?? 0;
    },
    async hset(key, field, value) {
      await redis.hset(key, { [field]: value });
    },
    async hget(key, field) {
      return toStr(await redis.hget(key, field));
    },
    async hmget(key, fields) {
      if (fields.length === 0) return [];
      const rec = await redis.hmget<Record<string, unknown>>(key, ...fields);
      return fields.map((f) => toStr(rec?.[f]));
    },
    async get(key) {
      return toStr(await redis.get(key));
    },
    async setNx(key, value, ttlSeconds) {
      const res = await redis.set(key, value, { nx: true, ex: ttlSeconds });
      return res === 'OK';
    },
    async expire(key, ttlSeconds) {
      await redis.expire(key, ttlSeconds);
    },
  };
}

// ---------- selection ----------

let memory: ArcadeStore | null = null;
let upstash: { url: string; token: string; store: ArcadeStore } | null = null;

/**
 * Pick the store from the env at call time: Upstash when both vars are set,
 * the shared in-memory store otherwise.
 */
export async function getStore(): Promise<ArcadeStore> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    if (upstash && upstash.url === url && upstash.token === token) return upstash.store;
    const { Redis } = await import('@upstash/redis');
    // Raw strings back: the names hash holds JSON we parse ourselves.
    const redis = new Redis({ url, token, automaticDeserialization: false });
    upstash = { url, token, store: createUpstashStore(redis) };
    return upstash.store;
  }
  memory ??= createMemoryStore();
  return memory;
}

/** Tests: drop the in-memory data and any cached Upstash client. */
export function resetStore(): void {
  memory = null;
  upstash = null;
}
