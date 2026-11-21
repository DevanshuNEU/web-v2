// @vitest-environment jsdom

import { describe, it, expect, beforeAll } from 'vitest';
import { stubCanvas } from '../setup/canvas';
import type { Grid, Palette, SpriteSet } from '@/components/apps/games/platformer/render/sprites/types';
import { ROOFTOP_TILES } from '@/components/apps/games/platformer/render/sprites/rooftop';
import {
  AIRPORT_BACKDROP,
  AIRPORT_GLOW,
  AIRPORT_TILES,
} from '@/components/apps/games/platformer/render/sprites/airport';
import { CLOUD_BACKDROP, CLOUD_GLOW, CLOUD_TILES } from '@/components/apps/games/platformer/render/sprites/clouds';
import { LANDING_LIGHT, PLANES, PLANES_GLOW } from '@/components/apps/games/platformer/render/sprites/planes';
import { TRIP_ENEMIES, TRIP_ENEMY_GLOW } from '@/components/apps/games/platformer/render/sprites/tripEnemies';
import { BOSTON_NIGHT } from '@/components/apps/games/platformer/render/sprites/bostonSkyline';
import { bakeGrid, bakeSet } from '@/components/apps/games/platformer/render/bake';

type AnySet = SpriteSet<string>;

const entries = (prefix: string, o: Readonly<Record<string, unknown>>): [string, AnySet][] =>
  Object.entries(o).map(([k, s]) => [`${prefix}.${k}`, s as AnySet]);

const SETS: [string, AnySet][] = [
  ['AIRPORT_TILES.tiles', AIRPORT_TILES.tiles as AnySet],
  ['AIRPORT_TILES.walkway', AIRPORT_TILES.walkway as AnySet],
  ...entries('AIRPORT_TILES.decor', AIRPORT_TILES.decor),
  ['CLOUD_TILES.tiles', CLOUD_TILES.tiles as AnySet],
  ['CLOUD_TILES.puff', CLOUD_TILES.puff as AnySet],
  ...entries('CLOUD_TILES.decor', CLOUD_TILES.decor),
  ['PLANES', PLANES as AnySet],
  ['LANDING_LIGHT', LANDING_LIGHT as AnySet],
  ...entries('TRIP_ENEMIES', TRIP_ENEMIES),
];

const STRIPS: [string, Grid, Palette, number, number][] = [
  ['AIRPORT_BACKDROP.far', AIRPORT_BACKDROP.far, AIRPORT_BACKDROP.palette, 512, 96],
  ['AIRPORT_BACKDROP.mid', AIRPORT_BACKDROP.mid, AIRPORT_BACKDROP.palette, 512, 80],
  ['AIRPORT_BACKDROP.near', AIRPORT_BACKDROP.near, AIRPORT_BACKDROP.palette, 512, 64],
  ['CLOUD_BACKDROP.far', CLOUD_BACKDROP.far, CLOUD_BACKDROP.palette, 512, 96],
  ['CLOUD_BACKDROP.mid', CLOUD_BACKDROP.mid, CLOUD_BACKDROP.palette, 512, 72],
  ['CLOUD_BACKDROP.near', CLOUD_BACKDROP.near, CLOUD_BACKDROP.palette, 512, 64],
  ['BOSTON_NIGHT.far', BOSTON_NIGHT.far, BOSTON_NIGHT.palette, 512, 72],
  ['BOSTON_NIGHT.near', BOSTON_NIGHT.near, BOSTON_NIGHT.palette, 512, 48],
];

function frameCounts(set: AnySet): Record<string, number> {
  return Object.fromEntries(Object.entries(set.anims).map(([k, a]) => [k, a.frames.length]));
}

function badKeys(grid: Grid, palette: Palette): string[] {
  const bad = new Set<string>();
  for (const row of grid) for (const ch of row) if (ch !== '.' && !(ch in palette)) bad.add(ch);
  return [...bad];
}

function countKeys(grid: Grid, keys: string): number {
  let n = 0;
  for (const row of grid) for (const ch of row) if (keys.includes(ch)) n++;
  return n;
}

