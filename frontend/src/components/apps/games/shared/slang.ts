/**
 * The brainrot word bank. These strings are game content (hype that pops on
 * good play), not interface copy, so they get to be loud. No dashes.
 */

export const HYPE = {
  small: ['W', 'nice', 'clean', 'locked in', 'no cap'],
  big: ['+aura', 'sigma', 'main character', 'rizz', 'goated', 'built different'],
  huge: ['AURA FARMING', 'SIGMA COMBO', 'UNREAL RIZZ', 'GIGACHAD MOVE', 'OHIO BOSS'],
  fail: ['cooked', 'skill issue', 'fanum taxed', 'L', 'NPC behaviour', 'not the mewing streak'],
} as const;

export type HypeTier = keyof typeof HYPE;

/** Pick a line from a tier. `rand` is injectable for tests. */
export function hype(tier: HypeTier, rand: () => number = Math.random): string {
  const list = HYPE[tier];
  return list[Math.floor(rand() * list.length) % list.length];
}

/** Combo count to tier: 1 small, 3+ big, 6+ huge. */
export function comboTier(combo: number): Exclude<HypeTier, 'fail'> {
  if (combo >= 6) return 'huge';
  if (combo >= 3) return 'big';
  return 'small';
}

/** Aura text for a score gain, e.g. "+50 aura". */
export function auraText(points: number): string {
  return `+${points} aura`;
}
