// @vitest-environment jsdom

import { describe, it, expect, beforeAll } from 'vitest';
import { stubCanvas } from '../setup/canvas';
import type { Grid, Palette, SpriteSet } from '@/components/apps/games/platformer/render/sprites/types';
import { ROOFTOP_TILES } from '@/components/apps/games/platformer/render/sprites/rooftop';
import {
  CAMPUS_BACKDROP,
  CAMPUS_GLOW,
  CAMPUS_TILES,
  TROLLEY,
} from '@/components/apps/games/platformer/render/sprites/campus';
import { LIBRARY_BACKDROP, LIBRARY_GLOW, LIBRARY_TILES } from '@/components/apps/games/platformer/render/sprites/library';
import {
  COMMUTER_TRAIN,
  ORANGE_TRAIN,
  TRACKS_BACKDROP,
  TRACKS_GLOW,
  TRACKS_TILES,
} from '@/components/apps/games/platformer/render/sprites/tracks';
import { CAMPUS_ENEMIES, CAMPUS_ENEMY_GLOW } from '@/components/apps/games/platformer/render/sprites/campusEnemies';
import { bakeGrid, bakeSet } from '@/components/apps/games/platformer/render/bake';

type AnySet = SpriteSet<string>;

const entries = (prefix: string, o: Readonly<Record<string, unknown>>): [string, AnySet][] =>
  Object.entries(o).map(([k, s]) => [`${prefix}.${k}`, s as AnySet]);

const SETS: [string, AnySet][] = [
  ['CAMPUS_TILES.tiles', CAMPUS_TILES.tiles as AnySet],
  ['CAMPUS_TILES.panel', CAMPUS_TILES.panel as AnySet],
  ...entries('CAMPUS_TILES.decor', CAMPUS_TILES.decor),
  ['TROLLEY', TROLLEY as AnySet],
  ['LIBRARY_TILES.tiles', LIBRARY_TILES.tiles as AnySet],
  ['LIBRARY_TILES.stacks', LIBRARY_TILES.stacks as AnySet],
  ...entries('LIBRARY_TILES.decor', LIBRARY_TILES.decor),
  ['TRACKS_TILES.tiles', TRACKS_TILES.tiles as AnySet],
  ...entries('TRACKS_TILES.decor', TRACKS_TILES.decor),
  ['ORANGE_TRAIN', ORANGE_TRAIN as AnySet],
  ['COMMUTER_TRAIN', COMMUTER_TRAIN as AnySet],
  ...entries('CAMPUS_ENEMIES', CAMPUS_ENEMIES),
];

const STRIPS: [string, Grid, Palette, number, number][] = [
  ['CAMPUS_BACKDROP.far', CAMPUS_BACKDROP.far, CAMPUS_BACKDROP.palette, 512, 96],
  ['CAMPUS_BACKDROP.mid', CAMPUS_BACKDROP.mid, CAMPUS_BACKDROP.palette, 512, 80],
  ['CAMPUS_BACKDROP.near', CAMPUS_BACKDROP.near, CAMPUS_BACKDROP.palette, 512, 64],
  ['LIBRARY_BACKDROP.far', LIBRARY_BACKDROP.far, LIBRARY_BACKDROP.palette, 512, 112],
  ['LIBRARY_BACKDROP.mid', LIBRARY_BACKDROP.mid, LIBRARY_BACKDROP.palette, 512, 96],
  ['LIBRARY_BACKDROP.near', LIBRARY_BACKDROP.near, LIBRARY_BACKDROP.palette, 512, 64],
  ['TRACKS_BACKDROP.far', TRACKS_BACKDROP.far, TRACKS_BACKDROP.palette, 512, 96],
  ['TRACKS_BACKDROP.mid', TRACKS_BACKDROP.mid, TRACKS_BACKDROP.palette, 512, 96],
  ['TRACKS_BACKDROP.near', TRACKS_BACKDROP.near, TRACKS_BACKDROP.palette, 512, 64],
];

const TILE_FRAMES = {
  roofTop: 3, roofEdgeLeft: 1, roofEdgeRight: 1, roofFill: 3, brick: 1, auraBlock: 1, auraBlockUsed: 1,
  stone: 1, spikes: 1, oneWay: 1, vent: 1, pipe: 1,
};

const THEME_TILES: [string, SpriteSet<string>][] = [
  ['campus', CAMPUS_TILES.tiles],
  ['library', LIBRARY_TILES.tiles],
  ['tracks', TRACKS_TILES.tiles],
];

function frameCounts(set: AnySet): Record<string, number> {
  return Object.fromEntries(Object.entries(set.anims).map(([k, a]) => [k, a.frames.length]));
}

