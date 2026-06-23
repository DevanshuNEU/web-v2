import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '@/lib/rateLimit';

/**
 * In-memory path only. Upstash env is not set in tests, so the always-on
 * sliding-window fallback is exercised. Each limiter instance keeps its own
 * state, so a different prefix must not see another's hits.
 */

describe('createRateLimiter (in-memory path)', () => {
  it('allows requests under the per-minute limit', async () => {
    const limiter = createRateLimiter({ prefix: 'test-under', perMinute: 3, dailyCeiling: 100 });
    for (let i = 0; i < 3; i++) {
      const { tooMany } = await limiter.limit('1.1.1.1');
      expect(tooMany).toBe(false);
    }
  });

  it('blocks once the per-minute limit is exceeded', async () => {
    const limiter = createRateLimiter({ prefix: 'test-over', perMinute: 3, dailyCeiling: 100 });
    for (let i = 0; i < 3; i++) {
      expect((await limiter.limit('2.2.2.2')).tooMany).toBe(false);
    }
    expect((await limiter.limit('2.2.2.2')).tooMany).toBe(true);
  });

  it('keeps state independent across separate prefixes', async () => {
    const a = createRateLimiter({ prefix: 'test-a', perMinute: 2, dailyCeiling: 100 });
    const b = createRateLimiter({ prefix: 'test-b', perMinute: 2, dailyCeiling: 100 });

    // Exhaust limiter a for this IP.
    expect((await a.limit('3.3.3.3')).tooMany).toBe(false);
    expect((await a.limit('3.3.3.3')).tooMany).toBe(false);
    expect((await a.limit('3.3.3.3')).tooMany).toBe(true);

    // Limiter b has its own state, same IP is still fresh.
    expect((await b.limit('3.3.3.3')).tooMany).toBe(false);
    expect((await b.limit('3.3.3.3')).tooMany).toBe(false);
  });
});
