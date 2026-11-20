import { describe, it, expect } from 'vitest';
import { STORY, storyLevelDef } from '@/components/apps/games/platformer/sim/story';
import { parseLevel, type Level } from '@/components/apps/games/platformer/sim/level';
import { POINTS } from '@/components/apps/games/platformer/sim/world';
import { BLADE } from '@/components/apps/games/platformer/sim/blade';
import { POWERS } from '@/components/apps/games/platformer/sim/powers';
import { PHYS } from '@/components/apps/games/platformer/sim/physics';
import { RULES } from '@/lib/arcade/rules';

/**
 * A perfect story level: every coin (map, coin blocks, crates and signs the
 * blade breaks), every enemy, every brick and Sigma coin, the beacon top,
 * the clear, a zero-second time bonus and no deaths.
 */
function perfect(l: Level): number {
  const coins = l.coinTotal + l.crates * BLADE.crateCoins + l.signs * BLADE.signCoins;
  return coins * POINTS.coin + l.sigmas * POINTS.sigma + l.enemies.length * POINTS.stomp + l.bricks * POINTS.brick
    + POINTS.flagTop + POINTS.clear + POINTS.timeMax;
}

const built = STORY.filter(s => s.built).map(s => parseLevel(storyLevelDef(s.id)));
const storyMax = built.reduce((s, l) => s + perfect(l), 0);

describe('Main Character leaderboard cap (the leaderboard uses the fixed Story levels)', () => {
  it('covers a perfect run of every built story level and sits within 15 percent above it', () => {
    expect(storyMax).toBe(14_860);
    expect(RULES.platformer.cap).toBeGreaterThanOrEqual(storyMax);
    expect(RULES.platformer.cap).toBeLessThanOrEqual(storyMax * 1.15);
  });

  it('a perfect speed run stays inside the per-second rule (running at Taco Rush speed the whole way)', () => {
    const fastest = PHYS.runMax * Math.max(...Object.values(POWERS).map(p => p.runMul));
    const seconds = built.reduce((s, l) => s + Math.abs(l.goal.x - l.start.x) / fastest, 0);
    expect(storyMax).toBeLessThanOrEqual(RULES.platformer.maxPerSecond * seconds + RULES.platformer.base);
  });
});
