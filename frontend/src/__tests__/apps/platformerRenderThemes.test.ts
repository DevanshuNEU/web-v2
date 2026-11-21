// @vitest-environment jsdom

import { describe, it, expect, beforeEach, type Mock } from 'vitest';
import { stubCanvas } from '../setup/canvas';
import { Juice } from '@/components/apps/games/shared/juice';
import { createWorld, type World } from '@/components/apps/games/platformer/sim/world';
import { TILE } from '@/components/apps/games/platformer/sim/level';
import { drawFrame, preloadTheme, rendererFor, themeReady } from '@/components/apps/games/platformer/render/frame';
import { frameStats, resetWorld1 } from '@/components/apps/games/platformer/render/pixel/world1';
import { loadTheme, themeFor } from '@/components/apps/games/platformer/render/pixel/themes';
import { K, KIND, WALK_DIR, isStaticDecor, isStaticKind } from '@/components/apps/games/platformer/render/pixel/tiles';

type Ctx = Record<string, Mock> & { [k: string]: unknown };

function screen(): Ctx {
  return document.createElement('canvas').getContext('2d') as unknown as Ctx;
}
function allContexts(): Ctx[] {
  const m = HTMLCanvasElement.prototype.getContext as unknown as Mock;
  return m.mock.results.map(r => r.value as Ctx);
}

const story = (id: string): World => createWorld({ mode: 'story', levelId: id, abilities: { wallJump: true, blade: true } } as Parameters<typeof createWorld>[0]);

/** A world of a theme, with the trip's moving parts in view: walkways under her, puffs in every phase, a planes and a descent stretch. */
function themed(theme: string): World {
  const w = theme === 'airport' ? story('2-1') : theme === 'clouds' ? story('2-2') : theme === 'austin' ? story('1-1') : createWorld({ levelIndex: 0 });
  const cols = w.level.cols, hx = Math.floor(w.hero.x), floor = Math.floor(w.hero.y + w.hero.h);
  for (let i = 0; i < 4; i++) w.tiles[floor * cols + hx + i] = i < 2 ? TILE.WALK_R : TILE.WALK_L;
  w.puffs = [
    { x: hx + 1, y: floor - 3, t: 0, solid: true }, { x: hx + 2, y: floor - 3, t: 0.2, solid: true },
    { x: hx + 3, y: floor - 3, t: 0.1, solid: false }, { x: hx + 4, y: floor - 3, t: 2.8, solid: false },
  ];
  w.level = { ...w.level, setPieces: [{ kind: 'planes', x0: hx - 5, x1: hx + 20 }, { kind: 'descent', x0: hx - 5, x1: hx + 10 }] } as World['level'];
  const extra = w as unknown as Record<string, unknown>;
  extra.decor = [
    ...((w.level as unknown as { decor?: unknown[] }).decor ?? []),
    { kind: 'neonSign', x: hx + 2, y: floor - 4 }, { kind: 'wingLight', x: hx + 3, y: floor }, { kind: 'kiosk', x: hx + 5, y: floor },
  ];
  w.t = 2.4;
  return w;
}

const VIEWS = [
  { name: 'portrait', w: 390, h: 844, dpr: 3 },
  { name: 'landscape', w: 844, h: 390, dpr: 3 },
];

beforeEach(() => {
  stubCanvas();
  resetWorld1();
});

