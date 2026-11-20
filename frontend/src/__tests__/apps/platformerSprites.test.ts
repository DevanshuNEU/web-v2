// @vitest-environment jsdom

import { describe, it, expect, beforeAll } from 'vitest';
import { stubCanvas } from '../setup/canvas';
import {
  AUSTIN,
  BLADE_TIP,
  BREAKABLES,
  ENEMIES,
  FX,
  HERO,
  HERO_ANIMS,
  HERO_ATTACK_ANIMS,
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
  ...Object.entries(FX).map(([k, s]) => [`FX.${k}`, s as AnySet] as [string, AnySet]),
  ...Object.entries(BREAKABLES).map(([k, s]) => [`BREAKABLES.${k}`, s as AnySet] as [string, AnySet]),
  ...Object.entries(AUSTIN.far).map(([k, s]) => [`AUSTIN.far.${k}`, s as AnySet] as [string, AnySet]),
  ...Object.entries(AUSTIN.near).map(([k, s]) => [`AUSTIN.near.${k}`, s as AnySet] as [string, AnySet]),
  ['AUSTIN.bat', AUSTIN.bat as AnySet],
];

/** Count of pixels in a grid whose key is one of `keys`. */
function countKeys(grid: Grid, keys: string): number {
  let n = 0;
  for (const row of grid) for (const ch of row) if (keys.includes(ch)) n++;
  return n;
}

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
      attack1: 3, attack2: 3, attack3: 4, airSlash: 3, downStrike: 2,
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

describe('hero attacks (the blade)', () => {
  const BLADE = 'XZz';

  it('lists the attack anims, all part of HERO', () => {
    expect([...HERO_ATTACK_ANIMS]).toEqual(['attack1', 'attack2', 'attack3', 'airSlash', 'downStrike']);
    for (const a of HERO_ATTACK_ANIMS) expect(HERO_ANIMS).toContain(a);
  });

  it('every attack frame shows the blade', () => {
    for (const a of HERO_ATTACK_ANIMS) {
      for (const grid of HERO.anims[a].frames) expect(countKeys(grid, BLADE), a).toBeGreaterThanOrEqual(4);
    }
  });

  it('has a blade tip for every attack frame, on a blade pixel inside the frame', () => {
    for (const a of HERO_ATTACK_ANIMS) {
      const tips = BLADE_TIP[a];
      expect(tips.length, a).toBe(HERO.anims[a].frames.length);
      tips.forEach((p, i) => {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(24);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThan(24);
        expect(BLADE, `${a}[${i}] at ${p.x},${p.y}`).toContain(HERO.anims[a].frames[i][p.y][p.x]);
      });
    }
  });

  it('swings reach forward and the down-strike points under the feet', () => {
    expect(BLADE_TIP.attack1[1].x).toBeGreaterThanOrEqual(21);
    expect(BLADE_TIP.attack2[1].x).toBeGreaterThanOrEqual(21);
    expect(BLADE_TIP.attack3[2].x).toBeGreaterThanOrEqual(21);
    expect(BLADE_TIP.airSlash[1].x).toBeGreaterThanOrEqual(21);
    for (const p of BLADE_TIP.downStrike) expect(p.y).toBe(23);
    for (const grid of HERO.anims.downStrike.frames) expect(countKeys([grid[23]], BLADE)).toBeGreaterThan(0);
  });

  it('anticipation frames wind the blade back or up, away from the strike', () => {
    expect(BLADE_TIP.attack1[0].y).toBeLessThan(6);
    expect(BLADE_TIP.attack2[0].x).toBeLessThan(10);
    expect(BLADE_TIP.attack3[0].x).toBeLessThan(10);
  });
});

