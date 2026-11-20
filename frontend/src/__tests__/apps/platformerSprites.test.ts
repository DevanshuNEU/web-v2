// @vitest-environment jsdom

import { describe, it, expect, beforeAll } from 'vitest';
import { stubCanvas } from '../setup/canvas';
import {
  ENEMIES,
  HERO,
  HERO_ANIMS,
  HERO_NECK,
  PICKUPS,
  ROOFTOP_TILES,
  type Grid,
  type Palette,
  type SpriteSet,
} from '@/components/apps/games/platformer/render/sprites';
import { bakeGrid, bakeSet, toMono } from '@/components/apps/games/platformer/render/bake';

type AnySet = SpriteSet<string>;

const SETS: [string, AnySet][] = [
  ['HERO', HERO as AnySet],
  ['ROOFTOP_TILES.tiles', ROOFTOP_TILES.tiles as AnySet],
  ...Object.entries(ROOFTOP_TILES.decor).map(([k, s]) => [`decor.${k}`, s as AnySet] as [string, AnySet]),
  ...Object.entries(ENEMIES).map(([k, s]) => [`ENEMIES.${k}`, s as AnySet] as [string, AnySet]),
  ...Object.entries(PICKUPS).map(([k, s]) => [`PICKUPS.${k}`, s as AnySet] as [string, AnySet]),
];

function frameCounts(set: AnySet): Record<string, number> {
  return Object.fromEntries(Object.entries(set.anims).map(([k, a]) => [k, a.frames.length]));
}

function badKeys(grid: Grid, palette: Palette): string[] {
  const bad = new Set<string>();
  for (const row of grid) for (const ch of row) if (ch !== '.' && !(ch in palette)) bad.add(ch);
  return [...bad];
}

