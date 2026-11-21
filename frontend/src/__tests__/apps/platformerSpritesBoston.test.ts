// @vitest-environment jsdom

import { describe, it, expect, beforeAll } from 'vitest';
import { stubCanvas } from '../setup/canvas';
import type { Grid, Palette, SpriteSet } from '@/components/apps/games/platformer/render/sprites/types';
import { ROOFTOP_TILES } from '@/components/apps/games/platformer/render/sprites/rooftop';
import { NEWBURY_BACKDROP, NEWBURY_GLOW, NEWBURY_TILES } from '@/components/apps/games/platformer/render/sprites/newbury';
import { RIVER_BACKDROP, RIVER_GLOW, RIVER_TILES, SAILBOAT, SHELL } from '@/components/apps/games/platformer/render/sprites/river';
import { GUST, HARBOR_BACKDROP, HARBOR_GLOW, HARBOR_TILES, HOOK } from '@/components/apps/games/platformer/render/sprites/harbor';
import { BEACH_BACKDROP, BEACH_GLOW, BEACH_TILES } from '@/components/apps/games/platformer/render/sprites/beach';
import { BOSTON_ENEMIES, BOSTON_ENEMY_GLOW } from '@/components/apps/games/platformer/render/sprites/bostonEnemies';
import { bakeGrid, bakeSet } from '@/components/apps/games/platformer/render/bake';

type AnySet = SpriteSet<string>;

const entries = (prefix: string, o: Readonly<Record<string, unknown>>): [string, AnySet][] =>
  Object.entries(o).map(([k, s]) => [`${prefix}.${k}`, s as AnySet]);

const SETS: [string, AnySet][] = [
  ['NEWBURY_TILES.tiles', NEWBURY_TILES.tiles as AnySet],
  ['NEWBURY_TILES.awning', NEWBURY_TILES.awning as AnySet],
  ...entries('NEWBURY_TILES.decor', NEWBURY_TILES.decor),
  ['RIVER_TILES.tiles', RIVER_TILES.tiles as AnySet],
  ['RIVER_TILES.water', RIVER_TILES.water as AnySet],
  ...entries('RIVER_TILES.decor', RIVER_TILES.decor),
  ['SHELL', SHELL as AnySet],
  ['SAILBOAT', SAILBOAT as AnySet],
  ['HARBOR_TILES.tiles', HARBOR_TILES.tiles as AnySet],
  ...entries('HARBOR_TILES.decor', HARBOR_TILES.decor),
  ['HOOK', HOOK as AnySet],
  ['GUST', GUST as AnySet],
  ['BEACH_TILES.tiles', BEACH_TILES.tiles as AnySet],
  ['BEACH_TILES.wave', BEACH_TILES.wave as AnySet],
  ['BEACH_TILES.sandSculpture', BEACH_TILES.sandSculpture as AnySet],
  ...entries('BEACH_TILES.decor', BEACH_TILES.decor),
  ...entries('BOSTON_ENEMIES', BOSTON_ENEMIES),
];

const STRIPS: [string, Grid, Palette, number, number][] = [
  ['NEWBURY_BACKDROP.far', NEWBURY_BACKDROP.far, NEWBURY_BACKDROP.palette, 512, 112],
  ['NEWBURY_BACKDROP.mid', NEWBURY_BACKDROP.mid, NEWBURY_BACKDROP.palette, 512, 80],
  ['NEWBURY_BACKDROP.near', NEWBURY_BACKDROP.near, NEWBURY_BACKDROP.palette, 512, 64],
  ['RIVER_BACKDROP.far', RIVER_BACKDROP.far, RIVER_BACKDROP.palette, 512, 96],
  ['RIVER_BACKDROP.mid', RIVER_BACKDROP.mid, RIVER_BACKDROP.palette, 512, 80],
  ['RIVER_BACKDROP.near', RIVER_BACKDROP.near, RIVER_BACKDROP.palette, 512, 64],
  ['HARBOR_BACKDROP.far', HARBOR_BACKDROP.far, HARBOR_BACKDROP.palette, 512, 96],
  ['HARBOR_BACKDROP.mid', HARBOR_BACKDROP.mid, HARBOR_BACKDROP.palette, 512, 80],
  ['HARBOR_BACKDROP.near', HARBOR_BACKDROP.near, HARBOR_BACKDROP.palette, 512, 64],
  ['BEACH_BACKDROP.far', BEACH_BACKDROP.far, BEACH_BACKDROP.palette, 512, 96],
  ['BEACH_BACKDROP.mid', BEACH_BACKDROP.mid, BEACH_BACKDROP.palette, 512, 80],
  ['BEACH_BACKDROP.near', BEACH_BACKDROP.near, BEACH_BACKDROP.palette, 512, 64],
];

