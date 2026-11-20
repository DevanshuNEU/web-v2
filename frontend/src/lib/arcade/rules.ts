import type { GameId } from './games';

/**
 * Plausibility rules per game. A score is accepted when
 * score <= maxPerSecond * seconds + base and score <= cap, where seconds is
 * measured by the server from the signed start token. The numbers are
 * deliberately generous: honest players should never trip them, they only
 * stop a forged 999999 posted a second after the run started.
 */
export type ScoreRule = {
  maxPerSecond: number;
  base: number;
  /** Hard absolute ceiling, whatever the duration. */
  cap: number;
};

// Caps sit just above what a perfect run can reach. A cheater can bank a
// start token and wait out the per-second rule, so the cap is what really
// keeps a forged score from sitting above every honest one.
//   snake: a 20x20 board holds at most 399 snacks.
//   platformer: 254 coins, 33 stomps, 34 bricks and up to 4000 in clear,
//     time and flag bonuses per world, 4 worlds: about 20,900.
//   stacker: one floor per drop; nobody honest drops 12 a second.
//   merge: about 45k at the Moon Gigachad; past that, moon pairs add 10k.
//     Fast swipers manage 6 to 8 moves a second early on.
export const RULES: Record<GameId, ScoreRule> = {
  snake: { maxPerSecond: 12, base: 10, cap: 399 },
  platformer: { maxPerSecond: 600, base: 3000, cap: 22_000 },
  stacker: { maxPerSecond: 12, base: 10, cap: 3000 },
  merge: { maxPerSecond: 2500, base: 5000, cap: 250_000 },
};

/** Runs shorter than this cannot post a non-zero score. */
export const MIN_DURATION_MS = 2000;

export type PlausibilityResult = { ok: true } | { ok: false; reason: 'too_fast' | 'too_high' | 'over_cap' };

export function checkPlausible(game: GameId, score: number, durationMs: number): PlausibilityResult {
  const rule = RULES[game];
  if (score > 0 && durationMs < MIN_DURATION_MS) return { ok: false, reason: 'too_fast' };
  if (score > rule.cap) return { ok: false, reason: 'over_cap' };
  const seconds = Math.max(0, durationMs) / 1000;
  if (score > rule.maxPerSecond * seconds + rule.base) return { ok: false, reason: 'too_high' };
  return { ok: true };
}
