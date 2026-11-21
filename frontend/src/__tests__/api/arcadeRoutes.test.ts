import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetStore } from '@/lib/arcade/store';
import { resetLimiter } from '@/lib/arcade/limit';
import { POST as start } from '@/app/api/arcade/start/route';
import { POST as score } from '@/app/api/arcade/score/route';
import { GET as board } from '@/app/api/arcade/board/route';
import { DELETE as admin } from '@/app/api/arcade/admin/route';
import { GET as secret, POST as unlock } from '@/app/api/arcade/secret/route';

let ipSeq = 0;
const nextIp = () => `198.51.100.${++ipSeq}`;

function post(path: string, body: unknown, headers: Record<string, string> = {}, method = 'POST') {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-real-ip': nextIp(), ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const get = (path: string, ip?: string) => new Request(`http://localhost${path}`, ip ? { headers: { 'x-real-ip': ip } } : {}) as any;

async function run(game: string, name: string, points: number) {
  const res = await start(post('/api/arcade/start', { game }));
  const { token } = await res.json();
  vi.setSystemTime(Date.now() + 60_000);
  return score(post('/api/arcade/score', { token, name, score: points }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-18T12:00:00Z'));
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  vi.stubEnv('ARCADE_TOKEN_SECRET', 'test-secret');
  vi.stubEnv('ARCADE_ADMIN_TOKEN', '');
  vi.stubEnv('ARCADE_CROWN_CODE', '');
  vi.stubEnv('ARCADE_HER_NAME', '');
  vi.stubEnv('ARCADE_SECRET_MESSAGE', '');
  vi.stubEnv('ARCADE_STORY', '');
  resetStore();
  resetLimiter();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('POST /api/arcade/start', () => {
  it('returns a token and its expiry', async () => {
    const res = await start(post('/api/arcade/start', { game: 'stacker' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(typeof json.token).toBe('string');
    expect(json.expiresAt).toBe(Date.now() + 2 * 60 * 60 * 1000);
  });

  it('is never cached', async () => {
    expect((await start(post('/api/arcade/start', { game: 'snake' }))).headers.get('cache-control')).toBe('no-store');
  });

  it('rate limits one network to 60 run starts in 10 minutes', async () => {
    const ip = { 'x-real-ip': '203.0.113.50' };
    for (let i = 0; i < 60; i++) expect((await start(post('/api/arcade/start', { game: 'snake' }, ip))).status).toBe(200);
    const limited = await start(post('/api/arcade/start', { game: 'snake' }, ip));
    expect(limited.status).toBe(429);
    expect((await limited.json()).error.code).toBe('rate_limited');
    expect((await start(post('/api/arcade/start', { game: 'snake' }))).status).toBe(200);
    vi.setSystemTime(Date.now() + 10 * 60 * 1000 + 1);
    expect((await start(post('/api/arcade/start', { game: 'snake' }, ip))).status).toBe(200);
  });

  it('rejects an unknown game or a missing body', async () => {
    const res = await start(post('/api/arcade/start', { game: 'pong' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('bad_game');
    const empty = await start(post('/api/arcade/start', 'not json'));
    expect(empty.status).toBe(400);
  });
});

describe('POST /api/arcade/score', () => {
  it('posts a score in the contract shape', async () => {
    const res = await run('snake', 'Dev', 42);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true, name: 'Dev', score: 42, best: 42, crowned: false, rank: { all: 1, week: 1 }, isTop: true,
    });
  });

  it('answers errors as { error: { code, message } }', async () => {
    const res = await score(post('/api/arcade/score', { token: 'nope', name: 'Dev', score: 1 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('bad_token');
    expect(json.error.message).toMatch(/Start a new run/);
    expect(json.error.message).not.toMatch(/[\u2013\u2014!]/);
  });

  it('returns 409 on a reused token and 422 on an implausible score', async () => {
    const res = await start(post('/api/arcade/start', { game: 'snake' }));
    const { token } = await res.json();
    vi.setSystemTime(Date.now() + 10_000);
    expect((await score(post('/api/arcade/score', { token, name: 'Dev', score: 500 }))).status).toBe(422);
    expect((await score(post('/api/arcade/score', { token, name: 'Dev', score: 5 }))).status).toBe(200);
    const again = await score(post('/api/arcade/score', { token, name: 'Dev', score: 5 }));
    expect(again.status).toBe(409);
    expect((await again.json()).error.code).toBe('token_used');
  });
});

describe('GET /api/arcade/board', () => {
  it('returns both boards and me, uncached', async () => {
    await run('snake', 'Dev', 42);
    const res = await board(get('/api/arcade/board?game=snake&name=dev'));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({
      game: 'snake',
      all: [{ rank: 1, name: 'Dev', score: 42, crown: false }],
      week: [{ rank: 1, name: 'Dev', score: 42, crown: false }],
      me: { name: 'Dev', all: { rank: 1, score: 42 }, week: { rank: 1, score: 42 } },
    });
  });

  it('rejects an unknown game', async () => {
    const res = await board(get('/api/arcade/board?game=pong'));
    expect(res.status).toBe(400);
  });
  it('lets the CDN cache the public board for 10 seconds, with nothing personal in it', async () => {
    await run('snake', 'Dev', 42);
    const res = await board(get('/api/arcade/board?game=snake'));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, s-maxage=10, stale-while-revalidate=30');
    expect(res.headers.get('set-cookie')).toBeNull();
    const json = await res.json();
    expect(json.me).toBeNull();
    expect(Object.keys(json).sort()).toEqual(['all', 'game', 'me', 'week']);
  });

  it('never caches a board asked for with a name, or an error', async () => {
    expect((await board(get('/api/arcade/board?game=snake&name=Dev'))).headers.get('cache-control')).toBe('no-store');
    expect((await board(get('/api/arcade/board?game=pong'))).headers.get('cache-control')).toBe('no-store');
  });

  it('rate limits one network to 120 board reads a minute', async () => {
    const ip = '203.0.113.40';
    for (let i = 0; i < 120; i++) expect((await board(get('/api/arcade/board?game=snake', ip))).status).toBe(200);
    const limited = await board(get('/api/arcade/board?game=snake', ip));
    expect(limited.status).toBe(429);
    expect(limited.headers.get('cache-control')).toBe('no-store');
    expect((await board(get('/api/arcade/board?game=snake', '203.0.113.41'))).status).toBe(200);
    vi.setSystemTime(Date.now() + 61_000);
    expect((await board(get('/api/arcade/board?game=snake', ip))).status).toBe(200);
  });
});

describe('DELETE /api/arcade/admin', () => {
  const del = (body: unknown, auth?: string) =>
    admin(post('/api/arcade/admin', body, auth ? { authorization: auth } : {}, 'DELETE'));

  it('is off (404) without ARCADE_ADMIN_TOKEN', async () => {
    expect((await del({ game: 'snake', name: 'Dev' }, 'Bearer anything')).status).toBe(404);
  });

  it('needs the matching bearer token', async () => {
    vi.stubEnv('ARCADE_ADMIN_TOKEN', 'admin-secret');
    expect((await del({ game: 'snake', name: 'Dev' })).status).toBe(401);
    expect((await del({ game: 'snake', name: 'Dev' }, 'Bearer wrong')).status).toBe(401);
    expect((await del({ game: 'snake', name: 'Dev' }, 'admin-secret')).status).toBe(401);
  });

  it('removes a name from that game', async () => {
    vi.stubEnv('ARCADE_ADMIN_TOKEN', 'admin-secret');
    await run('snake', 'Dev', 42);
    const res = await del({ game: 'snake', name: 'dev' }, 'Bearer admin-secret');
    expect(res.status).toBe(200);
    expect((await res.json()).removed).toEqual({ all: true, week: true });
    const after = await (await board(get('/api/arcade/board?game=snake'))).json();
    expect(after.all).toEqual([]);
  });
});

describe('GET /api/arcade/secret: the public part', () => {
  it('is 404 not_set until her name exists', async () => {
    const res = await secret();
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('not_set');
  });

  it('returns only her name (already public on the board), never the message or story', async () => {
    vi.stubEnv('ARCADE_HER_NAME', 'Juniper');
    vi.stubEnv('ARCADE_SECRET_MESSAGE', 'hello');
    vi.stubEnv('ARCADE_STORY', JSON.stringify({ 'card-1': 'where we met' }));
    const res = await secret();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ name: 'Juniper' });
  });
});

describe('POST /api/arcade/secret: only for the crowned device', () => {
  beforeEach(() => {
    vi.stubEnv('ARCADE_CROWN_CODE', 'moonlight over the bay');
    vi.stubEnv('ARCADE_HER_NAME', 'Juniper');
    vi.stubEnv('ARCADE_SECRET_MESSAGE', 'hello');
    vi.stubEnv('ARCADE_STORY', JSON.stringify({ 'card-1': 'where we met', 'mem-1-1-a': 'the first song' }));
  });

  it('opens the message and the personal story with the right code, any case and spacing', async () => {
    const res = await unlock(post('/api/arcade/secret', { code: '  MoonLight Over The Bay ' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({
      name: 'Juniper', message: 'hello', story: { 'card-1': 'where we met', 'mem-1-1-a': 'the first song' },
    });
  });

  it('refuses a wrong or missing code without saying anything about the real one', async () => {
    for (const body of [{ code: 'moonlite' }, { code: '' }, {}, { code: 42 }]) {
      const res = await unlock(post('/api/arcade/secret', body));
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('not_crowned');
      expect(JSON.stringify(json)).not.toContain('hello');
      expect(JSON.stringify(json)).not.toContain('moonlight over');
    }
  });

  it('is 404 when no crown code is configured, so an empty code never matches', async () => {
    vi.stubEnv('ARCADE_CROWN_CODE', '');
    const res = await unlock(post('/api/arcade/secret', { code: '' }));
    expect(res.status).toBe(404);
  });

  it('rate limits guesses from one network', async () => {
    const ip = { 'x-real-ip': '203.0.113.77' };
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await unlock(post('/api/arcade/secret', { code: `guess${i}` }, ip))).status;
    expect(last).toBe(429);
    // The right code is still refused while the network is limited.
    expect((await unlock(post('/api/arcade/secret', { code: 'moonlight over the bay' }, ip))).status).toBe(429);
  });

  it('ignores a malformed story and caps long or non-string lines', async () => {
    vi.stubEnv('ARCADE_STORY', '{not json');
    expect((await (await unlock(post('/api/arcade/secret', { code: 'moonlight over the bay' }))).json()).story).toEqual({});
    vi.stubEnv('ARCADE_STORY', JSON.stringify({ a: 'x'.repeat(500), b: 7, c: 'ok' }));
    const story = (await (await unlock(post('/api/arcade/secret', { code: 'moonlight over the bay' }))).json()).story;
    expect(story.a.length).toBe(280);
    expect(story).not.toHaveProperty('b');
    expect(story.c).toBe('ok');
  });
});
