import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetStore } from '@/lib/arcade/store';
import { resetLimiter } from '@/lib/arcade/limit';
import { POST as start } from '@/app/api/arcade/start/route';
import { POST as score } from '@/app/api/arcade/score/route';
import { GET as board } from '@/app/api/arcade/board/route';
import { DELETE as admin } from '@/app/api/arcade/admin/route';
import { GET as secret } from '@/app/api/arcade/secret/route';

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
const get = (path: string) => new Request(`http://localhost${path}`) as any;

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

describe('GET /api/arcade/secret', () => {
  it('is 404 not_set until both values exist', async () => {
    vi.stubEnv('ARCADE_HER_NAME', 'Juniper');
    const res = await secret();
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('not_set');
  });

  it('returns the name and message, uncached', async () => {
    vi.stubEnv('ARCADE_HER_NAME', 'Juniper');
    vi.stubEnv('ARCADE_SECRET_MESSAGE', 'hello');
    const res = await secret();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ name: 'Juniper', message: 'hello' });
  });
});
