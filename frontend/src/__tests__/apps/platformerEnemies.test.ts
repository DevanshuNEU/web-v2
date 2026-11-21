import { describe, it, expect } from 'vitest';
import { LIVES, drainEvents, enterLevel, score } from '@/components/apps/games/platformer/sim/world';
import { ENEMY_KINDS } from '@/components/apps/games/platformer/sim/enemies';
import { DYING_SECONDS } from '@/components/apps/games/platformer/sim/world';
import { DT, G40, custom, run, runUntil, worldOn } from '../setup/platformerWorld';

const SKY = '........................................';

describe('Main Character enemies: one table', () => {
  it('has a row for every kind, worlds 2 and 3 and Boston included', () => {
    expect(Object.keys(ENEMY_KINDS).sort()).toEqual(['adDrone', 'doomCrawler', 'eliteDrone', 'frog', 'gull', 'pebble', 'pigeon']);
  });
});

describe('Main Character enemies: the doom crawler', () => {
  it('walks, and turns at ledges so it never leaves its roof', () => {
    const w = worldOn([
      '.P.........c......................oo....',
      '####......######........................',
      '####......######........................',
    ]);
    const e = w.enemies[0];
    expect(e.kind).toBe('doomCrawler');
    let turns = 0, dir = e.dir, minX = 99, maxX = 0;
    run(w, 10, {}, () => {
      if (e.dir !== dir) { turns++; dir = e.dir; }
      minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x + e.w);
    });
    expect(turns).toBeGreaterThanOrEqual(3);
    expect(minX).toBeGreaterThanOrEqual(10 - 0.05);
    expect(maxX).toBeLessThanOrEqual(16 + 0.05);
  });

  it('turns at walls', () => {
    const w = worldOn(['.P.......#..c...#.......................', G40, G40]);
    const e = w.enemies[0];
    let minX = 99, maxX = 0;
    run(w, 8, {}, () => { minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x + e.w); });
    expect(minX).toBeGreaterThanOrEqual(10 - 1e-6);
    expect(maxX).toBeLessThanOrEqual(16 + 1e-6);
    expect(maxX - minX).toBeGreaterThan(4);
  });

  it('patrols a one-way fire escape and turns at its ends', () => {
    const w = worldOn([
      '...........c............................',
      '.........______.........................',
      SKY, SKY,
      '.P......................................',
      G40, G40,
    ]);
    const e = w.enemies[0];
    let minX = 99, maxX = 0;
    run(w, 8, {}, () => { minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x + e.w); });
    expect(e.deadT).toBe(-1);
    expect(e.y + e.h).toBeCloseTo(8, 6);
    expect(minX).toBeGreaterThanOrEqual(9 - 0.05);
    expect(maxX).toBeLessThanOrEqual(15 + 0.05);
  });

  it('a stomp kills it for 100, a side touch costs a life', () => {
    const a = worldOn(['.P........c.............................', G40, G40]);
    const e = a.enemies[0];
    a.hero.x = e.x; a.hero.y = e.y - a.hero.h - 0.4; a.hero.vy = 3; a.hero.onGround = false;
    run(a, 0.3);
    expect(a.stats.stomps).toBe(1);
    expect(score(a)).toBe(100);
    const b = worldOn(['.P....c.................................', G40, G40]);
    expect(runUntil(b, ww => ww.phase === 'dying', { move: 1 })).toBe(true);
    run(b, DYING_SECONDS + 0.1);
    expect(b.lives).toBe(LIVES - 1);
  });
});

