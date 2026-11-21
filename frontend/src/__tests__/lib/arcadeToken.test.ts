import { describe, it, expect, afterEach, vi } from 'vitest';
import { issueToken, verifyToken, tokenSecret, TOKEN_TTL_MS } from '@/lib/arcade/token';
import { checkPlausible, RULES } from '@/lib/arcade/rules';
import { isoWeek } from '@/lib/arcade/week';
import { isGame } from '@/lib/arcade/games';

const SECRET = 'test-secret';
const T0 = Date.UTC(2026, 10, 18, 12);

describe('arcade run tokens', () => {
  it('verifies a token it signed and returns the payload', () => {
    const { token, expiresAt, payload } = issueToken('snake', SECRET, T0);
    expect(expiresAt).toBe(T0 + TOKEN_TTL_MS);
    const v = verifyToken(token, SECRET, T0 + 1000);
    expect(v).toEqual({ ok: true, payload });
    expect(payload.game).toBe('snake');
    expect(payload.startedAt).toBe(T0);
  });

  it('gives every token a fresh nonce', () => {
    const a = issueToken('snake', SECRET, T0).payload.nonce;
    const b = issueToken('snake', SECRET, T0).payload.nonce;
    expect(a).not.toBe(b);
  });

  it('rejects a token signed with another secret', () => {
    const { token } = issueToken('snake', 'other', T0);
    expect(verifyToken(token, SECRET, T0)).toEqual({ ok: false, reason: 'signature' });
  });

  it('rejects a tampered payload', () => {
    const { token } = issueToken('snake', SECRET, T0);
    const [, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ game: 'snake', startedAt: T0 - 3_600_000, nonce: 'x' })).toString('base64url');
    expect(verifyToken(`${forged}.${sig}`, SECRET, T0)).toEqual({ ok: false, reason: 'signature' });
  });

  it('rejects garbage', () => {
    for (const bad of [undefined, 42, '', 'abc', 'a.b.c', '.x']) {
      expect(verifyToken(bad, SECRET, T0).ok).toBe(false);
    }
  });

  it('expires after two hours', () => {
    const { token } = issueToken('stacker', SECRET, T0);
    expect(verifyToken(token, SECRET, T0 + TOKEN_TTL_MS).ok).toBe(true);
    expect(verifyToken(token, SECRET, T0 + TOKEN_TTL_MS + 1)).toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects a start time in the future', () => {
    const { token } = issueToken('stacker', SECRET, T0 + 60_000);
    expect(verifyToken(token, SECRET, T0)).toEqual({ ok: false, reason: 'future' });
  });
});

describe('token secret', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('prefers ARCADE_TOKEN_SECRET', () => {
    vi.stubEnv('ARCADE_TOKEN_SECRET', 'explicit');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'up');
    expect(tokenSecret()).toBe('explicit');
  });

  it('derives from the Upstash token without exposing it', () => {
    vi.stubEnv('ARCADE_TOKEN_SECRET', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'up');
    const s = tokenSecret();
    expect(s).toBeTruthy();
    expect(s).not.toContain('up');
  });

  it('uses a dev string outside production and nothing in production', () => {
    vi.stubEnv('ARCADE_TOKEN_SECRET', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    vi.stubEnv('NODE_ENV', 'test');
    expect(tokenSecret()).toBeTruthy();
    vi.stubEnv('NODE_ENV', 'production');
    expect(tokenSecret()).toBeNull();
  });
});

describe('plausibility rules', () => {
  it('accepts an honest snake run', () => {
    expect(checkPlausible('snake', 40, 60_000)).toEqual({ ok: true });
    expect(checkPlausible('snake', 0, 2000)).toEqual({ ok: true });
  });

  it('rejects any score under two seconds, zero included', () => {
    expect(checkPlausible('snake', 1, 1999)).toEqual({ ok: false, reason: 'too_fast' });
    expect(checkPlausible('snake', 0, 100)).toEqual({ ok: false, reason: 'too_fast' });
  });

  it('rejects more points than the run length allows', () => {
    // 12 per second * 10 s + 10 = 130
    expect(checkPlausible('snake', 130, 10_000)).toEqual({ ok: true });
    expect(checkPlausible('snake', 131, 10_000)).toEqual({ ok: false, reason: 'too_high' });
  });

  it('enforces the hard cap whatever the duration', () => {
    expect(checkPlausible('snake', RULES.snake.cap + 1, 3_600_000)).toEqual({ ok: false, reason: 'over_cap' });
    expect(checkPlausible('stacker', RULES.stacker.cap, 3_600_000)).toEqual({ ok: true });
  });
});

describe('games and weeks', () => {
  it('knows the four games', () => {
    expect(['snake', 'platformer', 'stacker', 'endless'].every(isGame)).toBe(true);
    // Brainrot Evolution was removed from the arcade.
    expect(isGame('merge')).toBe(false);
    expect(isGame('tetris')).toBe(false);
    expect(isGame(undefined)).toBe(false);
  });

  it('labels UTC ISO weeks, including year edges', () => {
    expect(isoWeek(Date.UTC(2026, 10, 18))).toBe('2026-W47');
    expect(isoWeek(Date.UTC(2021, 0, 3))).toBe('2020-W53');
    expect(isoWeek(Date.UTC(2024, 11, 30))).toBe('2025-W01');
  });
});

describe('score caps sit near what a perfect run can reach', () => {
  it('snake: a 20x20 board holds at most 399 snacks', () => {
    expect(RULES.snake.cap).toBe(399);
  });
  it('platformer: exactly a perfect Story run (128,230 for chapters 1 to 4)', () => {
    // Derived from the level data in src/__tests__/apps/platformerScore.test.ts.
    expect(RULES.platformer.cap).toBe(128_230);
    expect(checkPlausible('platformer', 128_230, 3_600_000)).toEqual({ ok: true });
    expect(checkPlausible('platformer', 128_231, 3_600_000)).toEqual({ ok: false, reason: 'over_cap' });
  });
});

describe('Endless has its own board', () => {
  it('a great Endless run (22,000, about 4 minutes) passes on the endless board', () => {
    expect(checkPlausible('endless', 22_000, 240_000)).toEqual({ ok: true });
  });
  it('the endless cap covers the best Endless run and stays within 15 percent of it', () => {
    expect(RULES.endless.cap).toBeGreaterThanOrEqual(22_000);
    expect(RULES.endless.cap).toBeLessThanOrEqual(22_000 * 1.15);
  });
});