describe('the theme seam', () => {
  it('every theme but the old cartoon worlds draws with the pixel renderer', () => {
    for (const t of ['rooftops', 'austin', 'airport', 'clouds', 'campus', 'library', 'tracks', 'backbay']) expect(rendererFor(t)).toBe('pixel');
    for (const t of ['grass', 'cave', 'sky', 'stars']) expect(rendererFor(t)).toBe('cartoon');
  });

  it('the rooftops and Austin are bundled; an unknown pixel theme falls back to the rooftops', () => {
    expect(themeFor('rooftops')?.id).toBe('rooftops');
    expect(themeFor('austin')?.id).toBe('austin');
    expect(themeFor('backbay')?.id).toBe('rooftops');
    expect(themeReady('grass')).toBe(true);
  });

  it('a theme still loading draws a plain dark frame, then its art once loaded', async () => {
    expect(themeFor('airport')).toBeNull();
    expect(themeReady('clouds')).toBe(false);
    const ctx = screen();
    const w = story('2-1');
    expect(() => drawFrame(ctx as unknown as CanvasRenderingContext2D, w, { w: 390, h: 844, mono: false, reduced: false, alpha: 1, dpr: 3 }, new Juice())).not.toThrow();
    expect(ctx.drawImage).toHaveBeenCalled();
    const t = await loadTheme('airport');
    expect(t.id).toBe('airport');
    // one chunk brings both trip themes
    expect(themeFor('clouds')?.id).toBe('clouds');
    expect(themeReady('clouds')).toBe(true);
    await expect(preloadTheme('clouds')).resolves.toBeTruthy();
  });

  it('walkways and thin clouds are drawn per frame, never baked into chunks', () => {
    expect(KIND[TILE.WALK_R]).toBe(K.WALK);
    expect(KIND[TILE.WALK_L]).toBe(K.WALK);
    expect(KIND[TILE.PUFF]).toBe(K.PUFF);
    expect(isStaticKind(K.WALK)).toBe(false);
    expect(isStaticKind(K.PUFF)).toBe(false);
    expect(WALK_DIR[TILE.WALK_R]).toBe(1);
    expect(WALK_DIR[TILE.WALK_L]).toBe(-1);
  });

  it('decor that animates is drawn per frame; still decor, the sign and the goal follow the theme', async () => {
    const roof = themeFor('rooftops')!;
    expect(isStaticDecor(roof, 'waterTower')).toBe(true);
    expect(isStaticDecor(roof, 'neonSign')).toBe(false);
    expect(isStaticDecor(roof, 'goalBeacon')).toBe(false);
    const clouds = await loadTheme('clouds');
    expect(isStaticDecor(clouds, clouds.goal.kind)).toBe(false);
    // wing lights blink in cycles; the cloud tower is drawn over her, never baked
    expect(isStaticDecor(clouds, 'wingLight')).toBe(false);
    expect(isStaticDecor(clouds, 'cloudTower')).toBe(false);
    const airport = await loadTheme('airport');
    expect(isStaticDecor(airport, 'seats')).toBe(true);
    for (const t of [roof, clouds, airport]) {
      expect(t.decor[t.goal.kind]).toBeTruthy();
      expect(t.decor[t.checkpoint]).toBeTruthy();
      expect(t.sign(1, 0, 0).size.w).toBeGreaterThan(0);
    }
  });
});

describe('trip set dressing', () => {
  it('the airport puts a baggage carousel in an indoor hall of 2-1, on a clear floor', async () => {
    const airport = await loadTheme('airport');
    const w = story('2-1');
    const extra = airport.dressing ? airport.dressing(w.level) : [];
    expect(extra.length).toBeGreaterThan(0);
    for (const d of extra) {
      expect(d.kind).toBe('carousel');
      expect(airport.decor[d.kind]).toBeTruthy();
      const cols = w.level.cols;
      for (let i = 0; i < 4; i++) expect(KIND[w.level.tiles[d.y * cols + d.x + i]]).toBe(K.ROOF);
    }
  });
});

describe('every theme draws in both orientations and both palettes', () => {
  for (const theme of ['rooftops', 'austin', 'airport', 'clouds']) {
    for (const v of VIEWS) {
      for (const mono of [false, true]) {
        it(`${theme}, ${v.name}, ${mono ? 'mono' : 'colour'}`, async () => {
          await loadTheme(theme);
          const ctx = screen();
          const w = themed(theme);
          const j = new Juice();
          for (let f = 0; f < 4; f++) {
            w.t += 1 / 60;
            expect(() => drawFrame(ctx as unknown as CanvasRenderingContext2D, w, { w: v.w, h: v.h, mono, reduced: f === 3, alpha: 0.5, dpr: v.dpr }, j)).not.toThrow();
          }
          const saves = allContexts().reduce((n, c) => n + (c.save as Mock).mock.calls.length, 0);
          const restores = allContexts().reduce((n, c) => n + (c.restore as Mock).mock.calls.length, 0);
          expect(saves).toBe(restores);
          // rain only where the theme has weather
          expect(frameStats().rain > 0).toBe(themeFor(theme)!.weather === 'rain');
        });
      }
    }
  }
});

