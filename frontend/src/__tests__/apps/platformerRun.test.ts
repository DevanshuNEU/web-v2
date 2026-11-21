import { describe, it, expect } from 'vitest';
import { POINTS, createWorld, drainEvents, enterLevel, score, stepWorld } from '@/components/apps/games/platformer/sim/world';
import { MODIFIERS } from '@/components/apps/games/platformer/sim/modifiers';
import { generateLevel } from '@/components/apps/games/platformer/sim/generate';
import { deriveSeed } from '@/components/apps/games/platformer/sim/rand';
import { emptyFrame } from '@/components/apps/games/platformer/input/frame';
import { DT, FLAT, G40, custom, run } from '../setup/platformerWorld';
import { PHYS } from '@/components/apps/games/platformer/sim/physics';

describe('Main Character runs: a seed makes a world', () => {
  it('records the seed, builds world 1 from it and names its modifier', () => {
    const w = createWorld({ seed: 42 });
    expect(w.seed).toBe(42);
    expect(w.level.theme).toBe('rooftops');
    expect(w.level.goal.kind).toBe('beacon');
    const def = generateLevel('rooftops', deriveSeed(42, 0));
    expect(w.modifier.id).toBe(def.modifier);
    expect(w.modifier.name).toBe(MODIFIERS[def.modifier].name);
  });

  it('the same seed gives the same level; other seeds give other levels', () => {
    const tiles = (s: number) => Array.from(createWorld({ seed: s }).tiles).join('');
    expect(tiles(7)).toBe(tiles(7));
    const distinct = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(tiles));
    expect(distinct.size).toBe(8);
  });

  it('a forced modifier wins over the seed, and worlds 2 and 3 have none', () => {
    const w = createWorld({ seed: 42, modifier: 'storm' });
    expect(w.modifier).toEqual({ id: 'storm', name: 'Storm Warning' });
    const cave = createWorld({ seed: 42, levelIndex: 1 });
    expect(cave.modifier.id).toBe('none');
    expect(cave.level.theme).toBe('cave');
  });
});

/** A test level with a modifier. */
function moddedOn(rows: string[], modifier: Parameters<typeof enterLevel>[3]) {
  const w = createWorld({ seed: 1, modifier: 'none' });
  enterLevel(w, 0, custom(rows, 'rooftops'), modifier);
  drainEvents(w);
  return w;
}

describe('Main Character modifiers in play', () => {
  const peak = (m: 'none' | 'lowGravity') => {
    const w = moddedOn(FLAT, m);
    let top = 99;
    run(w, 1.5, { jumpPressed: true, jumpHeld: true }, ww => { top = Math.min(top, ww.hero.y); });
    return 12 - top;
  };

  it('Low Gravity Night jumps higher', () => {
    expect(peak('lowGravity')).toBeGreaterThan(peak('none') * 1.15);
  });

  it('Storm Warning blows an idle hero along in gusts, and is calm between them', () => {
    const w = moddedOn(FLAT, 'storm');
    w.hero.x = 20;
    let maxWind = 0, calm = 0;
    run(w, 12, {}, ww => { maxWind = Math.max(maxWind, Math.abs(ww.wind)); if (ww.wind === 0) calm++; });
    expect(maxWind).toBeGreaterThan(1);
    expect(maxWind).toBeLessThanOrEqual(PHYS.runMax * 0.15);
    expect(calm).toBeGreaterThan(100);
    expect(Math.abs(w.hero.x - 20)).toBeGreaterThan(1);
    const still = moddedOn(FLAT, 'none');
    still.hero.x = 20;
    run(still, 12);
    expect(still.wind).toBe(0);
    expect(still.hero.x).toBe(20);
  });

  it('Double Aura makes every coin worth 20', () => {
    const w = moddedOn(['.P..oooo................................', G40, G40], 'doubleAura');
    run(w, 1.5, { move: 1 });
    expect(w.stats.coins).toBe(4);
    expect(score(w)).toBe(4 * POINTS.coin * 2);
  });

  it('Neon Blackout is exposed for the renderer', () => {
    const w = moddedOn(FLAT, 'blackout');
    expect(w.modifier).toEqual({ id: 'blackout', name: 'Neon Blackout' });
  });

  it('Mirror City: the hero starts facing left, runs left to the beacon and walks off left', () => {
    const w = createWorld({ seed: 3, modifier: 'mirror' });
    expect(w.level.goalDir).toBe(-1);
    expect(w.hero.facing).toBe(-1);
    const g = w.level.goal;
    w.enemies = [];
    w.hero.x = g.x + 1.2; w.hero.y = g.base + 1 - w.hero.h; w.hero.onGround = true;
    const f = emptyFrame();
    f.move = -1;
    for (let i = 0; i < 240 && w.phase === 'play'; i++) stepWorld(w, f, DT);
    expect(w.phase).toBe('pole');
    expect(w.stats.flag).toBeGreaterThan(0);
    let minX = w.hero.x;
    for (let i = 0; i < 600 && w.levelIndex === 0; i++) { stepWorld(w, emptyFrame(), DT); minX = Math.min(minX, w.hero.x); }
    expect(minX).toBeLessThan(g.x - 3);
    expect(w.levelIndex).toBe(1);
  });
});