function decorSizes(d: Readonly<Record<string, AnySet>>): Record<string, number[]> {
  return Object.fromEntries(Object.entries(d).map(([k, s]) => [k, [s.size.w, s.size.h, s.anims.idle.frames.length]]));
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

describe('campus sprite grids', () => {
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

  it.each(STRIPS)('%s: a strip of the declared size, solid along the bottom so it can be lifted', (_name, grid, pal, w, h) => {
    expect(grid.length).toBe(h);
    for (const row of grid) expect(row.length).toBe(w);
    expect(badKeys(grid, pal)).toEqual([]);
    for (const c of Object.values(pal)) expect(c).toMatch(COLOUR);
    expect(grid[h - 1]).not.toContain('.');
  });

  it('glow keys are palette keys, and the lights are there', () => {
    const cases: [string, Palette][] = [
      [CAMPUS_GLOW, CAMPUS_TILES.tiles.palette],
      [LIBRARY_GLOW, LIBRARY_TILES.tiles.palette],
      [TRACKS_GLOW, TRACKS_TILES.tiles.palette],
      [CAMPUS_ENEMY_GLOW, CAMPUS_ENEMIES.scooter.palette],
      [CAMPUS_BACKDROP.glow, CAMPUS_BACKDROP.palette],
      [LIBRARY_BACKDROP.glow, LIBRARY_BACKDROP.palette],
      [TRACKS_BACKDROP.glow, TRACKS_BACKDROP.palette],
    ];
    for (const [glow, pal] of cases) {
      expect(glow.length).toBeGreaterThan(0);
      for (const ch of glow) expect(pal, ch).toHaveProperty(ch);
    }
    expect(countKeys(CAMPUS_TILES.decor.lampPost.anims.idle.frames[0], CAMPUS_GLOW)).toBeGreaterThan(10);
    expect(countKeys(CAMPUS_TILES.decor.campusSign.anims.idle.frames[0], CAMPUS_GLOW)).toBeGreaterThan(20);
    expect(countKeys(TROLLEY.anims.idle.frames[0], CAMPUS_GLOW)).toBeGreaterThan(100);
    expect(countKeys(LIBRARY_TILES.decor.studyLamp.anims.idle.frames[0], LIBRARY_GLOW)).toBeGreaterThan(4);
    expect(countKeys(ORANGE_TRAIN.anims.idle.frames[0], TRACKS_GLOW)).toBeGreaterThan(20);
    expect(countKeys(COMMUTER_TRAIN.anims.idle.frames[0], TRACKS_GLOW)).toBeGreaterThan(20);
    expect(countKeys(TRACKS_BACKDROP.mid, TRACKS_BACKDROP.glow)).toBeGreaterThan(200);
    expect(countKeys(CAMPUS_BACKDROP.mid, CAMPUS_BACKDROP.glow)).toBeGreaterThan(200);
  });
});

describe('tiles', () => {
  it.each(THEME_TILES)('%s has the rooftop tile keys and variants, so the chunk baker works unchanged', (_name, tiles) => {
    expect(Object.keys(tiles.anims).sort()).toEqual(Object.keys(ROOFTOP_TILES.tiles.anims).sort());
    expect(tiles.size).toEqual({ w: 16, h: 16 });
    expect(tiles.anchor).toEqual({ x: 0, y: 0 });
    expect(frameCounts(tiles as AnySet)).toEqual(TILE_FRAMES);
    for (const name of ['roofTop', 'roofFill'] as const) {
      const f = tiles.anims[name].frames.map((g) => g.join('\n'));
      expect(new Set(f).size, name).toBe(f.length);
    }
    for (const a of Object.values(tiles.anims)) expect(a.fps).toBe(0);
  });

  it.each(THEME_TILES)('%s: the walkable top edge is drawn on row 0 of every floor tile', (_name, tiles) => {
    for (const name of ['roofTop', 'oneWay'] as const) {
      for (const g of tiles.anims[name].frames) expect(g[0].replace(/\./g, '').length, name).toBeGreaterThan(12);
    }
  });
});

describe('campus', () => {
  it('decor has its sizes and frames, anchored bottom left', () => {
    expect(decorSizes(CAMPUS_TILES.decor)).toEqual({
      lampPost: [16, 48, 1], stringLights: [64, 16, 1], bikeRack: [32, 16, 1], bench: [32, 16, 1],
      tree: [32, 48, 1], trolleyStop: [48, 32, 1], campusSign: [48, 16, 2], goalSteps: [32, 48, 4],
    });
    for (const s of Object.values(CAMPUS_TILES.decor)) expect(s.anchor).toEqual({ x: 0, y: s.size.h });
    expect(CAMPUS_TILES.decor.goalSteps.anims.idle.loop).toBe(true);
  });

  it('the construction panel: 16 x 32, idle 1, crack 3 played once, emptier as it bursts', () => {
    const p = CAMPUS_TILES.panel;
    expect(p.size).toEqual({ w: 16, h: 32 });
    expect(p.anchor).toEqual({ x: 0, y: 32 });
    expect(frameCounts(p as AnySet)).toEqual({ idle: 1, crack: 3 });
    expect(p.anims.crack.loop).toBe(false);
    const solid = (g: Grid) => g.join('').replace(/\./g, '').length;
    expect(solid(p.anims.crack.frames[2])).toBeLessThan(solid(p.anims.idle.frames[0]));
  });

  it('the trolley fills the 6 x 2 tile box under its anchor, the pantograph above the roof', () => {
    expect(TROLLEY.size).toEqual({ w: 96, h: 40 });
    expect(TROLLEY.anchor).toEqual({ x: 0, y: 8 });
    const g = TROLLEY.anims.idle.frames[0];
    expect(g.length - TROLLEY.anchor.y).toBe(32);
    // the roof reads as a platform: the roof row is solid nearly end to end
    expect(g[8].replace(/\./g, '').length).toBeGreaterThan(85);
    // something reaches up to the wire, and the wheels sit on the bottom row
    expect(g[0].replace(/\./g, '').length).toBeGreaterThan(0);
    expect(g[g.length - 1].replace(/\./g, '').length).toBeGreaterThan(0);
  });
});

describe('library', () => {
  it('stacks: 4 solid variants that tile', () => {
    const s = LIBRARY_TILES.stacks;
    expect(s.size).toEqual({ w: 16, h: 16 });
    expect(frameCounts(s as AnySet)).toEqual({ idle: 4 });
    expect(s.anims.idle.fps).toBe(0);
    for (const g of s.anims.idle.frames) expect(g.join('')).not.toContain('.');
    expect(new Set(s.anims.idle.frames.map((g) => g.join('\n'))).size).toBe(4);
  });

  it('decor has its sizes and frames, anchored bottom left', () => {
    expect(decorSizes(LIBRARY_TILES.decor)).toEqual({
      studyLamp: [16, 32, 1], studyTable: [32, 16, 1], ladder: [16, 48, 1], window: [48, 48, 1],
      cart: [32, 24, 1], goalWindow: [32, 48, 4], quietSign: [48, 16, 2],
    });
    for (const s of Object.values(LIBRARY_TILES.decor)) expect(s.anchor).toEqual({ x: 0, y: s.size.h });
  });

  it('the backdrop has a ceiling fill colour, and the far strip starts in it', () => {
    expect(LIBRARY_BACKDROP.fill).toMatch(/^#[0-9a-f]{6}$/i);
    expect(LIBRARY_BACKDROP.far[0]).not.toContain('.');
  });
});

describe('tracks', () => {
  it('decor has its sizes and frames, anchored bottom left', () => {
    expect(decorSizes(TRACKS_TILES.decor)).toEqual({
      signal: [16, 32, 2], gantry: [64, 48, 1], stationLamp: [16, 48, 1], glassStairs: [32, 48, 1],
      bench: [32, 16, 1], platformSign: [48, 16, 2], goalBridgeEnd: [32, 48, 4],
    });
    for (const s of Object.values(TRACKS_TILES.decor)) expect(s.anchor).toEqual({ x: 0, y: s.size.h });
  });

  it('the signal: frame 0 shows red, frame 1 green, picked by the sim (fps 0)', () => {
    const s = TRACKS_TILES.decor.signal;
    expect(s.anims.idle.fps).toBe(0);
    const [red, green] = s.anims.idle.frames;
    expect(countKeys(red, 'R')).toBeGreaterThan(4);
    expect(countKeys(green, 'Z')).toBeGreaterThan(4);
    expect(countKeys(red, 'Z')).toBe(0);
    expect(countKeys(green, 'R')).toBe(0);
  });

  it('trains fill their 8 x 2 and 8 x 2.5 tile boxes under the anchor, roofs that read as platforms', () => {
    for (const [t, body] of [[ORANGE_TRAIN, 32], [COMMUTER_TRAIN, 40]] as const) {
      expect(t.size.w).toBe(128);
      expect(t.anchor.x).toBe(0);
      expect(t.size.h - t.anchor.y).toBe(body);
      const g = t.anims.idle.frames[0];
      expect(g[t.anchor.y].replace(/\./g, '').length).toBeGreaterThan(110);
      expect(g[g.length - 1].replace(/\./g, '').length).toBeGreaterThan(0);
    }
  });
});

describe('enemies', () => {
  it('have the sizes and frames, anchored bottom centre', () => {
    expect(CAMPUS_ENEMIES.scooter.size).toEqual({ w: 16, h: 16 });
    expect(frameCounts(CAMPUS_ENEMIES.scooter as AnySet)).toEqual({ roll: 4, squashed: 1 });
    expect(CAMPUS_ENEMIES.ticketDrone.size).toEqual({ w: 16, h: 16 });
    expect(frameCounts(CAMPUS_ENEMIES.ticketDrone as AnySet)).toEqual({ hover: 2, dive: 1, dead: 1 });
    for (const s of Object.values(CAMPUS_ENEMIES)) expect(s.anchor).toEqual({ x: s.size.w / 2, y: s.size.h });
  });

  it('the scooter rolls on the bottom row and its frames differ', () => {
    const r = CAMPUS_ENEMIES.scooter.anims.roll.frames;
    for (const g of r) expect(g[15].replace(/\./g, '').length).toBeGreaterThan(0);
    expect(new Set(r.map((g) => g.join('\n'))).size).toBe(4);
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
