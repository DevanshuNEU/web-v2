/**
 * The sim's only source of randomness: a small seedable generator
 * (mulberry32). The world keeps its seed, so a recorded run of input frames
 * replays exactly (ghosts, attract mode, server-side checks).
 */

/** A generator of floats in [0, 1) that depends only on `seed`. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seed used when the view does not pass one. */
export const DEFAULT_SEED = 1;

/** A seed for part `k` of a run (a world, a generator stream) from the run's seed. */
export function deriveSeed(seed: number, k: number): number {
  let h = (seed ^ Math.imul(k + 1, 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** The Daily Run seed: the same for everyone all UTC day, a new one at UTC midnight. */
export function dailySeed(date: Date): number {
  const day = date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
  return deriveSeed(day, 0xda17);
}
