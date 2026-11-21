import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// The Upstash limiter is the external boundary here: a stand-in records how
// it was built and answers what each test needs.
const upstash = vi.hoisted(() => ({
  options: [] as Record<string, unknown>[],
  answer: { success: true, reason: undefined as string | undefined },
}));

vi.mock('@upstash/ratelimit', () => {
  class Ratelimit {
    static slidingWindow = (max: number, window: string) => ({ max, window });
    constructor(opts: Record<string, unknown>) {
      upstash.options.push(opts);
    }
    async limit() {
      return { ...upstash.answer, limit: 1, remaining: 0, reset: 0, pending: Promise.resolve() };
    }
  }
  return { Ratelimit };
});
vi.mock('@upstash/redis', () => ({ Redis: class { constructor() {} } }));

import {
  adminLimited, boardLimited, resetLimiter, secretLimited, startLimited, submitLimited,
} from '@/lib/arcade/limit';

beforeEach(() => {
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token');
  upstash.options.length = 0;
  upstash.answer = { success: true, reason: undefined };
  resetLimiter();
});
afterEach(() => vi.unstubAllEnvs());

describe('Upstash limiters', () => {
  it('every bucket sets an explicit timeout', async () => {
    for (const check of [submitLimited, secretLimited, boardLimited, startLimited, adminLimited]) await check('203.0.113.1');
    expect(upstash.options).toHaveLength(5);
    for (const opts of upstash.options) {
      expect(opts.timeout).toEqual(expect.any(Number));
      expect(opts.timeout as number).toBeGreaterThan(0);
      expect(opts.timeout as number).toBeLessThan(5000);
    }
  });

  it('a timed-out check blocks a crown code try', async () => {
    upstash.answer = { success: true, reason: 'timeout' };
    expect(await secretLimited('203.0.113.1')).toBe(true);
  });

  it('a timed-out check lets a score, a board read and a start through', async () => {
    upstash.answer = { success: true, reason: 'timeout' };
    expect(await submitLimited('203.0.113.1')).toBe(false);
    expect(await boardLimited('203.0.113.1')).toBe(false);
    expect(await startLimited('203.0.113.1')).toBe(false);
  });

  it('a refused check blocks', async () => {
    upstash.answer = { success: false, reason: undefined };
    expect(await secretLimited('203.0.113.1')).toBe(true);
    expect(await submitLimited('203.0.113.1')).toBe(true);
  });
});
