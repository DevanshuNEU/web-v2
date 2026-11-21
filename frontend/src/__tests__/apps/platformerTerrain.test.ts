import { describe, it, expect } from 'vitest';
import { TILE, isSolidTile, parseLevel, tileAt } from '@/components/apps/games/platformer/sim/level';
import { POINTS, flagBonus, parTime, stepWorld, timeBonus } from '@/components/apps/games/platformer/sim/world';
import { DT, G40, custom, eventsOf, run, runUntil, worldOn } from '../setup/platformerWorld';

/** A one-way platform at row 8, columns 4 to 9, over flat ground. */
const SHELF = [
  '....______..............................',
  '........................................',
  '........................................',
  '.P......................................',
  G40, G40,
];

describe('Main Character terrain: one-way platforms', () => {
  it('parses _ as a one-way tile that is not solid', () => {
    const w = worldOn(SHELF);
    expect(tileAt(w.tiles, w.level.cols, 5, 8)).toBe(TILE.ONEWAY);
    expect(w.solid(5, 8)).toBe(false);
  });

  it('jumping up from below passes through, then he lands on top', () => {
    const w = worldOn(SHELF);
    w.hero.x = 5.2;
    let top = 99;
    run(w, 1.2, { jumpPressed: true, jumpHeld: true }, ww => { top = Math.min(top, ww.hero.y); });
    expect(top).toBeLessThan(8 - w.hero.h);
    expect(w.hero.onGround).toBe(true);
    expect(w.hero.y + w.hero.h).toBeCloseTo(8, 6);
  });

  it('dropped from above he stands on it', () => {
    const w = worldOn(SHELF);
    w.hero.x = 6; w.hero.y = 3; w.hero.onGround = false;
    expect(runUntil(w, ww => ww.hero.onGround, {}, 2)).toBe(true);
    expect(w.hero.y + w.hero.h).toBeCloseTo(8, 6);
    run(w, 1);
    expect(w.hero.y + w.hero.h).toBeCloseTo(8, 6);
  });

  it('walks through it sideways', () => {
    const w = worldOn([
      '........................................',
      '.P.....___..............................',
      G40, G40,
    ]);
    run(w, 1.2, { move: 1 });
    expect(w.hero.x).toBeGreaterThan(10);
    expect(w.hero.y + w.hero.h).toBeCloseTo(12, 6);
  });
});

describe('Main Character terrain: the rooftop legend', () => {
  const ROOF = [
    '....................................G...',
    '........................................',
    '........................................',
    '...L...........L........................',
    '........................................',
    '........................................',
    '.....................................X..',
    '.P..T..N..U..H..R...................XX..',
    '========================================',
    '########################################',
  ];

  it('parses = as solid roof, scenery at the tile it stands on, lights at tile centres, R as a crate', () => {
    const level = custom(ROOF, 'rooftops');
    expect(level.theme).toBe('rooftops');
    expect(tileAt(level.tiles, level.cols, 5, 12)).toBe(TILE.GROUND);
    // Sorted by column.
    expect(level.decor).toEqual([
      { kind: 'neonSign', x: 3, y: 8 },
      { kind: 'waterTower', x: 4, y: 12 },
      { kind: 'antenna', x: 7, y: 12 },
      { kind: 'acUnit', x: 10, y: 12 },
      { kind: 'chimney', x: 13, y: 12 },
      { kind: 'neonSign', x: 15, y: 8 },
    ]);
    // R is a crate tile now: solid until the blade breaks it.
    expect(tileAt(level.tiles, level.cols, 16, 11)).toBe(TILE.CRATE);
    expect(level.crates).toBe(1);
    const signs = level.lights.filter(l => l.y === 7.5);
    expect(signs.map(l => l.x)).toEqual([3.5, 15.5]);
    for (const l of level.lights) {
      expect(l.r).toBeGreaterThan(0);
      expect(l.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(l.flicker).toBeGreaterThanOrEqual(0);
      expect(l.flicker).toBeLessThanOrEqual(1);
    }
    // Decor is scenery: never solid.
    expect(isSolidTile(tileAt(level.tiles, level.cols, 4, 11))).toBe(false);
  });

  it('parses G as the goal beacon: its top tile, with the mast down to what it stands on', () => {
    const level = custom(ROOF, 'rooftops');
    // Column 36 has a stone block at row 11, so the mast ends at row 10.
    expect(level.goal).toEqual({ x: 36, top: 4, base: 10, kind: 'beacon' });
    // The old renderer still reads the pole.
    expect(level.pole).toEqual({ x: 36, top: 4, base: 10 });
    expect(level.goalDir).toBe(1);
    expect(level.lights.some(l => l.x === 36.5 && l.y === 4.5)).toBe(true);
  });

  it('a level needs exactly one goal, flag or beacon', () => {
    const both = ROOF.map((r, i) => (i === 0 ? r.slice(0, 30) + 'F' + r.slice(31) : r));
    expect(() => custom(both, 'rooftops')).toThrow(/goal/);
    const none = ROOF.map(r => r.replace('G', '.'));
    expect(() => parseLevel({ id: 1, label: 'T', name: 'T', theme: 'rooftops', rows: [...Array(4).fill('.'.repeat(40)), ...none] })).toThrow(/goal/);
  });
});

describe('Main Character terrain: the goal beacon', () => {
  const END = [
    '......................G.................',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '.................XX.....................',
    '.P..............XXX.....................',
    '========================================',
    '########################################',
  ];

  it('touching it ends the level with a height bonus and the clear tally, as the flag did', () => {
    const w = worldOn(END, 0, 'rooftops');
    const g = w.level.goal;
    expect(g.top).toBe(5);
    const par = parTime(w.level);
    w.levelTime = 40;
    w.hero.x = g.x - 0.1; w.hero.y = 9.5;
    run(w, DT);
    expect(w.phase).toBe('pole');
    expect(w.stats.flag).toBe(flagBonus(9.5, w.level.pole));
    expect(w.stats.flag).toBeGreaterThanOrEqual(100);
    expect(w.stats.flag).toBeLessThan(POINTS.flagTop);
    expect(eventsOf(w)).toContain('flag');
    run(w, 8);
    expect(w.stats.clears).toBe(1);
    expect(w.stats.time).toBe(timeBonus(40, par));
    expect(w.levelIndex).toBe(1);
  });

  it('a real running jump off the stairs reaches its top for 2000', () => {
    const w = worldOn(END, 0, 'rooftops');
    const g = w.level.goal;
    // On the stair top (column 17, row 10), a step back from its edge.
    w.hero.x = 17.05; w.hero.y = 10 - w.hero.h; w.hero.onGround = true;
    let jumped = false;
    const f = { move: 1, jumpHeld: false, jumpPressed: false, dashPressed: false, actionPressed: false };
    for (let i = 0; i < 300 && w.phase === 'play'; i++) {
      if (!jumped && w.hero.x > 18.1) { f.jumpPressed = true; jumped = true; }
      f.jumpHeld = jumped;
      stepWorld(w, f, DT);
    }
    expect(w.phase).toBe('pole');
    expect(w.stats.flag).toBe(POINTS.flagTop);
    expect(g.x).toBe(22);
  });
});
