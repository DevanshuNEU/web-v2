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

export const RULES: Record<GameId, ScoreRule> = {
  snake: { maxPerSecond: 12, base: 10, cap: 400 },
  platformer: { maxPerSecond: 600, base: 3000, cap: 200_000 },
  stacker: { maxPerSecond: 40, base: 50, cap: 5000 },
  merge: { maxPerSecond: 400, base: 2000, cap: 500_000 },
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
