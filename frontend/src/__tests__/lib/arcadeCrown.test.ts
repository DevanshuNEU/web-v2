import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetStore } from '@/lib/arcade/store';
import { resetLimiter } from '@/lib/arcade/limit';
import { resetCrownWarning } from '@/lib/arcade/crown';
import { POST as start } from '@/app/api/arcade/start/route';
import { POST as score } from '@/app/api/arcade/score/route';
import { POST as unlock } from '@/app/api/arcade/secret/route';

// A strong code: 16+ characters. Placeholder name, not a real person.
const CODE = 'moonlight over the bay';
const HER = 'Juniper';

let ipSeq = 0;
const nextIp = () => `198.51.100.${(++ipSeq % 250) + 1}`;

function req(path: string, body: unknown, ip = nextIp()) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': ip },
    body: JSON.stringify(body),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

async function token(game = 'snake'): Promise<string> {
  const res = await start(req('/api/arcade/start', { game }));
  return (await res.json()).token;
}

/** Start a run, let a minute pass, post `name`. */
async function post(name: string, points = 10, tok?: string) {
  const t = tok ?? (await token());
  vi.setSystemTime(Date.now() + 60_000);
  return score(req('/api/arcade/score', { token: t, name, score: points }));
}

const tryCode = (code: unknown) => unlock(req('/api/arcade/secret', { code }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-18T12:00:00Z'));
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  vi.stubEnv('ARCADE_TOKEN_SECRET', 'test-secret');
  vi.stubEnv('ARCADE_CROWN_CODE', CODE);
  vi.stubEnv('ARCADE_HER_NAME', HER);
  vi.stubEnv('ARCADE_SECRET_MESSAGE', 'hello');
  vi.stubEnv('ARCADE_STORY', '');
  resetStore();
  resetLimiter();
  resetCrownWarning();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('a weak crown code turns the crown off', () => {
  it('matches nothing when ARCADE_CROWN_CODE is under 16 characters, and warns once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('ARCADE_CROWN_CODE', 'moonlight');
    expect((await tryCode('moonlight')).status).toBe(403);
    expect((await tryCode('moonlight')).status).toBe(403);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/16/);
  });

  it('a strong code still opens the secret and crowns a score', async () => {
    expect((await tryCode(`  ${CODE.toUpperCase()} `)).status).toBe(200);
    const res = await post(CODE);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ name: HER, crowned: true });
  });
});

describe('a global cap on wrong codes per UTC day', () => {
  it('after 50 wrong codes in a day, even the right code gets the wrong-code answer', async () => {
    const wrong = await (await tryCode('not the code at all, sorry')).json();
    for (let i = 1; i < 50; i++) expect((await tryCode(`wrong guess number ${i}`)).status).toBe(403);
    const res = await tryCode(CODE);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual(wrong);
  });

  it('opens again on the next UTC day', async () => {
    for (let i = 0; i < 50; i++) await tryCode(`wrong guess number ${i}`);
    expect((await tryCode(CODE)).status).toBe(403);
    vi.setSystemTime(new Date('2026-11-19T00:00:01Z'));
    expect((await tryCode(CODE)).status).toBe(200);
  });

  it('counts code attempts on /score and /secret together', async () => {
    for (let i = 0; i < 25; i++) expect((await post(`wrong guess number ${i}`)).status).toBe(403);
    for (let i = 0; i < 25; i++) await tryCode(`wrong guess number ${i}`);
    const res = await post(CODE);
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe('not_crowned');
    expect((await tryCode(CODE)).status).toBe(403);
  });

  it('never counts an ordinary bad name as a wrong code', async () => {
    for (let i = 0; i < 60; i++) expect((await post(i % 2 ? 'x' : 'dev!')).status).toBe(400);
    expect(await (await post(CODE)).json()).toMatchObject({ name: HER, crowned: true });
  });
});

describe('code attempts on /score', () => {
  it('a wrong code gets one generic answer that does not echo the code', async () => {
    const res = await post('definitely not the code');
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe('not_crowned');
    expect(JSON.stringify(json)).not.toContain(CODE);
    expect(json.error.message).not.toMatch(/[\u2013\u2014]/);
  });

  it('every code attempt uses up the run token, right or wrong', async () => {
    const t1 = await token();
    expect((await post('definitely not the code', 10, t1)).status).toBe(403);
    expect((await (await post('Dev', 10, t1)).json()).error.code).toBe('token_used');
    const t2 = await token();
    expect((await post(CODE, 10, t2)).status).toBe(200);
    expect((await post(CODE, 10, t2)).status).toBe(409);
  });

  it('a code attempt is refused when no crown is set, with the same answer', async () => {
    const wrong = await (await post('definitely not the code')).json();
    vi.stubEnv('ARCADE_CROWN_CODE', '');
    expect(await (await post(CODE)).json()).toEqual(wrong);
    vi.stubEnv('ARCADE_CROWN_CODE', CODE);
    vi.stubEnv('ARCADE_HER_NAME', '');
    expect(await (await post(CODE)).json()).toEqual(wrong);
  });
});
