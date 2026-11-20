/**
 * Client for the global arcade leaderboard (src/app/api/arcade/*).
 *
 * Every call degrades quietly: if the board is unreachable the game still
 * plays and the local best still saves; the game-over card says so.
 */

export type ArcadeGame = 'snake' | 'platformer' | 'stacker' | 'merge';

export interface BoardEntry { rank: number; name: string; score: number; crown: boolean }
export interface BoardRank { rank: number; score: number }
export interface Board {
  game: ArcadeGame;
  all: BoardEntry[];
  week: BoardEntry[];
  me: { name: string; all: BoardRank | null; week: BoardRank | null } | null;
}

export interface SubmitOk {
  ok: true;
  name: string;
  score: number;
  best: number;
  crowned: boolean;
  rank: { all: number | null; week: number | null };
  isTop: boolean;
}
export interface ApiError { error: { code: string; message: string } }

const NAME_KEY = 'devos-arcade-name';

export function savedName(): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(NAME_KEY); } catch { return null; }
}

export function saveName(name: string) {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* private mode */ }
}

export function clearName() {
  try { localStorage.removeItem(NAME_KEY); } catch { /* private mode */ }
}

// The crown code is kept apart from the display name. It is only ever sent
// to the score route (rate limited); the board is looked up by the name the
// board shows, so the code never sits in a URL.
const CROWN_KEY = 'devos-arcade-crown';

export function savedCrown(): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(CROWN_KEY); } catch { return null; }
}

export function saveCrown(code: string) {
  try { localStorage.setItem(CROWN_KEY, code); } catch { /* private mode */ }
}

export function clearCrown() {
  try { localStorage.removeItem(CROWN_KEY); } catch { /* private mode */ }
}

/** Same rule the server applies, so most mistakes are caught before a round trip. */
export function checkName(raw: string): string | null {
  const name = raw.trim();
  const length = Array.from(name).length;
  if (length < 2) return 'Use at least 2 characters.';
  if (length > 12) return 'Use 12 characters or fewer.';
  if (!/^[\p{L}\p{M}\p{N} _]+$/u.test(name)) return 'Use letters, numbers, spaces or underscores.';
  return null;
}

const offline: ApiError = { error: { code: 'offline', message: 'The leaderboard did not answer. Your best is saved on this device.' } };

async function call<T>(input: string, init?: RequestInit): Promise<T | ApiError> {
  try {
    const res = await fetch(input, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) } });
    const body = await res.json().catch(() => null);
    if (!body) return offline;
    return body as T | ApiError;
  } catch {
    return offline;
  }
}

export function isError(x: unknown): x is ApiError {
  return !!x && typeof x === 'object' && 'error' in x;
}

export async function startRun(game: ArcadeGame): Promise<string | null> {
  const r = await call<{ token: string }>('/api/arcade/start', { method: 'POST', body: JSON.stringify({ game }) });
  return isError(r) ? null : r.token;
}

export function submitScore(token: string, name: string, score: number) {
  return call<SubmitOk>('/api/arcade/score', { method: 'POST', body: JSON.stringify({ token, name, score }) });
}

export function fetchBoard(game: ArcadeGame, name?: string | null) {
  const q = new URLSearchParams({ game });
  if (name) q.set('name', name);
  return call<Board>(`/api/arcade/board?${q}`, { cache: 'no-store' });
}

export function fetchSecret() {
  return call<{ name: string; message: string }>('/api/arcade/secret', { cache: 'no-store' });
}