describe('Main Character enemies: the ad drone', () => {
  /** A drone at row 4 over a wide floor; the hero far away on the left. */
  const DRONE = [
    '....................d...................',
    SKY, SKY, SKY, SKY, SKY, SKY,
    '.P......................................',
    G40, G40,
  ];

  it('hovers on a gentle path around its spot while the hero is far', () => {
    const w = worldOn(DRONE);
    const e = w.enemies[0];
    expect(e.kind).toBe('adDrone');
    w.hero.x = 12; // near enough to wake it, out of its reach
    const hx = e.x, hy = e.y;
    let minX = 99, maxX = 0, minY = 99, maxY = 0;
    run(w, 6, {}, () => {
      minX = Math.min(minX, e.x); maxX = Math.max(maxX, e.x);
      minY = Math.min(minY, e.y); maxY = Math.max(maxY, e.y);
    });
    expect(e.mode).toBe('hover');
    expect(maxX - minX).toBeGreaterThan(1);
    expect(maxX - minX).toBeLessThan(4);
    expect(Math.abs((minX + maxX) / 2 - hx)).toBeLessThan(0.6);
    expect(maxY - minY).toBeLessThan(1.2);
    expect(Math.abs((minY + maxY) / 2 - hy)).toBeLessThan(0.6);
  });

  it('dives at the hero when he is below it within 5 tiles, then climbs back to its spot', () => {
    const w = worldOn(DRONE);
    const e = w.enemies[0];
    const homeY = e.y;
    run(w, 0.5);
    w.invuln = 99; // let it hit him without ending the test
    w.hero.x = e.x + 0.5; w.hero.y = 8.7;
    expect(runUntil(w, () => e.mode === 'dive', {}, 0.5)).toBe(true);
    let lowest = e.y;
    expect(runUntil(w, () => { lowest = Math.max(lowest, e.y); return e.mode === 'climb'; }, {}, 2)).toBe(true);
    expect(lowest).toBeGreaterThan(homeY + 2);
    w.hero.x = 2; // walk away
    expect(runUntil(w, () => e.mode === 'hover', {}, 4)).toBe(true);
    expect(Math.abs(e.y - homeY)).toBeLessThan(0.7);
  });

  it('ignores a hero above it or out of reach', () => {
    const w = worldOn(DRONE);
    const e = w.enemies[0];
    run(w, 0.2);
    w.hero.x = e.x - 9; // far to the side on the ground
    run(w, 2);
    expect(e.mode).toBe('hover');
    w.hero.x = e.x; w.hero.y = e.y - 3; w.hero.vy = 0; w.hero.onGround = false; // above
    for (let i = 0; i < 20; i++) { w.hero.y = e.y - 3; w.hero.vy = 0; run(w, DT); }
    expect(e.mode).toBe('hover');
  });

  it('a stomp from above kills it', () => {
    const w = worldOn(DRONE);
    const e = w.enemies[0];
    run(w, 0.2);
    w.hero.x = e.x; w.hero.y = e.y - w.hero.h - 0.3; w.hero.vy = 4; w.hero.onGround = false;
    run(w, 0.2);
    expect(w.stats.stomps).toBe(1);
    expect(e.deadT).not.toBe(-1);
  });
});

describe('Main Character enemies: the decoy dive', () => {
  /** A drone over an empty roof with a pigeon (decoy) on it; the hero far off on a high roof. */
  const ROOF = [
    '..........................d.............',
    '........................................',
    '.................=======................',
    '.................#######................',
    '.P...............#######................',
    '========================================',
    G40,
  ];

  function decoyOn(rows: string[]) {
    const w = worldOn(rows, 0, 'rooftops');
    const level = custom(rows, 'rooftops', { decoys: [{ x: 27, y: 11 }] });
    enterLevel(w, 0, level);
    drainEvents(w);
    return w;
  }

  it('a drone with a decoy in range dives at it, climbs back and does it again, while the hero is out of reach', () => {
    const w = decoyOn(ROOF);
    expect(w.decoys).toEqual([{ x: 27, y: 11 }]);
    const e = w.enemies[0];
    w.hero.x = 20; w.hero.y = 9 - w.hero.h; // on the high roof, above the drone's reach
    let dives = 0, hurt = false, lowest = 0;
    run(w, 10, {}, ww => {
      for (const ev of drainEvents(ww)) { if (ev.type === 'decoyDive') dives++; if (ev.type === 'hurt' || ev.type === 'die') hurt = true; }
      lowest = Math.max(lowest, e.y);
      ww.hero.x = 20; ww.hero.y = 9 - ww.hero.h; ww.hero.vx = 0; ww.hero.vy = 0; ww.hero.onGround = true;
    });
    expect(dives).toBeGreaterThanOrEqual(2);
    expect(lowest).toBeGreaterThan(9);
    expect(hurt).toBe(false);
    expect(w.phase).toBe('play');
  });

  it('a hero in its normal reach comes first', () => {
    const w = decoyOn(ROOF);
    const e = w.enemies[0];
    run(w, 0.3);
    w.invuln = 99;
    w.hero.x = e.x - 1; w.hero.y = 12 - w.hero.h;
    const seen: string[] = [];
    expect(runUntil(w, ww => { seen.push(...drainEvents(ww).map(ev => ev.type)); return e.mode === 'dive'; }, {}, 3)).toBe(true);
    expect(e.decoy).toBe(false);
    expect(seen).not.toContain('decoyDive');
  });
});
