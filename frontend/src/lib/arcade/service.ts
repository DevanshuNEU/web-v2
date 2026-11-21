import { GAMES, isGame, type GameId } from './games';
import { checkPlausible, MIN_DURATION_MS } from './rules';
import { crownEnv, crownedName, nameKey, resolveName, type NameCheck } from './names';
import { checkCrownCode, crownCode, isCodeAttempt, sameCode } from './crown';
import { getStore, type ArcadeStore } from './store';
import { issueToken, tokenSecret, verifyToken, TOKEN_TTL_MS } from './token';
import { isoWeek } from './week';
import { submitLimited } from './limit';

/**
 * Leaderboard logic. Routes stay thin: they parse the request, call one of
 * these, and turn the Result into a response.
 */

export type ArcadeError = { ok: false; status: number; code: string; message: string };
export type Result<T> = { ok: true; data: T } | ArcadeError;

export type Entry = { rank: number; name: string; score: number; crown: boolean };
export type Standing = { rank: number; score: number } | null;

export type SubmitData = {
  ok: true;
  name: string;
  score: number;
  best: number;
  crowned: boolean;
  rank: { all: number | null; week: number | null };
  isTop: boolean;
};

export type BoardData = {
  game: GameId;
  all: Entry[];
  week: Entry[];
  me: { name: string; all: Standing; week: Standing } | null;
};

export const BOARD_SIZE = 10;
const WEEK_TTL_SECONDS = 40 * 24 * 60 * 60;
// Used nonces outlive the token by a few minutes, so a token can never be
// valid while its nonce has already been forgotten.
const NONCE_TTL_SECONDS = Math.ceil(TOKEN_TTL_MS / 1000) + 10 * 60;
const NAMES_KEY = 'arcade:names';

export const allKey = (game: GameId) => `arcade:${game}:all`;
export const weekKey = (game: GameId, now = Date.now()) => `arcade:${game}:week:${isoWeek(now)}`;
const nonceKey = (nonce: string) => `arcade:nonce:${nonce}`;

function fail(status: number, code: string, message: string): ArcadeError {
  return { ok: false, status, code, message };
}

export const BAD_GAME = (game: unknown) =>
  fail(
    400,
    'bad_game',
    `${typeof game === 'string' && game ? `"${game.slice(0, 20)}" is not` : 'That is not'} an arcade game. Use ${GAMES.slice(0, -1).join(', ')} or ${GAMES[GAMES.length - 1]}.`,
  );

const UNCONFIGURED = fail(
  503,
  'unconfigured',
  'The leaderboard has no signing secret configured. Set ARCADE_TOKEN_SECRET on the server.',
);

// One answer for every refused code: wrong, over today's cap, or crown off.
const NOT_CROWNED = fail(
  403,
  'not_crowned',
  'That is too long for a name (12 characters at most) and it did not work as a code, so this round was not posted. Play another round to post under a name.',
);

type NameRecord = { name: string; crown: boolean };

function parseRecord(raw: string | null): NameRecord | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Partial<NameRecord>;
    if (typeof r?.name !== 'string') return null;
    return { name: r.name, crown: r.crown === true };
  } catch {
    return null;
  }
}

async function standing(store: ArcadeStore, key: string, member: string): Promise<Standing> {
  const [rank, score] = await Promise.all([store.zrevrank(key, member), store.zscore(key, member)]);
  if (rank === null || score === null) return null;
  return { rank: rank + 1, score };
}

// ---------- start ----------

export function startRun(game: unknown, now = Date.now()): Result<{ token: string; expiresAt: number }> {
  if (!isGame(game)) return BAD_GAME(game);
  const secret = tokenSecret();
  if (!secret) return UNCONFIGURED;
  const { token, expiresAt } = issueToken(game, secret, now);
  return { ok: true, data: { token, expiresAt } };
}

// ---------- submit ----------

export type SubmitInput = { token?: unknown; name?: unknown; score?: unknown };

