import { describe, it, expect } from 'vitest';
import { generateLevel } from '@/components/apps/games/platformer/sim/generate';
import { FINALE, INTRO, ROOFTOP_CHUNKS, type Chunk } from '@/components/apps/games/platformer/sim/chunks/rooftops';
import { MAIN_LEVELS, parseLevel, secretLevel, type Level } from '@/components/apps/games/platformer/sim/level';
import { MODIFIERS } from '@/components/apps/games/platformer/sim/modifiers';
import { POINTS } from '@/components/apps/games/platformer/sim/world';
import { PHYS } from '@/components/apps/games/platformer/sim/physics';
import { deriveSeed } from '@/components/apps/games/platformer/sim/rand';
import { RULES } from '@/lib/arcade/rules';

/** Every coin, enemy, brick and Sigma coin, the beacon top, the clear and a zero-second time bonus. */
function perfect(l: Level, coinMul = 1): number {
  return l.coinTotal * POINTS.coin * coinMul + l.sigmas * POINTS.sigma + l.enemies.length * POINTS.stomp
    + l.bricks * POINTS.brick + POINTS.flagTop + POINTS.clear + POINTS.timeMax;
}

const SEEDS = Array.from({ length: 500 }, (_, i) => (i * 2654435761 + 12345) >>> 0);
const REST = perfect(MAIN_LEVELS[1]) + perfect(MAIN_LEVELS[2]) + perfect(secretLevel('WWWWWWWWWW'));

describe('Main Character perfect-run score and the leaderboard cap', () => {
  const runs = SEEDS.map(seed => {
    const def = generateLevel('rooftops', deriveSeed(seed, 0));
    const l = parseLevel(def);
    return { l, max: perfect(l, MODIFIERS[def.modifier].coinMul) + REST };
  });
  const maxOverSeeds = Math.max(...runs.map(r => r.max));

  it('the cap covers the best perfect run over 500 seeds and sits within 15 percent of it', () => {
    expect(RULES.platformer.cap).toBeGreaterThanOrEqual(maxOverSeeds);
    expect(RULES.platformer.cap).toBeLessThanOrEqual(maxOverSeeds * 1.15);
  });

  it('the cap also covers a hard upper bound for any seed: 8 of the richest chunks, everything optional on, Double Aura', () => {
    const n = (c: Chunk, chs: string) => [...c.rows.join('')].filter(ch => chs.includes(ch)).length;
    const value = (c: Chunk) => n(c, 'o*') * POINTS.coin * 2 + n(c, 'cdDe') * POINTS.stomp;
    const room = (c: Chunk) => n(c, '&') * POINTS.coin * 2 + n(c, '%') * POINTS.brick;
    const [a, b] = ROOFTOP_CHUNKS.map(value).sort((x, y) => y - x);
    const world1 = value(INTRO) + value(FINALE) + 4 * a + 4 * b + Math.max(...ROOFTOP_CHUNKS.map(room))
      + POINTS.sigma + POINTS.flagTop + POINTS.clear + POINTS.timeMax;
    for (const r of runs) expect(r.max - REST).toBeLessThanOrEqual(world1);
    expect(RULES.platformer.cap).toBeGreaterThanOrEqual(world1 + REST);
  });

  it('a perfect speed run stays inside the per-second rule on every seed', () => {
    const rule = RULES.platformer;
    const restSeconds = [MAIN_LEVELS[1], MAIN_LEVELS[2], secretLevel('WWWWWWWWWW')]
      .reduce((s, l) => s + Math.abs(l.goal.x - l.start.x) / PHYS.runMax, 0);
    for (const r of runs) {
      // Dashing is faster than running: allow a dash on every 4 tiles.
      const seconds = Math.abs(r.l.goal.x - r.l.start.x) / (PHYS.runMax * 1.3) + restSeconds;
      expect(r.max).toBeLessThanOrEqual(rule.maxPerSecond * seconds + rule.base);
    }
  });
});