describe('fx', () => {
  it('has the smears, the spark, the pogo ring and dust with their sizes and frames', () => {
    const shape = Object.fromEntries(
      Object.entries(FX).map(([k, s]) => [k, [s.size.w, s.size.h, s.anims.play.frames.length]]),
    );
    expect(shape).toEqual({
      smear1: [32, 32, 3], smear2: [32, 32, 3], smear3: [32, 32, 3], smearAir: [32, 32, 3], smearDown: [32, 32, 2],
      hitSpark: [16, 16, 4], pogoRing: [24, 8, 3], dust: [8, 8, 4],
    });
    for (const s of Object.values(FX)) expect(s.anims.play.loop).toBe(false);
  });

  it('smears start bright and fade out by the last frame', () => {
    for (const k of ['smear1', 'smear2', 'smear3', 'smearAir', 'smearDown'] as const) {
      const bright = FX[k].anims.play.frames.map((g) => countKeys(g, 'WX'));
      expect(bright[0], k).toBeGreaterThan(10);
      expect(bright[bright.length - 1], k).toBeLessThan(bright[0] / 2);
    }
  });

  it('the finisher smear is the biggest', () => {
    const area = (k: keyof typeof FX) => countKeys(FX[k].anims.play.frames[0], 'WXZzy');
    expect(area('smear3')).toBeGreaterThan(area('smear1'));
    expect(area('smear3')).toBeGreaterThan(area('smear2'));
  });

  it('anchors sit inside the frame', () => {
    for (const s of Object.values(FX)) {
      expect(s.anchor.x).toBeGreaterThanOrEqual(0);
      expect(s.anchor.x).toBeLessThanOrEqual(s.size.w);
      expect(s.anchor.y).toBeGreaterThanOrEqual(0);
      expect(s.anchor.y).toBeLessThanOrEqual(s.size.h);
    }
  });
});

describe('breakables', () => {
  it('has the crate, its debris, the sign and its shards', () => {
    const shape = Object.fromEntries(
      Object.entries(BREAKABLES).map(([k, s]) => [k, [s.size.w, s.size.h, frameCounts(s as AnySet)]]),
    );
    expect(shape).toEqual({
      crate: [16, 16, { idle: 1 }],
      crateDebris: [8, 8, { pieces: 4 }],
      sign: [32, 16, { idle: 2, broken: 1 }],
      signShards: [8, 8, { pieces: 4 }],
    });
  });

  it('debris pieces differ from each other', () => {
    for (const s of [BREAKABLES.crateDebris, BREAKABLES.signShards]) {
      const f = s.anims.pieces.frames.map((g) => g.join('\n'));
      expect(new Set(f).size).toBe(f.length);
    }
  });
});

describe('austin skyline', () => {
  const NAMES = ['capitol', 'frostTower', 'austonian', 'towerFlat', 'towerStepped', 'towerSlant'];

  it('has every building at both depths, 48 to 96 px tall, anchored bottom left', () => {
    expect(Object.keys(AUSTIN.far).sort()).toEqual([...NAMES].sort());
    expect(Object.keys(AUSTIN.near).sort()).toEqual([...NAMES].sort());
    for (const depth of [AUSTIN.far, AUSTIN.near]) {
      for (const s of Object.values(depth)) {
        expect(s.size.h).toBeGreaterThanOrEqual(48);
        expect(s.size.h).toBeLessThanOrEqual(96);
        expect(s.anchor).toEqual({ x: 0, y: s.size.h });
        for (const g of s.anims.idle.frames) expect(g[s.size.h - 1].replace(/\./g, '').length).toBeGreaterThan(0);
      }
    }
  });

  it('far variants are smaller than near ones, and near windows are lit', () => {
    for (const n of NAMES) {
      const k = n as keyof typeof AUSTIN.far;
      expect(AUSTIN.far[k].size.h, n).toBeLessThan(AUSTIN.near[k].size.h);
      expect(countKeys(AUSTIN.near[k].anims.idle.frames[0], 'wWvk'), n).toBeGreaterThan(5);
    }
  });

  it('generic towers come in two window variants', () => {
    for (const k of ['towerFlat', 'towerStepped', 'towerSlant'] as const) {
      for (const depth of [AUSTIN.far, AUSTIN.near]) {
        const f = depth[k].anims.idle.frames.map((g) => g.join('\n'));
        expect(f.length).toBe(2);
        expect(new Set(f).size).toBe(2);
      }
    }
  });

  it('the bat is 8 x 6 with a 4 frame flap', () => {
    expect(AUSTIN.bat.size).toEqual({ w: 8, h: 6 });
    expect(AUSTIN.bat.anims.flap.frames.length).toBe(4);
    expect(AUSTIN.bat.anims.flap.loop).toBe(true);
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
    for (const k of ['auraOrb', 'magnetOrb', 'bootsOrb', 'poundOrb', 'sparkOrb', 'batWings', 'tacoRush', 'blade'] as const) {
      expect(PICKUPS[k].size, k).toEqual({ w: 16, h: 16 });
      expect(frameCounts(PICKUPS[k] as AnySet), k).toEqual({ idle: 4 });
    }
    expect(PICKUPS.memory.size).toEqual({ w: 12, h: 12 });
    expect(frameCounts(PICKUPS.memory as AnySet)).toEqual({ idle: 4 });
    for (const s of Object.values(PICKUPS)) expect(s.anchor).toEqual({ x: s.size.w / 2, y: s.size.h / 2 });
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
