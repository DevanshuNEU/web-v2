// @vitest-environment jsdom

import { describe, it, expect, beforeAll } from 'vitest';
import { stubCanvas } from '../setup/canvas';
import type { Grid, Palette, SpriteSet } from '@/components/apps/games/platformer/render/sprites/types';
import { ROOFTOP_TILES } from '@/components/apps/games/platformer/render/sprites/rooftop';
import {
  BARREL,
  BOSS_PROPS_GLOW,
  BOSS_PROPS_PALETTE,
  DEBRIS,
  GORILLA,
  GORILLA_CLIMB_ANCHOR,
  GORILLA_GLOW,
  GORILLA_THROW_HOLD,
  SHOCKWAVE,
  TAUNT_BUBBLE,
  WARN_MARK,
} from '@/components/apps/games/platformer/render/sprites/gorilla';
import {
  CABLE,
  ZAKIM_BACKDROP,
  ZAKIM_BOSS_BAR_INNER,
  ZAKIM_GLOW,
  ZAKIM_TILES,
} from '@/components/apps/games/platformer/render/sprites/zakim';
import { bakeGrid, bakeSet } from '@/components/apps/games/platformer/render/bake';

type AnySet = SpriteSet<string>;

const SETS: [string, AnySet][] = [
  ['GORILLA', GORILLA as AnySet],
  ['BARREL', BARREL as AnySet],
  ['DEBRIS', DEBRIS as AnySet],
  ['SHOCKWAVE', SHOCKWAVE as AnySet],
  ['WARN_MARK', WARN_MARK as AnySet],
  ['ZAKIM_TILES.tiles', ZAKIM_TILES.tiles as AnySet],
  ['CABLE', CABLE as AnySet],
  ...Object.entries(ZAKIM_TILES.decor).map(([k, s]): [string, AnySet] => [`ZAKIM_TILES.decor.${k}`, s as AnySet]),
];

const STRIPS: [string, Grid, number][] = [
  ['far', ZAKIM_BACKDROP.far, 96],
  ['mid', ZAKIM_BACKDROP.mid, 128],
  ['near', ZAKIM_BACKDROP.near, 96],
];