/** A chapter 3 world: a theme's level dressed with vehicles of every kind (one beside her), signals and construction panels. */
function chapter3(theme: string, o: { bare?: boolean } = {}): World {
  const w = createWorld({ levelIndex: 0 });
  w.level = { ...w.level, theme } as World['level'];
  const cols = w.level.cols, hx = Math.floor(w.hero.x), floor = Math.floor(w.hero.y + w.hero.h);
  if (!o.bare) {
    const extra = w as unknown as Record<string, unknown>;
    extra.vehicles = [
      { kind: 'orangeTrain', x: hx - 2, y: floor - 2, w: 8, h: 2, vx: 9, active: true, px: hx - 2.15, py: floor - 2 },
      { kind: 'commuterTrain', x: hx + 6, y: floor - 3, w: 8, h: 2.5, vx: -8, active: true, px: hx + 6.1, py: floor - 3 },
      { kind: 'trolley', x: hx + 12, y: floor - 2, w: 6, h: 2, vx: 4, active: true },
      { kind: 'trolley', x: hx, y: floor - 2, w: 6, h: 2, vx: 0, active: false },
      { kind: 'mystery', x: hx, y: floor - 2, w: 6, h: 2, vx: 1, active: true },
    ];
    extra.signals = [{ x: hx + 3, y: floor - 1, green: true }, { x: hx + 5, y: floor - 1, green: false }];
    // two stacked panels (one pair) and a lone one; the lone one broken mid-level
    const level = { ...w.level, tiles: w.level.tiles.slice() };
    for (const [x, y] of [[hx + 4, floor - 1], [hx + 4, floor - 2], [hx + 7, floor - 1]]) { level.tiles[y * cols + x] = TILE.CRACK; w.tiles[y * cols + x] = TILE.CRACK; }
    w.level = level as World['level'];
    w.tiles[(floor - 1) * cols + hx + 7] = TILE.EMPTY;
  }
  w.t = 3.1;
  return w;
}

describe('chapter 3: campus, library, tracks', () => {
  it('one chunk brings all three themes', async () => {
    expect(themeReady('library')).toBe(false);
    const t = await loadTheme('tracks');
    expect(t.id).toBe('tracks');
    expect(themeFor('campus')?.id).toBe('campus');
    expect(themeFor('library')?.id).toBe('library');
  });

  it('the library is warm and quiet: dust in the lamp light, no rain', async () => {
    const lib = await loadTheme('library');
    expect(lib.weather).toBe('motes');
    const ctx = screen();
    const w = chapter3('library');
    for (let f = 0; f < 4; f++) { w.t += 1 / 60; drawFrame(ctx as unknown as CanvasRenderingContext2D, w, { w: 390, h: 844, mono: false, reduced: false, alpha: 1, dpr: 3 }, new Juice()); }
    expect(frameStats().rain).toBe(0);
    expect(frameStats().motes).toBeGreaterThan(0);
  });

  it('a train passing close rumbles the view, never under reduced motion', async () => {
    await loadTheme('tracks');
    const w = chapter3('tracks');
    const ctx = screen();
    drawFrame(ctx as unknown as CanvasRenderingContext2D, w, { w: 844, h: 390, mono: false, reduced: false, alpha: 1, dpr: 3 }, new Juice());
    expect(frameStats().rumble).toBeGreaterThan(0);
    drawFrame(ctx as unknown as CanvasRenderingContext2D, w, { w: 844, h: 390, mono: false, reduced: true, alpha: 1, dpr: 3 }, new Juice(true));
    expect(frameStats().rumble).toBe(0);
    // nothing on the lanes: no rumble
    resetWorld1();
    drawFrame(ctx as unknown as CanvasRenderingContext2D, chapter3('tracks', { bare: true }), { w: 844, h: 390, mono: false, reduced: false, alpha: 1, dpr: 3 }, new Juice());
    expect(frameStats().rumble).toBe(0);
  });

  it('the campus draws its own construction panels; the other themes keep the cracked wall', async () => {
    expect((await loadTheme('campus')).drawsCracks).toBe(true);
    expect((await loadTheme('tracks')).drawsCracks).toBeFalsy();
  });

  for (const theme of ['campus', 'library', 'tracks']) {
    for (const v of VIEWS) {
      for (const mono of [false, true]) {
        it(`${theme}, ${v.name}, ${mono ? 'mono' : 'colour'}, with vehicles, signals and panels, or none of them`, async () => {
          await loadTheme(theme);
          for (const bare of [false, true]) {
            resetWorld1();
            const ctx = screen();
            const w = chapter3(theme, { bare });
            for (let f = 0; f < 4; f++) {
              w.t += 1 / 60;
              expect(() => drawFrame(ctx as unknown as CanvasRenderingContext2D, w, { w: v.w, h: v.h, mono, reduced: f === 3, alpha: 0.5, dpr: v.dpr }, new Juice())).not.toThrow();
            }
          }
          const saves = allContexts().reduce((n, c) => n + (c.save as Mock).mock.calls.length, 0);
          const restores = allContexts().reduce((n, c) => n + (c.restore as Mock).mock.calls.length, 0);
          expect(saves).toBe(restores);
        });
      }
    }
  }
});
