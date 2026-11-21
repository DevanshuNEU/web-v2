import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isGame, type GameId } from './games';

/**
 * Run tokens. POST /api/arcade/start hands one out when a run begins; the
 * score submit must carry it back. The payload records which game and when
 * the server saw the run start, so the score check uses a duration the
 * client cannot fake. Format: base64url(JSON payload) + "." + base64url(HMAC).
 */

export const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

export type TokenPayload = { game: GameId; startedAt: number; nonce: string };

const DEV_SECRET = 'devos-arcade-dev-secret-not-for-production';

/**
 * ARCADE_TOKEN_SECRET wins. Without it, derive a secret from the Upstash
 * token so production works with the env it already has. The fixed dev string
 * is only allowed outside production. Returns null when nothing is usable.
 */
export function tokenSecret(): string | null {
  const explicit = process.env.ARCADE_TOKEN_SECRET;
  if (explicit) return explicit;
  const upstash = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (upstash) return createHash('sha256').update(`arcade-token:${upstash}`).digest('hex');
  if (process.env.NODE_ENV !== 'production') return DEV_SECRET;
  return null;
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

export function issueToken(game: GameId, secret: string, now = Date.now()): { token: string; expiresAt: number; payload: TokenPayload } {
  const payload: TokenPayload = { game, startedAt: now, nonce: randomBytes(16).toString('base64url') };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return { token: `${body}.${sign(body, secret)}`, expiresAt: now + TOKEN_TTL_MS, payload };
}

export type VerifyResult = { ok: true; payload: TokenPayload } | { ok: false; reason: 'malformed' | 'signature' | 'expired' | 'future' };

export function verifyToken(token: unknown, secret: string, now = Date.now()): VerifyResult {
  if (typeof token !== 'string' || token.length > 512) return { ok: false, reason: 'malformed' };
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: 'malformed' };
  const [body, sig] = parts;

  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: 'signature' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  const p = parsed as Partial<TokenPayload> | null;
  if (
    !p ||
    !isGame(p.game) ||
    typeof p.startedAt !== 'number' ||
    !Number.isFinite(p.startedAt) ||
    typeof p.nonce !== 'string' ||
    !p.nonce
  ) {
    return { ok: false, reason: 'malformed' };
  }
  // A little slack for clock drift between serverless instances.
  if (p.startedAt > now + 5000) return { ok: false, reason: 'future' };
  if (now - p.startedAt > TOKEN_TTL_MS) return { ok: false, reason: 'expired' };
  return { ok: true, payload: { game: p.game, startedAt: p.startedAt, nonce: p.nonce } };
}