const TILE_FRAMES = {
  roofTop: 3, roofEdgeLeft: 1, roofEdgeRight: 1, roofFill: 3, brick: 1, auraBlock: 1, auraBlockUsed: 1,
  stone: 1, spikes: 1, oneWay: 1, vent: 1, pipe: 1,
};

const THEME_TILES: [string, SpriteSet<string>][] = [
  ['newbury', NEWBURY_TILES.tiles],
  ['river', RIVER_TILES.tiles],
  ['harbor', HARBOR_TILES.tiles],
  ['beach', BEACH_TILES.tiles],
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

const solid = (g: Grid) => g.join('').replace(/\./g, '').length;
const distinct = (frames: readonly Grid[]) => new Set(frames.map((g) => g.join('\n'))).size;

const COLOUR = /^(#[0-9a-f]{6}|rgba\(\d+,\d+,\d+,(0|1|0?\.\d+)\))$/i;

describe('chapter 4 sprite grids', () => {
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

  it.each(STRIPS)('%s: a strip of the declared size, one solid colour along the bottom so it can be lifted', (_name, grid, pal, w, h) => {
    expect(grid.length).toBe(h);
    for (const row of grid) expect(row.length).toBe(w);
    expect(badKeys(grid, pal)).toEqual([]);
    for (const c of Object.values(pal)) expect(c).toMatch(COLOUR);
    expect(grid[h - 1]).not.toContain('.');
    expect(new Set(grid[h - 1]).size).toBe(1);
  });

  it('glow keys are palette keys, and the lights are there', () => {
    const cases: [string, Palette][] = [
      [NEWBURY_GLOW, NEWBURY_TILES.tiles.palette],
      [RIVER_GLOW, RIVER_TILES.tiles.palette],
      [HARBOR_GLOW, HARBOR_TILES.tiles.palette],
      [BEACH_GLOW, BEACH_TILES.tiles.palette],
      [BOSTON_ENEMY_GLOW, BOSTON_ENEMIES.pigeon.palette],
      [NEWBURY_BACKDROP.glow, NEWBURY_BACKDROP.palette],
      [RIVER_BACKDROP.glow, RIVER_BACKDROP.palette],
      [HARBOR_BACKDROP.glow, HARBOR_BACKDROP.palette],
      [BEACH_BACKDROP.glow, BEACH_BACKDROP.palette],
    ];
    for (const [glow, pal] of cases) {
      expect(glow.length).toBeGreaterThan(0);
      for (const ch of glow) expect(pal, ch).toHaveProperty(ch);
    }
    expect(countKeys(NEWBURY_TILES.decor.gasLamp.anims.idle.frames[0], NEWBURY_GLOW)).toBeGreaterThan(30);
    expect(countKeys(NEWBURY_TILES.decor.shopWindow.anims.idle.frames[0], NEWBURY_GLOW)).toBeGreaterThan(300);
    expect(countKeys(RIVER_TILES.decor.bridgeLamp.anims.idle.frames[0], RIVER_GLOW)).toBeGreaterThan(20);
    expect(countKeys(RIVER_TILES.decor.hatchShell.anims.idle.frames[0], RIVER_GLOW)).toBeGreaterThan(300);
    expect(countKeys(HARBOR_TILES.decor.museumOverhang.anims.idle.frames[0], HARBOR_GLOW)).toBeGreaterThan(20);
    expect(countKeys(NEWBURY_BACKDROP.mid, NEWBURY_BACKDROP.glow)).toBeGreaterThan(400);
    expect(countKeys(RIVER_BACKDROP.mid, RIVER_BACKDROP.glow)).toBeGreaterThan(60);
  });
});

describe('tiles', () => {
  it.each(THEME_TILES)('%s has the rooftop tile keys and variants, so the chunk baker works unchanged', (_name, tiles) => {
    expect(Object.keys(tiles.anims).sort()).toEqual(Object.keys(ROOFTOP_TILES.tiles.anims).sort());
    expect(tiles.size).toEqual({ w: 16, h: 16 });
    expect(tiles.anchor).toEqual({ x: 0, y: 0 });
    expect(frameCounts(tiles as AnySet)).toEqual(TILE_FRAMES);
    for (const name of ['roofTop', 'roofFill'] as const) expect(distinct(tiles.anims[name].frames), name).toBe(3);
    for (const a of Object.values(tiles.anims)) expect(a.fps).toBe(0);
  });

  it.each(THEME_TILES)('%s: the walkable top edge is drawn on row 0 of every floor tile', (_name, tiles) => {
    for (const name of ['roofTop', 'oneWay'] as const) {
      for (const g of tiles.anims[name].frames) expect(g[0].replace(/\./g, '').length, name).toBeGreaterThan(12);
    }
  });

  it.each(THEME_TILES)('%s: wall tiles are solid, so chunks have no holes', (_name, tiles) => {
    for (const name of ['roofTop', 'roofFill', 'stone', 'vent'] as const) {
      for (const g of tiles.anims[name].frames) expect(g.join(''), name).not.toContain('.');
    }
  });
});

describe('newbury', () => {
  it('decor has its sizes and frames, anchored bottom left; the goal lamp loops', () => {
    expect(decorSizes(NEWBURY_TILES.decor)).toEqual({
      gasLamp: [16, 48, 1], treeInPlanter: [32, 48, 1], stoop: [32, 32, 1], mailbox: [16, 24, 1],
      shopWindow: [48, 32, 1], goalLamp: [32, 48, 4],
    });
    for (const s of Object.values(NEWBURY_TILES.decor)) expect(s.anchor).toEqual({ x: 0, y: s.size.h });
    expect(NEWBURY_TILES.decor.goalLamp.anims.idle.loop).toBe(true);
  });

  it('the awning: 32 x 8, its top on row 1 at rest, squash 3 frames played once, sagging then rebounding', () => {
    const a = NEWBURY_TILES.awning;
    expect(a.size).toEqual({ w: 32, h: 8 });
    expect(a.anchor).toEqual({ x: 0, y: 1 });
    expect(frameCounts(a as AnySet)).toEqual({ idle: 1, squash: 3 });
    expect(a.anims.squash.loop).toBe(false);
    const idle = a.anims.idle.frames[0];
    expect(idle[0].replace(/\./g, '')).toBe('');
    expect(idle[1].replace(/\./g, '').length).toBe(32);
    const [sag, rebound] = a.anims.squash.frames;
    // the sag leaves the middle of row 1 empty; the rebound bulges into row 0
    expect(sag[1][16]).toBe('.');
    expect(rebound[0][16]).not.toBe('.');
  });
});

describe('river', () => {
  it('decor has its sizes and frames, anchored bottom left', () => {
    expect(decorSizes(RIVER_TILES.decor)).toEqual({
      bridgeLamp: [16, 48, 1], bench: [32, 16, 1], boatDock: [48, 16, 1], lifebuoy: [16, 24, 1], hatchShell: [64, 48, 4],
    });
    for (const s of Object.values(RIVER_TILES.decor)) expect(s.anchor).toEqual({ x: 0, y: s.size.h });
    expect(RIVER_TILES.decor.hatchShell.anims.idle.loop).toBe(true);
  });

  it('water: surface and deep, 4 looping frames each that differ, the deep cells solid', () => {
    const w = RIVER_TILES.water;
    expect(w.size).toEqual({ w: 16, h: 16 });
    expect(frameCounts(w as AnySet)).toEqual({ surface: 4, deep: 4 });
    for (const a of Object.values(w.anims)) {
      expect(a.loop).toBe(true);
      expect(a.fps).toBeGreaterThan(0);
      expect(distinct(a.frames)).toBe(4);
    }
    for (const g of w.anims.deep.frames) expect(g.join('')).not.toContain('.');
  });

  it('the shell: 128 wide, the hull she rides on the anchor row, 8 px of body under it, a 2 frame stroke', () => {
    expect(SHELL.size).toEqual({ w: 128, h: 16 });
    expect(SHELL.anchor).toEqual({ x: 0, y: 8 });
    expect(SHELL.size.h - SHELL.anchor.y).toBe(8);
    expect(frameCounts(SHELL as AnySet)).toEqual({ idle: 2 });
    for (const g of SHELL.anims.idle.frames) {
      expect(g[8].replace(/\./g, '').length).toBeGreaterThan(110);
      expect(solid(g.slice(0, 8))).toBeGreaterThan(40); // the rowers
    }
    expect(distinct(SHELL.anims.idle.frames)).toBe(2);
  });

  it('the sailboat: 64 x 48, the deck on the anchor row reads as a platform, the mast reaches the top', () => {
    expect(SAILBOAT.size).toEqual({ w: 64, h: 48 });
    expect(SAILBOAT.anchor).toEqual({ x: 0, y: 32 });
    const g = SAILBOAT.anims.idle.frames[0];
    expect(g[32].replace(/\./g, '').length).toBeGreaterThan(50);
    expect(g[0].replace(/\./g, '').length).toBeGreaterThan(0);
  });
});

describe('harbor', () => {
  it('decor has its sizes and frames, anchored bottom left', () => {
    expect(decorSizes(HARBOR_TILES.decor)).toEqual({
      bollard: [16, 16, 1], craneLeg: [32, 48, 1], containerStack: [32, 32, 1], fishCrates: [32, 16, 1],
      museumOverhang: [64, 48, 4],
    });
    for (const s of Object.values(HARBOR_TILES.decor)) expect(s.anchor).toEqual({ x: 0, y: s.size.h });
  });

  it('the hook: 16 x 24, anchored on its beam top centre, the beam full width, the cable at the top', () => {
    expect(HOOK.size).toEqual({ w: 16, h: 24 });
    expect(HOOK.anchor).toEqual({ x: 8, y: 17 });
    const g = HOOK.anims.idle.frames[0];
    expect(g[17].replace(/\./g, '').length).toBe(16);
    expect(g[0].replace(/\./g, '').length).toBeGreaterThan(0);
  });

  it('gust streaks: 16 x 8, 3 looping frames that differ', () => {
    expect(GUST.size).toEqual({ w: 16, h: 8 });
    expect(frameCounts(GUST as AnySet)).toEqual({ idle: 3 });
    expect(GUST.anims.idle.loop).toBe(true);
    expect(distinct(GUST.anims.idle.frames)).toBe(3);
  });
});

describe('beach', () => {
  it('decor has its sizes and frames, anchored bottom left', () => {
    expect(decorSizes(BEACH_TILES.decor)).toEqual({
      boulevardLamp: [16, 48, 1], lifeguardChair: [32, 48, 1], sandCastle: [32, 16, 1], umbrella: [32, 32, 1],
      bandstand: [64, 48, 4],
    });
    for (const s of Object.values(BEACH_TILES.decor)) expect(s.anchor).toEqual({ x: 0, y: s.size.h });
  });

  it('waves: front and body, 4 looping frames each that differ, standing on the sand', () => {
    const w = BEACH_TILES.wave;
    expect(w.size).toEqual({ w: 16, h: 16 });
    expect(w.anchor).toEqual({ x: 0, y: 16 });
    expect(frameCounts(w as AnySet)).toEqual({ front: 4, body: 4 });
    for (const a of Object.values(w.anims)) {
      expect(a.loop).toBe(true);
      expect(distinct(a.frames)).toBe(4);
      for (const g of a.frames) expect(g[15].replace(/\./g, '').length).toBeGreaterThan(8);
    }
  });

  it('the sand sculpture: 32 x 24, idle 1, crumble 3 played once, emptier as it falls', () => {
    const s = BEACH_TILES.sandSculpture;
    expect(s.size).toEqual({ w: 32, h: 24 });
    expect(s.anchor).toEqual({ x: 0, y: 24 });
    expect(frameCounts(s as AnySet)).toEqual({ idle: 1, crumble: 3 });
    expect(s.anims.crumble.loop).toBe(false);
    expect(solid(s.anims.crumble.frames[2])).toBeLessThan(solid(s.anims.idle.frames[0]));
  });
});

describe('enemies', () => {
  it('have the sizes and frames, anchored bottom centre', () => {
    expect(BOSTON_ENEMIES.pigeon.size).toEqual({ w: 16, h: 12 });
    expect(frameCounts(BOSTON_ENEMIES.pigeon as AnySet)).toEqual({ hop: 4, squashed: 1 });
    expect(BOSTON_ENEMIES.gull.size).toEqual({ w: 16, h: 16 });
    expect(frameCounts(BOSTON_ENEMIES.gull as AnySet)).toEqual({ hover: 2, swoop: 2, dead: 1 });
    for (const s of Object.values(BOSTON_ENEMIES)) expect(s.anchor).toEqual({ x: s.size.w / 2, y: s.size.h });
  });

  it('the pigeon stands on the bottom row when grounded and leaves it at the top of the hop', () => {
    const [crouch, , aloft] = BOSTON_ENEMIES.pigeon.anims.hop.frames;
    expect(distinct(BOSTON_ENEMIES.pigeon.anims.hop.frames)).toBe(4);
    expect(countKeys([crouch[11]], 'jk')).toBeGreaterThan(0);
    expect(countKeys([aloft[11]], 'jk')).toBe(0);
  });

  it('the gull glares: its eye is a glow key in every live frame', () => {
    for (const anim of ['hover', 'swoop'] as const) {
      for (const g of BOSTON_ENEMIES.gull.anims[anim].frames) expect(countKeys(g, 'y')).toBeGreaterThan(0);
    }
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
