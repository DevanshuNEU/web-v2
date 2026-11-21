import { createHash, timingSafeEqual } from 'node:crypto';
import { getStore } from './store';

/**
 * The crown code (env ARCADE_CROWN_CODE). Typed where a name goes, it posts
 * the score under ARCADE_HER_NAME with a crown, and POST /api/arcade/secret
 * opens the personal story with it.
 *
 * The code has to be strong: 16 or more random characters, or 4 or more
 * random words. A shorter code turns the crown off (no code matches) so a
 * weak one can never be guessed. Names are at most 12 characters, so a code
 * can never be mistaken for a name, or a name for a code.
 */
export const CROWN_CODE_MIN = 16;

/**
 * Wrong codes allowed per UTC day across every network, /secret and /score
 * together. Past it every code check that day fails, the right code too, so
 * a botnet that rotates addresses still gets 50 guesses a day at most.
 */
export const CROWN_FAILS_PER_DAY = 50;
const FAIL_TTL_SECONDS = 2 * 24 * 60 * 60;
const failKey = (now: number) => `arcade:crown:fails:${new Date(now).toISOString().slice(0, 10)}`;

let warned = false;

/** The configured code when it is strong enough, else null (crown off). */
export function crownCode(): string | null {
  const code = process.env.ARCADE_CROWN_CODE?.trim();
  if (!code) return null;
  if (Array.from(code).length < CROWN_CODE_MIN) {
    if (!warned) {
      warned = true;
      console.warn(
        `ARCADE_CROWN_CODE is shorter than ${CROWN_CODE_MIN} characters, so the crown is off. ` +
          'Set it to 16 or more random characters, or 4 or more random words.',
      );
    }
    return null;
  }
  return code;
}

/** Tests: let the weak-code warning fire again. */
export function resetCrownWarning(): void {
  warned = false;
}

const digest = (s: string) => createHash('sha256').update(s).digest();

/**
 * Case and surrounding space do not matter. Both sides are hashed first, so
 * the comparison takes the same time whatever was typed.
 */
export function sameCode(typed: unknown, code: string | null): boolean {
  const given = typeof typed === 'string' ? typed.trim().toLowerCase() : '';
  const ok = timingSafeEqual(digest(given), digest((code ?? '').toLowerCase()));
  return ok && !!given && !!code;
}

/**
 * True when the typed string is the crown code and today's wrong-code cap
 * is not used up. A wrong code (or any code while the crown is off) counts
 * towards the cap. Redis holds the count when configured, else memory.
 */
export async function checkCrownCode(typed: unknown, now = Date.now()): Promise<boolean> {
  const store = await getStore();
  const key = failKey(now);
  if (Number(await store.get(key)) >= CROWN_FAILS_PER_DAY) return false;
  if (sameCode(typed, crownCode())) return true;
  await store.incr(key, FAIL_TTL_SECONDS);
  return false;
}

/**
 * A /score name is a code attempt when it could only be a code: longer than
 * any name can be and at least as long as a code must be. Ordinary names
 * (12 characters at most) never count, so a typo never uses up a guess.
 */
export function isCodeAttempt(raw: unknown): boolean {
  return typeof raw === 'string' && Array.from(raw.normalize('NFC').trim()).length >= CROWN_CODE_MIN;
}