const COLOUR = /^(#[0-9a-f]{6}|rgba\(\d+,\d+,\d+,(0|1|0?\.\d+)\))$/i;
const DASH = new RegExp(String.fromCharCode(0x2013) + '|' + String.fromCharCode(0x2014));

function badKeys(grid: Grid, palette: Palette): string[] {
  const bad = new Set<string>();
  for (const row of grid) for (const ch of row) if (ch !== '.' && !(ch in palette)) bad.add(ch);
  return [...bad];
}
const countKeys = (g: Grid, keys: string) => g.join('').split('').filter((c) => keys.includes(c)).length;
const solid = (g: Grid) => g.join('').replace(/\./g, '').length;
const distinct = (frames: readonly Grid[]) => new Set(frames.map((g) => g.join('\n'))).size;
const frameCounts = (s: AnySet) => Object.fromEntries(Object.entries(s.anims).map(([k, a]) => [k, a.frames.length]));

describe('boss sprite grids', () => {
  it.each(SETS)('%s: every frame has the declared size and only palette keys', (_name, set) => {
    for (const [anim, a] of Object.entries(set.anims)) {
      expect(a.frames.length, anim).toBeGreaterThan(0);
      for (const grid of a.frames) {
        expect(grid.length, anim).toBe(set.size.h);
        for (const row of grid) expect(row.length, anim).toBe(set.size.w);
        expect(badKeys(grid, set.palette), anim).toEqual([]);
        expect(solid(grid), anim).toBeGreaterThan(0);
      }
    }
    for (const c of Object.values(set.palette)) expect(c).toMatch(COLOUR);
  });

  it('glow keys are palette keys', () => {
    const cases: [string, Palette][] = [
      [GORILLA_GLOW, GORILLA.palette],
      [BOSS_PROPS_GLOW, BOSS_PROPS_PALETTE],
      [ZAKIM_GLOW, ZAKIM_TILES.tiles.palette],
      [ZAKIM_BACKDROP.glow, ZAKIM_BACKDROP.palette],
    ];
    for (const [glow, pal] of cases) {
      expect(glow.length).toBeGreaterThan(0);
      for (const ch of glow) expect(pal, ch).toHaveProperty(ch);
    }
  });

  it('no dash characters sneak into any grid', () => {
    for (const [, set] of SETS) for (const a of Object.values(set.anims)) for (const g of a.frames) expect(g.join('')).not.toMatch(DASH);
  });
});

describe('the gorilla', () => {
  it('is 56 x 56, anchored bottom centre, with the fight frames', () => {
    expect(GORILLA.size).toEqual({ w: 56, h: 56 });
    expect(GORILLA.anchor).toEqual({ x: 28, y: 56 });
    expect(frameCounts(GORILLA as AnySet)).toEqual({
      idle: 4, pace: 6, chestBeat: 4, throw: 4, lunge: 3, pound: 4, winded: 3, climb: 4, slam: 3, hurt: 1, down: 4,
    });
  });

  it('is more than twice her height, and stands on the bottom row when grounded', () => {
    const g = GORILLA.anims.idle.frames[0];
    const rows = g.map((r, y) => (r.replace(/\./g, '') ? y : -1)).filter((y) => y >= 0);
    expect(rows[rows.length - 1] - rows[0] + 1).toBeGreaterThan(48);
    for (const anim of ['idle', 'pace', 'chestBeat', 'pound', 'winded', 'down'] as const) {
      for (const f of GORILLA.anims[anim].frames) expect(f[55].replace(/\./g, '').length, anim).toBeGreaterThan(0);
    }
  });

  it('every anim moves: its frames differ', () => {
    for (const [anim, a] of Object.entries(GORILLA.anims)) expect(distinct(a.frames), anim).toBe(a.frames.length);
  });

  it('wears the tank top and the chain, and the chain glints', () => {
    const g = GORILLA.anims.idle.frames[0];
    expect(countKeys(g, 'lmno')).toBeGreaterThan(120);
    expect(countKeys(g, 'pq')).toBeGreaterThan(10);
    expect(countKeys(g, GORILLA_GLOW)).toBeGreaterThan(0);
  });

  it('the hurt frame is the white flash: no fur left', () => {
    const g = GORILLA.anims.hurt.frames[0];
    expect(countKeys(g, 'abcd')).toBe(0);
    expect(countKeys(g, 'WXY')).toBeGreaterThan(800);
  });

  it('winded has its dizzy stars in every frame, and they move', () => {
    for (const g of GORILLA.anims.winded.frames) expect(countKeys(g, 'zA')).toBeGreaterThan(6);
  });

  it('the climb anchor lies on the grip line y = 66 - x, inside the frame', () => {
    expect(GORILLA_CLIMB_ANCHOR.y).toBe(66 - GORILLA_CLIMB_ANCHOR.x);
    expect(GORILLA_CLIMB_ANCHOR.x).toBeGreaterThan(0);
    expect(GORILLA_CLIMB_ANCHOR.x).toBeLessThan(56);
  });

  it('the throw holds the projectile on the wind up and lets go on the release', () => {
    expect(GORILLA_THROW_HOLD).toHaveLength(GORILLA.anims.throw.frames.length);
    expect(GORILLA_THROW_HOLD[0]).not.toBeNull();
    expect(GORILLA_THROW_HOLD[1]).not.toBeNull();
    expect(GORILLA_THROW_HOLD[2]).toBeNull();
  });

  it('one shot anims do not loop; the taunt and walk do', () => {
    for (const a of ['throw', 'lunge', 'pound', 'slam', 'down'] as const) expect(GORILLA.anims[a].loop, a).toBe(false);
    for (const a of ['idle', 'pace', 'chestBeat', 'winded', 'climb'] as const) expect(GORILLA.anims[a].loop, a).toBe(true);
  });
});

describe('projectiles and the bubble', () => {
  it('have their sizes, anchors and frames', () => {
    expect([BARREL.size, BARREL.anchor, frameCounts(BARREL as AnySet)]).toEqual([{ w: 16, h: 16 }, { x: 8, y: 16 }, { roll: 4 }]);
    expect([DEBRIS.size, DEBRIS.anchor, frameCounts(DEBRIS as AnySet)]).toEqual([{ w: 16, h: 16 }, { x: 8, y: 8 }, { idle: 2 }]);
    expect(DEBRIS.anims.idle.fps).toBe(0);
    expect([SHOCKWAVE.size, SHOCKWAVE.anchor, frameCounts(SHOCKWAVE as AnySet)]).toEqual([{ w: 32, h: 8 }, { x: 16, y: 8 }, { roll: 3 }]);
    expect([WARN_MARK.size, WARN_MARK.anchor, frameCounts(WARN_MARK as AnySet)]).toEqual([{ w: 16, h: 8 }, { x: 8, y: 8 }, { blink: 2 }]);
    for (const s of [BARREL, SHOCKWAVE, WARN_MARK] as AnySet[]) {
      for (const a of Object.values(s.anims)) expect(distinct(a.frames)).toBe(a.frames.length);
    }
  });

  it('the warn mark glows', () => {
    for (const g of WARN_MARK.anims.blink.frames) expect(countKeys(g, BOSS_PROPS_GLOW)).toBeGreaterThan(10);
  });

  it('the bubble is a 9 slice: square, edges that repeat, a paper centre, a tail', () => {
    const { slice, inset, tail, palette, ink } = TAUNT_BUBBLE;
    const n = slice.length;
    for (const row of slice) expect(row.length).toBe(n);
    expect(n).toBeGreaterThan(inset * 2);
    expect(badKeys(slice, palette)).toEqual([]);
    expect(badKeys(tail, palette)).toEqual([]);
    // middle columns of the top and bottom edges are all the same, so they stretch
    for (const y of [...Array(inset).keys(), ...Array(inset).keys()].map((k, i) => (i < inset ? k : n - 1 - k))) {
      expect(new Set(slice[y].slice(inset, n - inset)).size, `row ${y}`).toBe(1);
    }
    for (let y = inset; y < n - inset; y++) expect(slice[y], `row ${y}`).toBe(slice[inset]);
    expect(slice[n >> 1][n >> 1]).not.toBe('.');
    expect(ink).toMatch(COLOUR);
  });
});

describe('the bridge', () => {
  it('tiles have the rooftop keys and variants, so the chunk baker works unchanged', () => {
    const t = ZAKIM_TILES.tiles;
    expect(Object.keys(t.anims).sort()).toEqual(Object.keys(ROOFTOP_TILES.tiles.anims).sort());
    expect(t.size).toEqual({ w: 16, h: 16 });
    expect(t.anchor).toEqual({ x: 0, y: 0 });
    for (const name of ['roofTop', 'roofFill'] as const) expect(distinct(t.anims[name].frames), name).toBe(3);
    for (const a of Object.values(t.anims)) expect(a.fps).toBe(0);
    for (const name of ['roofTop', 'roofFill', 'stone', 'vent'] as const) {
      for (const g of t.anims[name].frames) expect(g.join(''), name).not.toContain('.');
    }
    for (const name of ['roofTop', 'oneWay'] as const) {
      for (const g of t.anims[name].frames) expect(g[0].replace(/\./g, '').length, name).toBeGreaterThan(12);
    }
  });

  it('decor has its sizes and frames, anchored bottom left', () => {
    const d = ZAKIM_TILES.decor;
    expect(Object.fromEntries(Object.entries(d).map(([k, s]) => [k, [s.size.w, s.size.h, s.anims.idle.frames.length]]))).toEqual({
      cableAnchor: [16, 24, 1], bridgeLamp: [16, 48, 1], arenaGate: [32, 48, 2], bossBar: [96, 8, 1],
    });
    for (const s of Object.values(d)) expect(s.anchor).toEqual({ x: 0, y: s.size.h });
    expect(d.arenaGate.anims.idle.loop).toBe(true);
    expect(countKeys(d.arenaGate.anims.idle.frames[0], ZAKIM_GLOW)).toBeGreaterThan(4);
  });

  it('the boss bar trough is inside the frame and empty, ready to fill', () => {
    const g = ZAKIM_TILES.decor.bossBar.anims.idle.frames[0];
    const { x, y, w, h } = ZAKIM_BOSS_BAR_INNER;
    expect(x + w).toBeLessThanOrEqual(96);
    expect(y + h).toBeLessThanOrEqual(8);
    for (let yy = y; yy < y + h; yy++) expect(new Set(g[yy].slice(x, x + w)).size).toBe(1);
  });

  it('cables run on the 45 degree diagonal, rise and fall mirrored, 3 variants each', () => {
    expect(CABLE.size).toEqual({ w: 16, h: 16 });
    expect(frameCounts(CABLE as AnySet)).toEqual({ rise: 3, fall: 3 });
    const rise = CABLE.anims.rise.frames[0];
    const fall = CABLE.anims.fall.frames[0];
    // rise: the strand passes the bottom left and top right, not the other corners
    expect(rise[15][0]).not.toBe('.');
    expect(rise[0][15]).not.toBe('.');
    expect(rise[0][0]).toBe('.');
    expect(rise[15][15]).toBe('.');
    expect(fall[0][0]).not.toBe('.');
    expect(fall[15][15]).not.toBe('.');
    expect(fall[15][0]).toBe('.');
    for (const a of Object.values(CABLE.anims)) expect(distinct(a.frames)).toBe(3);
  });

  it.each(STRIPS)('backdrop %s: 512 wide, the declared height, one solid colour along the bottom', (_n, grid, h) => {
    expect(grid.length).toBe(h);
    for (const row of grid) expect(row.length).toBe(512);
    expect(badKeys(grid, ZAKIM_BACKDROP.palette)).toEqual([]);
    expect(grid[h - 1]).not.toContain('.');
    expect(new Set(grid[h - 1]).size).toBe(1);
    expect(grid[0].replace(/\./g, '').length).toBeLessThan(512); // the sky stays clear
  });
});

describe('bake', () => {
  beforeAll(() => stubCanvas());

  it.each(SETS)('%s: bakes, mono too, with frame rects inside the sheet', (_name, set) => {
    const sheet = bakeSet(set);
    for (const [anim, a] of Object.entries(set.anims)) {
      for (let i = 0; i < a.frames.length; i++) {
        const r = sheet.frameRect(anim, i);
        expect(r.w).toBe(set.size.w);
        expect(r.h).toBe(set.size.h);
        expect(r.x + r.w).toBeLessThanOrEqual(sheet.w);
        expect(r.y + r.h).toBeLessThanOrEqual(sheet.h);
      }
    }
    expect(() => bakeSet(set, { mono: true })).not.toThrow();
  });

  it.each(STRIPS)('backdrop %s bakes', (_n, grid, h) => {
    const c = bakeGrid(grid, ZAKIM_BACKDROP.palette);
    expect(c.width).toBe(512);
    expect(c.height).toBe(h);
  });

  it('the bubble parts bake', () => {
    expect(() => bakeGrid(TAUNT_BUBBLE.slice, TAUNT_BUBBLE.palette)).not.toThrow();
    expect(() => bakeGrid(TAUNT_BUBBLE.tail, TAUNT_BUBBLE.palette)).not.toThrow();
  });
});