const COLOUR = /^(#[0-9a-f]{6}|rgba\(\d+,\d+,\d+,(0|1|0?\.\d+)\))$/i;

describe('trip sprite grids', () => {
  it.each(SETS)('%s: every frame has the declared size and only palette keys', (_name, set) => {
    for (const [anim, a] of Object.entries(set.anims)) {
      expect(a.frames.length, anim).toBeGreaterThan(0);
      for (const grid of a.frames) {
        expect(grid.length, anim).toBe(set.size.h);
        for (const row of grid) expect(row.length, anim).toBe(set.size.w);
        expect(badKeys(grid, set.palette), anim).toEqual([]);
        expect(grid.join('').replace(/\./g, '').length, anim).toBeGreaterThan(0);
      }
    }
    for (const c of Object.values(set.palette)) expect(c).toMatch(COLOUR);
  });

  it.each(STRIPS)('%s: a tileable strip of the declared size with palette keys only', (name, grid, pal, w, h) => {
    expect(grid.length).toBe(h);
    for (const row of grid) expect(row.length).toBe(w);
    expect(badKeys(grid, pal)).toEqual([]);
    for (const c of Object.values(pal)) expect(c).toMatch(COLOUR);
    // something sits on the horizon (the bottom row is not empty), except the
    // wing strip, which floats above the cloud sea
    if (name !== 'CLOUD_BACKDROP.near') expect(grid[h - 1].replace(/\./g, '').length).toBeGreaterThan(0);
    else expect(grid.join('').replace(/\./g, '').length).toBeGreaterThan(1000);
  });

  it('glow keys are palette keys and some pixels glow in every set that has lights', () => {
    const cases: [string, Palette][] = [
      [AIRPORT_GLOW, AIRPORT_TILES.tiles.palette],
      [CLOUD_GLOW, CLOUD_TILES.tiles.palette],
      [PLANES_GLOW, PLANES.palette],
      [TRIP_ENEMY_GLOW, TRIP_ENEMIES.suitcase.palette],
      [AIRPORT_BACKDROP.glow, AIRPORT_BACKDROP.palette],
      [CLOUD_BACKDROP.glow, CLOUD_BACKDROP.palette],
      [BOSTON_NIGHT.glow, BOSTON_NIGHT.palette],
    ];
    for (const [glow, pal] of cases) {
      expect(glow.length).toBeGreaterThan(0);
      for (const ch of glow) expect(pal, ch).toHaveProperty(ch);
    }
    expect(countKeys(AIRPORT_TILES.decor.gateSign.anims.idle.frames[0], AIRPORT_GLOW)).toBeGreaterThan(20);
    expect(countKeys(AIRPORT_TILES.walkway.anims.right.frames[0], AIRPORT_GLOW)).toBeGreaterThan(4);
    expect(countKeys(BOSTON_NIGHT.far, BOSTON_NIGHT.glow)).toBeGreaterThan(200);
  });
});

describe('airport', () => {
  it('has the rooftop tile keys, so the chunk baker works unchanged', () => {
    expect(Object.keys(AIRPORT_TILES.tiles.anims).sort()).toEqual(Object.keys(ROOFTOP_TILES.tiles.anims).sort());
    expect(AIRPORT_TILES.tiles.size).toEqual({ w: 16, h: 16 });
    expect(AIRPORT_TILES.tiles.anchor).toEqual({ x: 0, y: 0 });
    expect(frameCounts(AIRPORT_TILES.tiles as AnySet)).toEqual({
      roofTop: 3, roofEdgeLeft: 1, roofEdgeRight: 1, roofFill: 3, brick: 1, auraBlock: 1, auraBlockUsed: 1,
      stone: 1, spikes: 1, oneWay: 1, vent: 1, pipe: 1,
    });
    for (const name of ['roofTop', 'roofFill'] as const) {
      const f = AIRPORT_TILES.tiles.anims[name].frames.map((g) => g.join('\n'));
      expect(new Set(f).size, name).toBe(f.length);
    }
    for (const a of Object.values(AIRPORT_TILES.tiles.anims)) expect(a.fps).toBe(0);
  });

  it('decor has its sizes and frames, anchored bottom left', () => {
    const d = AIRPORT_TILES.decor;
    const sizes = Object.fromEntries(Object.entries(d).map(([k, s]) => [k, [s.size.w, s.size.h, s.anims.idle.frames.length]]));
    expect(sizes).toEqual({
      departureBoard: [32, 48, 1], plant: [16, 32, 1], seats: [32, 16, 1], kiosk: [16, 32, 1],
      gateDoor: [32, 48, 4], gateSign: [48, 16, 2], carousel: [64, 16, 1], window: [48, 48, 1],
    });
    for (const s of Object.values(d)) expect(s.anchor).toEqual({ x: 0, y: s.size.h });
  });

  it('the gate door board settles: every flap frame differs, the last is the held one', () => {
    const f = AIRPORT_TILES.decor.gateDoor.anims.idle;
    expect(new Set(f.frames.map((g) => g.join('\n'))).size).toBe(4);
    expect(f.loop).toBe(false);
  });

  it('walkways: 4 frames each way, left mirrors right, every frame tiles seamlessly', () => {
    const w = AIRPORT_TILES.walkway;
    expect(w.size).toEqual({ w: 16, h: 16 });
    expect(frameCounts(w as AnySet)).toEqual({ right: 4, left: 4 });
    const mirror = (g: Grid) => g.map((r) => [...r].reverse().join(''));
    w.anims.right.frames.forEach((g, i) => expect(w.anims.left.frames[i]).toEqual(mirror(g)));
    // the frames differ (it animates) and the loop returns to the start
    expect(new Set(w.anims.right.frames.map((g) => g.join('\n'))).size).toBe(4);
    // shifting frame k right by one tread step gives frame k+1 on the tread rows
    const r = w.anims.right.frames;
    for (let k = 0; k < 4; k++) {
      const next = r[(k + 1) % 4];
      for (const y of [0, 1, 2]) {
        const shifted = r[k][y].slice(15) + r[k][y].slice(0, 15);
        expect(next[y], `frame ${k} row ${y}`).toBe(shifted);
      }
    }
  });
});

describe('clouds', () => {
  it('has the rooftop tile keys with the variants', () => {
    expect(Object.keys(CLOUD_TILES.tiles.anims).sort()).toEqual(Object.keys(ROOFTOP_TILES.tiles.anims).sort());
    expect(frameCounts(CLOUD_TILES.tiles as AnySet)).toEqual({
      roofTop: 3, roofEdgeLeft: 1, roofEdgeRight: 1, roofFill: 3, brick: 1, auraBlock: 1, auraBlockUsed: 1,
      stone: 1, spikes: 1, oneWay: 1, vent: 1, pipe: 1,
    });
  });

  it('the puff: solid 1, wobble 2, gone 3, and it fades as it goes', () => {
    const p = CLOUD_TILES.puff;
    expect(p.size).toEqual({ w: 16, h: 16 });
    expect(frameCounts(p as AnySet)).toEqual({ solid: 1, wobble: 2, gone: 3 });
    expect(p.anims.gone.loop).toBe(false);
    const solidPx = (g: Grid) => g.join('').replace(/[.wxyz]/g, '').length;
    const gone = p.anims.gone.frames.map(solidPx);
    expect(gone[0]).toBeLessThan(solidPx(p.anims.solid.frames[0]));
    expect(gone[2]).toBeLessThan(gone[0]);
  });

  it('decor sizes and frames', () => {
    const d = CLOUD_TILES.decor;
    const sizes = Object.fromEntries(Object.entries(d).map(([k, s]) => [k, [s.size.w, s.size.h, s.anims.idle.frames.length]]));
    expect(sizes).toEqual({ cloudTower: [32, 48, 1], wingLight: [16, 16, 4], runwayLights: [32, 16, 4] });
    for (const s of Object.values(d)) expect(s.anchor).toEqual({ x: 0, y: s.size.h });
  });

  it('nav lights point at lit pixels of the near strip', () => {
    for (const l of CLOUD_BACKDROP.navLights) {
      expect(CLOUD_BACKDROP.glow).toContain(CLOUD_BACKDROP.near[l.y][l.x]);
    }
  });
});

describe('planes and enemies', () => {
  it('planes are small, two blinking frames each', () => {
    expect(PLANES.size).toEqual({ w: 24, h: 10 });
    expect(frameCounts(PLANES as AnySet)).toEqual({ approach: 2, depart: 2, taxi: 2 });
    for (const a of Object.values(PLANES.anims)) expect(a.loop).toBe(true);
    expect(LANDING_LIGHT.size).toEqual({ w: 3, h: 3 });
    expect(LANDING_LIGHT.anchor).toEqual({ x: 1, y: 1 });
  });

  it('enemies have the sizes and frames in the contract, anchored bottom centre', () => {
    expect(TRIP_ENEMIES.suitcase.size).toEqual({ w: 16, h: 12 });
    expect(frameCounts(TRIP_ENEMIES.suitcase as AnySet)).toEqual({ roll: 4, squashed: 1 });
    for (const k of ['paDrone', 'stormCell'] as const) {
      expect(TRIP_ENEMIES[k].size, k).toEqual({ w: 16, h: 16 });
      expect(frameCounts(TRIP_ENEMIES[k] as AnySet), k).toEqual({ hover: 2, dive: 1, dead: 1 });
    }
    for (const s of Object.values(TRIP_ENEMIES)) expect(s.anchor).toEqual({ x: s.size.w / 2, y: s.size.h });
  });

  it('the suitcase stands on its wheels on the bottom row', () => {
    for (const g of TRIP_ENEMIES.suitcase.anims.roll.frames) expect(g[11].replace(/\./g, '').length).toBeGreaterThan(0);
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

  it.each(STRIPS)('%s: strip bakes', (_name, grid, pal, w, h) => {
    const c = bakeGrid(grid, pal);
    expect(c.width).toBe(w);
    expect(c.height).toBe(h);
    expect(() => bakeGrid(grid, pal, { mono: true })).not.toThrow();
  });
});
