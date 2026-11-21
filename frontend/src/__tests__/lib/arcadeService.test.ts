import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { startRun, submitScore, getBoard, removeEntry, allKey, weekKey } from '@/lib/arcade/service';
import { getStore, resetStore, createMemoryStore } from '@/lib/arcade/store';
import { resetLimiter, SUBMITS_PER_WINDOW } from '@/lib/arcade/limit';
import { issueToken } from '@/lib/arcade/token';
import type { GameId } from '@/lib/arcade/games';

// Wednesday of ISO week 47.
const T0 = new Date('2026-11-18T12:00:00Z');
let ipSeq = 0;
const nextIp = () => `198.51.100.${++ipSeq}`;

function begin(game: GameId = 'snake'): string {
  const r = startRun(game);
  if (!r.ok) throw new Error(r.message);
  return r.data.token;
}

/** Start a run, let `ms` pass, and post the score. */
async function play(name: string, score: number, opts: { game?: GameId; ms?: number; ip?: string } = {}) {
  const token = begin(opts.game);
  vi.setSystemTime(Date.now() + (opts.ms ?? 60_000));
  return submitScore({ token, name, score }, { ip: opts.ip ?? nextIp() });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  vi.stubEnv('ARCADE_TOKEN_SECRET', 'test-secret');
  vi.stubEnv('ARCADE_CROWN_CODE', '');
  vi.stubEnv('ARCADE_HER_NAME', '');
  resetStore();
  resetLimiter();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('submitScore', () => {
  it('posts a score and reports best, ranks and isTop', async () => {
    const r = await play('Dev', 40);
    expect(r).toEqual({
      ok: true,
      data: { ok: true, name: 'Dev', score: 40, best: 40, crowned: false, rank: { all: 1, week: 1 }, isTop: true },
    });
  });

  it('rejects a bad game at start', () => {
    expect(startRun('tetris')).toMatchObject({ ok: false, status: 400, code: 'bad_game' });
  });

  it('rejects a forged or expired token', async () => {
    const forged = issueToken('snake', 'wrong-secret', Date.now()).token;
    vi.setSystemTime(Date.now() + 10_000);
    expect(await submitScore({ token: forged, name: 'Dev', score: 5 }, { ip: nextIp() })).toMatchObject({
      ok: false, status: 400, code: 'bad_token',
    });
    const token = begin();
    vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000 + 1);
    const r = await submitScore({ token, name: 'Dev', score: 5 }, { ip: nextIp() });
    expect(r).toMatchObject({ ok: false, status: 400, code: 'bad_token' });
    if (!r.ok) expect(r.message).toMatch(/expired/);
  });

  it('accepts one score per run', async () => {
    const token = begin();
    vi.setSystemTime(Date.now() + 30_000);
    expect((await submitScore({ token, name: 'Dev', score: 10 }, { ip: nextIp() })).ok).toBe(true);
    expect(await submitScore({ token, name: 'Dev', score: 11 }, { ip: nextIp() })).toMatchObject({
      ok: false, status: 409, code: 'token_used',
    });
  });

  it('does not burn the run on a bad name, so the player can fix it', async () => {
    const token = begin();
    vi.setSystemTime(Date.now() + 30_000);
    expect(await submitScore({ token, name: 'x', score: 10 }, { ip: nextIp() })).toMatchObject({ code: 'bad_name' });
    expect((await submitScore({ token, name: 'Dev', score: 10 }, { ip: nextIp() })).ok).toBe(true);
  });

  it('rate limits one IP after SUBMITS_PER_WINDOW submits in 10 minutes', async () => {
    for (let i = 0; i < SUBMITS_PER_WINDOW; i++) {
      expect((await play(`p${i}`, 1, { ms: 3000, ip: '203.0.113.9' })).ok).toBe(true);
    }
    expect(await play('pover', 1, { ms: 3000, ip: '203.0.113.9' })).toMatchObject({ status: 429, code: 'rate_limited' });
    expect((await play('p21', 1, { ms: 3000, ip: nextIp() })).ok).toBe(true);
  });

  it('rejects a score that is not a non-negative integer', async () => {
    for (const bad of [-1, 1.5, '10', null, Number.NaN, Infinity]) {
      expect(await play('Dev', bad as number)).toMatchObject({ status: 400, code: 'bad_score' });
    }
  });

  it('applies the plausibility rules with server-measured time', async () => {
    expect(await play('Dev', 5, { ms: 1500 })).toMatchObject({ status: 422, code: 'implausible' });
    expect(await play('Dev', 131, { ms: 10_000 })).toMatchObject({ status: 422, code: 'implausible' });
    expect(await play('Dev', 401, { ms: 3_600_000 })).toMatchObject({ status: 422, code: 'implausible' });
    expect((await play('Dev', 130, { ms: 10_000 })).ok).toBe(true);
    expect((await play('Dev', 0, { ms: 500 })).ok).toBe(true);
  });

  it('keeps the best score when a lower one follows', async () => {
    await play('Dev', 50);
    const r = await play('dev', 20);
    expect(r).toMatchObject({ ok: true, data: { name: 'Dev', score: 20, best: 50 } });
    const store = await getStore();
    expect(await store.zscore(allKey('snake'), 'dev')).toBe(50);
    const board = await getBoard('snake');
    expect(board.ok && board.data.all).toEqual([{ rank: 1, name: 'Dev', score: 50, crown: false }]);
  });

  it('treats names case-insensitively and keeps the first display form', async () => {
    await play('Dev', 10);
    await play('DEV', 30);
    const board = await getBoard('snake');
    expect(board.ok && board.data.all).toEqual([{ rank: 1, name: 'Dev', score: 30, crown: false }]);
  });

  it('keeps games apart', async () => {
    await play('Dev', 10, { game: 'snake' });
    await play('Dev', 200, { game: 'stacker' });
    const snake = await getBoard('snake');
    const stacker = await getBoard('stacker');
    expect(snake.ok && snake.data.all[0].score).toBe(10);
    expect(stacker.ok && stacker.data.all[0].score).toBe(200);
  });
});