export async function submitScore(input: SubmitInput, ctx: { ip: string; now?: number }): Promise<Result<SubmitData>> {
  const now = ctx.now ?? Date.now();
  const secret = tokenSecret();
  if (!secret) return UNCONFIGURED;

  const verified = verifyToken(input.token, secret, now);
  if (!verified.ok) {
    return fail(
      400,
      'bad_token',
      verified.reason === 'expired'
        ? 'This run started more than 2 hours ago, so its token expired. Start a new run to post a score.'
        : 'This run token is missing or invalid, so the score cannot be checked. Start a new run to post a score.',
    );
  }
  const { game, startedAt, nonce } = verified.payload;

  const store = await getStore();
  const usedMsg = 'This run already posted a score. Start a new run to post another.';
  if (await store.get(nonceKey(nonce))) return fail(409, 'token_used', usedMsg);

  if (await submitLimited(ctx.ip)) {
    return fail(
      429,
      'rate_limited',
      'Too many scores from this connection in the last 10 minutes. Wait a few minutes, then post again.',
    );
  }

  const score = input.score;
  if (typeof score !== 'number' || !Number.isSafeInteger(score) || score < 0) {
    return fail(400, 'bad_score', 'The score has to be a whole number, 0 or more. Send it as a number.');
  }

  const plausible = checkPlausible(game, score, now - startedAt);
  if (!plausible.ok) {
    return fail(
      422,
      'implausible',
      plausible.reason === 'too_fast'
        ? `That run ended too quickly to count. Play for at least ${MIN_DURATION_MS / 1000} seconds, then post again.`
        : 'That score is higher than this run could reach in the time it took, so it was not posted. Play a fresh run and post that.',
    );
  }

  let resolved: Extract<NameCheck, { ok: true }>;
  if (isCodeAttempt(input.name)) {
    // Too long for a name, so it is a crown code attempt. Every attempt uses
    // up the run first, so each guess costs a fresh /start token.
    if (!(await store.setNx(nonceKey(nonce), '1', NONCE_TTL_SECONDS))) return fail(409, 'token_used', usedMsg);
    const herName = crownEnv().herName;
    // A code with no name to store under would leak the code onto the board.
    if (!(await checkCrownCode(input.name, now)) || !herName) return NOT_CROWNED;
    resolved = crownedName(herName);
  } else {
    const named = resolveName(input.name);
    if (!named.ok) return fail(400, named.code, named.message);
    resolved = named;
    // Claim the nonce last, so a bad name does not burn the run: the player
    // can fix the name and post the same run again.
    if (!(await store.setNx(nonceKey(nonce), '1', NONCE_TTL_SECONDS))) return fail(409, 'token_used', usedMsg);
  }
  const { key, crowned } = resolved;

  const existing = parseRecord(await store.hget(NAMES_KEY, key));
  let display = existing?.name ?? resolved.display;
  if (crowned) {
    display = resolved.display;
    await store.hset(NAMES_KEY, key, JSON.stringify({ name: display, crown: true }));
  } else if (!existing) {
    await store.hset(NAMES_KEY, key, JSON.stringify({ name: display, crown: false }));
  }

  const aKey = allKey(game);
  const wKey = weekKey(game, now);
  await Promise.all([store.zaddGt(aKey, score, key), store.zaddGt(wKey, score, key)]);
  await store.expire(wKey, WEEK_TTL_SECONDS);

  const [best, allRank, weekRank] = await Promise.all([
    store.zscore(aKey, key),
    store.zrevrank(aKey, key),
    store.zrevrank(wKey, key),
  ]);
  const rank = {
    all: allRank === null ? null : allRank + 1,
    week: weekRank === null ? null : weekRank + 1,
  };
  return {
    ok: true,
    data: {
      ok: true,
      name: display,
      score,
      best: best ?? score,
      crowned,
      rank,
      isTop: rank.all === 1,
    },
  };
}

// ---------- board ----------

/** The storage key for a name typed by the admin (the crown code resolves to her name). */
function lookupKey(raw: string): string {
  const { herName } = crownEnv();
  if (herName && sameCode(raw, crownCode())) return nameKey(herName.normalize('NFC'));
  return nameKey(raw.replace(/ {2,}/g, ' '));
}

async function topEntries(store: ArcadeStore, key: string): Promise<Entry[]> {
  const top = await store.zrevrangeWithScores(key, 0, BOARD_SIZE - 1);
  const records = await store.hmget(NAMES_KEY, top.map((t) => t.member));
  return top.map((t, i) => {
    const rec = parseRecord(records[i]);
    return { rank: i + 1, name: rec?.name ?? t.member, score: t.score, crown: rec?.crown ?? false };
  });
}

export async function getBoard(game: unknown, name?: string | null, now = Date.now()): Promise<Result<BoardData>> {
  if (!isGame(game)) return BAD_GAME(game);
  const store = await getStore();
  const aKey = allKey(game);
  const wKey = weekKey(game, now);
  const [all, week] = await Promise.all([topEntries(store, aKey), topEntries(store, wKey)]);

  let me: BoardData['me'] = null;
  const typed = typeof name === 'string' ? name.normalize('NFC').trim() : '';
  if (typed) {
    // A plain lookup, never through the crown code: this route has no rate
    // limit, so resolving the code here would let anyone guess it.
    const key = nameKey(typed.replace(/ {2,}/g, ' '));
    const [rec, meAll, meWeek] = await Promise.all([
      store.hget(NAMES_KEY, key).then(parseRecord),
      standing(store, aKey, key),
      standing(store, wKey, key),
    ]);
    me = { name: rec?.name ?? typed.slice(0, 40), all: meAll, week: meWeek };
  }
  return { ok: true, data: { game, all, week, me } };
}

// ---------- admin ----------

export async function removeEntry(
  game: unknown,
  name: unknown,
  now = Date.now(),
): Promise<Result<{ ok: true; game: GameId; name: string; removed: { all: boolean; week: boolean } }>> {
  if (!isGame(game)) return BAD_GAME(game);
  if (typeof name !== 'string' || !name.trim()) {
    return fail(400, 'bad_name', 'Send the name to remove as text.');
  }
  const store = await getStore();
  const key = lookupKey(name.normalize('NFC').trim());
  const [a, w] = await Promise.all([store.zrem(allKey(game), key), store.zrem(weekKey(game, now), key)]);
  return { ok: true, data: { ok: true, game, name: name.trim(), removed: { all: a > 0, week: w > 0 } } };
}
