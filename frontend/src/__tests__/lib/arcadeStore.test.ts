import { describe, it, expect, vi, afterEach } from 'vitest';
import { createUpstashStore, getStore, resetStore } from '@/lib/arcade/store';
import type { Redis } from '@upstash/redis';

// With automaticDeserialization off, Upstash hands back raw strings.
function fakeRedis() {
  return {
    zadd: vi.fn(async () => 1),
    zrange: vi.fn(async () => ['dev', '50', 'ana', '20']),
    zrevrank: vi.fn(async () => 3),
    zscore: vi.fn(async () => '50'),
    zrem: vi.fn(async () => 1),
    hset: vi.fn(async () => 1),
    hget: vi.fn(async () => '{"name":"Dev","crown":false}'),
    hmget: vi.fn(async () => ({ dev: '{"name":"Dev","crown":false}', ana: null })),
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    expire: vi.fn(async () => 1),
    incr: vi.fn(async () => 1),
  };
}

describe('Upstash store adapter', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetStore();
  });

  it('translates to the Redis commands the contract names', async () => {
    const r = fakeRedis();
    const s = createUpstashStore(r as unknown as Redis);
    await s.zaddGt('k', 50, 'dev');
    expect(r.zadd).toHaveBeenCalledWith('k', { gt: true }, { score: 50, member: 'dev' });
    expect(await s.zrevrangeWithScores('k', 0, 9)).toEqual([
      { member: 'dev', score: 50 },
      { member: 'ana', score: 20 },
    ]);
    expect(r.zrange).toHaveBeenCalledWith('k', 0, 9, { rev: true, withScores: true });
    expect(await s.zscore('k', 'dev')).toBe(50);
    expect(await s.zrevrank('k', 'dev')).toBe(3);
    expect(await s.hmget('h', ['dev', 'ana'])).toEqual(['{"name":"Dev","crown":false}', null]);
    expect(await s.hmget('h', [])).toEqual([]);
    expect(await s.setNx('n', '1', 60)).toBe(true);
    expect(r.set).toHaveBeenCalledWith('n', '1', { nx: true, ex: 60 });
    r.set.mockResolvedValueOnce(null as unknown as string);
    expect(await s.setNx('n', '1', 60)).toBe(false);
  });

  it('counts with INCR and sets the TTL only when the count starts', async () => {
    const r = fakeRedis();
    const s = createUpstashStore(r as unknown as Redis);
    expect(await s.incr('c', 60)).toBe(1);
    expect(r.expire).toHaveBeenCalledWith('c', 60);
    r.incr.mockResolvedValueOnce(2);
    r.expire.mockClear();
    expect(await s.incr('c', 60)).toBe(2);
    expect(r.expire).not.toHaveBeenCalled();
  });

  it('uses memory without Upstash env and the same instance across calls', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    const a = await getStore();
    await a.hset('h', 'f', 'v');
    expect(await (await getStore()).hget('h', 'f')).toBe('v');
    resetStore();
    expect(await (await getStore()).hget('h', 'f')).toBeNull();
  });
});

describe('shared in-memory store', () => {
  it('is one store across module instances (Next dev loads each route separately)', async () => {
    const { resetStore: reset, getStore: a } = await import('@/lib/arcade/store');
    reset();
    const first = await a();
    await first.zaddGt('arcade:snake:all', 5, 'dev');
    vi.resetModules();
    const fresh = await import('@/lib/arcade/store');
    const second = await fresh.getStore();
    expect(await second.zscore('arcade:snake:all', 'dev')).toBe(5);
    fresh.resetStore();
  });
});