describe('crown', () => {
  const CODE = 'moonlight over the bay';
  beforeEach(() => {
    vi.stubEnv('ARCADE_CROWN_CODE', CODE);
    vi.stubEnv('ARCADE_HER_NAME', 'Juniper');
  });

  it('stores the code under her name with a crown', async () => {
    const r = await play(CODE.toUpperCase(), 60);
    expect(r).toMatchObject({ ok: true, data: { name: 'Juniper', crowned: true, isTop: true } });
    const board = await getBoard('snake', 'Juniper');
    expect(board.ok && board.data.all).toEqual([{ rank: 1, name: 'Juniper', score: 60, crown: true }]);
    expect(board.ok && board.data.me).toEqual({ name: 'Juniper', all: { rank: 1, score: 60 }, week: { rank: 1, score: 60 } });
    const store = await getStore();
    expect(await store.zscore(allKey('snake'), CODE)).toBeNull();
  });

  it('the board lookup never confirms a guessed crown code', async () => {
    await play(CODE, 60);
    const guess = await getBoard('snake', CODE);
    expect(guess.ok && guess.data.me).toEqual({ name: CODE, all: null, week: null });
  });

  it('blocks look-alikes of her name: Cyrillic letters, invisible marks, accents', async () => {
    for (const fake of ['Jun\u0456per', 'Juni\u034Fper', 'Jun\u200Biper', 'J\u00FAniper', '\uFF2Auniper']) {
      expect(await play(fake, 60)).toMatchObject({ ok: false });
    }
  });

  it('blocks anyone typing her name', async () => {
    expect(await play('juniper', 60)).toEqual({
      ok: false, status: 400, code: 'name_taken', message: 'That name is taken. Pick another.',
    });
  });
});

describe('getBoard', () => {
  it('returns the top 10 highest first and my rank outside it', async () => {
    for (let i = 1; i <= 12; i++) await play(`player${i}`, i * 5);
    const r = await getBoard('snake', 'player1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.all).toHaveLength(10);
    expect(r.data.all[0]).toEqual({ rank: 1, name: 'player12', score: 60, crown: false });
    expect(r.data.all[9]).toMatchObject({ rank: 10, name: 'player3' });
    expect(r.data.me).toEqual({ name: 'player1', all: { rank: 12, score: 5 }, week: { rank: 12, score: 5 } });
  });

  it('returns me with nulls for a name that has not played, and no me without a name', async () => {
    await play('Dev', 10);
    const withName = await getBoard('snake', 'Nobody');
    expect(withName.ok && withName.data.me).toEqual({ name: 'Nobody', all: null, week: null });
    const without = await getBoard('snake');
    expect(without.ok && without.data.me).toBeNull();
  });

  it('separates this week from all time', async () => {
    await play('Old', 100);
    vi.setSystemTime(new Date('2026-11-25T12:00:00Z'));
    await play('New', 20);
    const r = await getBoard('snake', 'Old');
    if (!r.ok) throw new Error(r.message);
    expect(r.data.all.map((e) => e.name)).toEqual(['Old', 'New']);
    expect(r.data.week).toEqual([{ rank: 1, name: 'New', score: 20, crown: false }]);
    expect(r.data.me).toEqual({ name: 'Old', all: { rank: 1, score: 100 }, week: null });
  });

  it('rejects an unknown game', async () => {
    expect(await getBoard('pong')).toMatchObject({ ok: false, status: 400, code: 'bad_game' });
  });
});

describe('removeEntry', () => {
  it('removes a name from both boards of one game', async () => {
    await play('Cheater', 300, { ms: 3_600_000 });
    await play('Cheater', 300, { game: 'platformer', ms: 3_600_000 });
    const r = await removeEntry('snake', 'CHEATER');
    expect(r).toEqual({ ok: true, data: { ok: true, game: 'snake', name: 'CHEATER', removed: { all: true, week: true } } });
    const snake = await getBoard('snake');
    expect(snake.ok && snake.data.all).toEqual([]);
    expect(snake.ok && snake.data.week).toEqual([]);
    const platformer = await getBoard('platformer');
    expect(platformer.ok && platformer.data.all).toHaveLength(1);
  });
});

describe('memory store', () => {
  it('expires keys and only creates on SET NX once', async () => {
    const s = createMemoryStore();
    expect(await s.setNx('k', '1', 10)).toBe(true);
    expect(await s.setNx('k', '1', 10)).toBe(false);
    vi.setSystemTime(Date.now() + 10_001);
    expect(await s.get('k')).toBeNull();
    expect(await s.setNx('k', '1', 10)).toBe(true);
  });

  it('gives week keys a TTL', async () => {
    await play('Dev', 10);
    const store = await getStore();
    const key = weekKey('snake');
    expect(await store.zscore(key, 'dev')).toBe(10);
    vi.setSystemTime(Date.now() + 41 * 24 * 60 * 60 * 1000);
    expect(await store.zscore(key, 'dev')).toBeNull();
  });
});