describe('sprite grids', () => {
  it.each(SETS)('%s: every frame has the declared size and only palette keys', (_name, set) => {
    for (const [anim, a] of Object.entries(set.anims)) {
      expect(a.frames.length, anim).toBeGreaterThan(0);
      for (const grid of a.frames) {
        expect(grid.length, anim).toBe(set.size.h);
        for (const row of grid) expect(row.length, anim).toBe(set.size.w);
        expect(badKeys(grid, set.palette), anim).toEqual([]);
      }
    }
  });

  it.each(SETS)('%s: palette colours are hex or rgba', (_name, set) => {
    for (const c of Object.values(set.palette)) {
      expect(c).toMatch(/^(#[0-9a-f]{6}|rgba\(\d+,\d+,\d+,(0|1|0?\.\d+)\))$/i);
    }
  });

  it.each(SETS)('%s: no frame is empty', (_name, set) => {
    for (const a of Object.values(set.anims)) {
      for (const grid of a.frames) expect(grid.join('').replace(/\./g, '').length).toBeGreaterThan(0);
    }
  });
});

describe('hero', () => {
  it('is 24 x 24, anchored bottom centre', () => {
    expect(HERO.size).toEqual({ w: 24, h: 24 });
    expect(HERO.anchor).toEqual({ x: 12, y: 24 });
  });

  it('has the frame counts in the contract', () => {
    expect(frameCounts(HERO as AnySet)).toEqual({
      idle: 4, run: 8, rise: 1, apex: 1, fall: 2, land: 1, wallSlide: 2, dash: 2, pound: 2, hurt: 1, victory: 4,
    });
    expect([...HERO_ANIMS].sort()).toEqual(Object.keys(HERO.anims).sort());
  });

  it('has a neck point inside the frame for every frame', () => {
    for (const anim of HERO_ANIMS) {
      const necks = HERO_NECK[anim];
      expect(necks.length, anim).toBe(HERO.anims[anim].frames.length);
      for (const p of necks) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(24);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThan(24);
      }
    }
  });

  it('stands on the bottom row when grounded', () => {
    for (const anim of ['idle', 'run', 'land', 'victory'] as const) {
      for (const grid of HERO.anims[anim].frames) expect(grid[23].replace(/\./g, '').length, anim).toBeGreaterThan(0);
    }
  });

  it('stays roughly inside the 11 x 21 hitbox when standing', () => {
    const g = HERO.anims.idle.frames[0];
    const top = g.findIndex((r) => r.replace(/\./g, '').length > 0);
    expect(24 - top).toBeGreaterThanOrEqual(20);
    expect(24 - top).toBeLessThanOrEqual(22);
  });
});

describe('rooftop tiles', () => {
  const tiles = ROOFTOP_TILES.tiles;

  it('has every tile, 16 x 16, with the variants asked for', () => {
    expect(tiles.size).toEqual({ w: 16, h: 16 });
    expect(frameCounts(tiles as AnySet)).toEqual({
      roofTop: 3, roofEdgeLeft: 1, roofEdgeRight: 1, roofFill: 3, brick: 1, auraBlock: 1, auraBlockUsed: 1,
      stone: 1, spikes: 1, oneWay: 1, vent: 1, pipe: 1,
    });
  });

  it('variants differ from each other', () => {
    for (const name of ['roofTop', 'roofFill'] as const) {
      const f = tiles.anims[name].frames.map((g) => g.join('\n'));
      expect(new Set(f).size, name).toBe(f.length);
    }
  });

  it('decorations have their sizes (multiples of 8) and frame counts', () => {
    const d = ROOFTOP_TILES.decor;
    const sizes = Object.fromEntries(Object.entries(d).map(([k, s]) => [k, [s.size.w, s.size.h, s.anims.idle.frames.length]]));
    expect(sizes).toEqual({
      waterTower: [32, 48, 1], antenna: [16, 48, 1], acUnit: [32, 24, 1], neonSign: [48, 16, 2],
      chimney: [16, 32, 1], crate: [16, 16, 1], goalBeacon: [16, 64, 4],
    });
    for (const s of Object.values(d)) {
      expect(s.size.w % 8).toBe(0);
      expect(s.size.h % 8).toBe(0);
    }
  });
});

describe('enemies and pickups', () => {
  it('enemies have their sizes and frames', () => {
    expect(ENEMIES.adDrone.size).toEqual({ w: 16, h: 16 });
    expect(frameCounts(ENEMIES.adDrone as AnySet)).toEqual({ hover: 2, dive: 1, dead: 1 });
    expect(ENEMIES.doomCrawler.size).toEqual({ w: 16, h: 12 });
    expect(frameCounts(ENEMIES.doomCrawler as AnySet)).toEqual({ walk: 4, squashed: 1 });
  });

  it('pickups have their sizes and frames', () => {
    expect(PICKUPS.coin.size).toEqual({ w: 12, h: 12 });
    expect(frameCounts(PICKUPS.coin as AnySet)).toEqual({ spin: 8 });
    for (const k of ['auraOrb', 'magnetOrb', 'bootsOrb', 'poundOrb', 'sparkOrb'] as const) {
      expect(PICKUPS[k].size, k).toEqual({ w: 16, h: 16 });
      expect(frameCounts(PICKUPS[k] as AnySet), k).toEqual({ idle: 4 });
    }
  });
});

describe('bake', () => {
  beforeAll(() => stubCanvas());

  it.each(SETS)('%s: every frame rect sits inside the sheet', (_name, set) => {
    const sheet = bakeSet(set);
    for (const [anim, a] of Object.entries(set.anims)) {
      for (let i = 0; i < a.frames.length; i++) {
        const r = sheet.frameRect(anim, i);
        expect(r.w).toBe(set.size.w);
        expect(r.h).toBe(set.size.h);
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(sheet.w);
        expect(r.y + r.h).toBeLessThanOrEqual(sheet.h);
      }
    }
  });

  it('frame rects do not overlap and the index wraps', () => {
    const sheet = bakeSet(HERO);
    const seen = new Set<string>();
    for (const anim of HERO_ANIMS) {
      HERO.anims[anim].frames.forEach((_, i) => {
        const r = sheet.frameRect(anim, i);
        const key = `${r.x},${r.y}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      });
    }
    expect(sheet.frameRect('run', 9)).toEqual(sheet.frameRect('run', 1));
    expect(sheet.frameRect('run', -1)).toEqual(sheet.frameRect('run', 7));
    expect(() => sheet.frameRect('nope', 0)).toThrow();
  });

  it('memoises per set and per mono flag', () => {
    const a = bakeSet(HERO);
    expect(bakeSet(HERO)).toBe(a);
    const m = bakeSet(HERO, { mono: true });
    expect(m).not.toBe(a);
    expect(bakeSet(HERO, { mono: true })).toBe(m);
  });

  it('mono bake runs for every set and greys are grey', () => {
    for (const [, set] of SETS) expect(() => bakeSet(set, { mono: true })).not.toThrow();
    expect(toMono('#ff0000')).toBe('rgb(54,54,54)');
    expect(toMono('rgba(255,255,255,0.5)')).toBe('rgba(255,255,255,0.5)');
  });

  it('bakeGrid bakes one grid and memoises it', () => {
    const grid = ROOFTOP_TILES.tiles.anims.brick.frames[0];
    const c = bakeGrid(grid, ROOFTOP_TILES.tiles.palette);
    expect(c.width).toBe(16);
    expect(c.height).toBe(16);
    expect(bakeGrid(grid, ROOFTOP_TILES.tiles.palette)).toBe(c);
    expect(bakeGrid(grid, ROOFTOP_TILES.tiles.palette, { mono: true })).not.toBe(c);
  });
});
