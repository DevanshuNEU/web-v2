// @vitest-environment jsdom

import { describe, it, expect, beforeEach, type Mock } from 'vitest';
import { stubCanvas } from '../setup/canvas';
import { Juice } from '@/components/apps/games/shared/juice';
import { createWorld, type World } from '@/components/apps/games/platformer/sim/world';
import { TILE } from '@/components/apps/games/platformer/sim/level';
import { tileFor } from '@/components/apps/games/platformer/render/pipeline';
import { drawFrame, rendererFor, viewTile } from '@/components/apps/games/platformer/render/frame';
import { frameStats, resetWorld1 } from '@/components/apps/games/platformer/render/pixel/world1';
import { viewMetrics } from '@/components/apps/games/platformer/render/pixel/camera';
import { MAX_LIGHTS } from '@/components/apps/games/platformer/render/pixel/lights';

type Ctx = Record<string, Mock> & { [k: string]: unknown };

function screen(): Ctx {
  return document.createElement('canvas').getContext('2d') as unknown as Ctx;
}

/** Every 2D context made so far (the screen and the renderer's own buffers). */
function allContexts(): Ctx[] {
  const m = HTMLCanvasElement.prototype.getContext as unknown as Mock;
  return m.mock.results.map(r => r.value as Ctx);
}

/** A world 1 rooftop world with every section D field filled in, as the sim will. */
function rooftops(o: { modifier?: string | null; seed?: number } = {}): World {
  const w = createWorld({ levelIndex: 0 });
  const extra = w as unknown as Record<string, unknown>;
  w.level = { ...w.level, theme: 'rooftops' as World['level']['theme'] };
  const hx = w.hero.x, hy = w.hero.y;
  Object.assign(extra, {
    scarf: Array.from({ length: 10 }, (_, i) => ({ x: hx - i * 0.12, y: hy + 0.6 + i * 0.05 })),
    afterimages: [{ x: hx - 1, y: hy, facing: 1, t: 0.12 }, { x: hx - 2, y: hy, facing: 1, t: 0.05 }],
    decor: [
      { kind: 'waterTower', x: 6, y: 11 }, { kind: 'neonSign', x: 9, y: 8 }, { kind: 'antenna', x: 14, y: 11 },
      { kind: 'acUnit', x: 30, y: 11 }, { kind: 'chimney', x: 40, y: 11 }, { kind: 'crate', x: 44, y: 11 },
      { kind: 'goalBeacon', x: 190, y: 11 },
    ],
    lights: Array.from({ length: 40 }, (_, i) => ({ x: 3 + i * 0.7, y: 9, r: 3, color: i % 2 ? '#ff3d9a' : '#ffb347', flicker: 0.4 })),
    pickups: [{ kind: 'aura', x: 8, y: 9, taken: false }, { kind: 'spark', x: 12, y: 9, taken: true }],
    hitFreeze: 0.04,
    modifier: o.modifier ? { id: o.modifier, name: `The ${o.modifier}` } : null,
    seed: o.seed ?? 1,
    wind: -0.5,
  });
  w.power.aura = 5;
  // phase 2 extras: drone shots, an elite drone, a cracked wall, a sigma coin, a tall beacon
  Object.assign(extra, { shots: [{ x: hx + 2, y: hy, vx: -3, vy: 1, t: 0.5 }, { x: 0, y: 0, vx: 0, vy: 0, t: 0 }] });
  if (w.enemies[0]) w.enemies.push({ ...w.enemies[0], kind: 'eliteDrone' as World['enemies'][number]['kind'], x: hx + 3, y: hy - 2 });
  const cols = w.level.cols;
  w.tiles[10 * cols + Math.floor(hx) + 2] = TILE.CRACK;
  w.tiles[9 * cols + Math.floor(hx) + 3] = TILE.SIGMA;
  w.level = { ...w.level, goal: { x: Math.floor(hx) + 6, top: 3, base: 11, kind: 'beacon' } } as World['level'];
  w.hero.state = 'wallSlide';
  w.hero.wallDir = 1;
  w.t = 3.2;
  return w;
}

const VIEWS = [
  { name: 'portrait', w: 390, h: 520, dpr: 3 },
  { name: 'landscape', w: 844, h: 390, dpr: 3 },
  { name: 'desktop', w: 900, h: 560, dpr: 1 },
];

beforeEach(() => {
  stubCanvas();
  resetWorld1();
});

describe('render seam: routing by theme', () => {
  it('rooftops get the pixel renderer, every other world the cartoon one', () => {
    expect(rendererFor('rooftops')).toBe('pixel');
    for (const t of ['grass', 'cave', 'sky', 'stars']) expect(rendererFor(t)).toBe('cartoon');
  });

  it('the tile size matches the renderer: whole art pixels for rooftops, the old size elsewhere', () => {
    expect(viewTile('grass', 390, 520, 3)).toBeCloseTo(tileFor(390, 520));
    expect(viewTile('rooftops', 390, 520, 3)).toBeCloseTo(viewMetrics(390, 520, 3).tileCss);
  });

  it('a rooftop frame is blitted with smoothing off; a cartoon frame never touches it', () => {
    const a = screen();
    drawFrame(a as unknown as CanvasRenderingContext2D, rooftops(), { w: 390, h: 520, mono: false, reduced: false, alpha: 1, dpr: 3 }, new Juice());
    expect(a.imageSmoothingEnabled).toBe(false);
    expect(a.drawImage).toHaveBeenCalled();
    const b = screen();
    drawFrame(b as unknown as CanvasRenderingContext2D, createWorld({ levelIndex: 1 }), { w: 390, h: 520, mono: false, reduced: false, alpha: 1 }, new Juice());
    expect(b.imageSmoothingEnabled).not.toBe(false);
  });
});

describe('drawing every world without throwing', () => {
  const worlds: [string, () => World][] = [
    ['world 1 rooftops', () => rooftops()],
    ['world 1 bare (no phase 2 fields)', () => { const w = createWorld(); w.level = { ...w.level, theme: 'rooftops' as World['level']['theme'] }; return w; }],
    ['world 2', () => createWorld({ levelIndex: 1 })],
    ['world 3', () => createWorld({ levelIndex: 2 })],
    ['secret', () => createWorld({ levelIndex: 3 })],
  ];
  for (const [name, make] of worlds) {
    for (const v of VIEWS) {
      for (const mono of [false, true]) {
        for (const reduced of [false, true]) {
          it(`${name}, ${v.name}, ${mono ? 'mono' : 'colour'}${reduced ? ', reduced motion' : ''}`, () => {
            const ctx = screen();
            const w = make();
            const j = new Juice(reduced);
            j.burst(100, 100, '#fff4e0', 6);
            j.float(100, 80, '+10', '#ffd23f');
            j.shake(6);
            for (let f = 0; f < 3; f++) {
              w.t += 1 / 60;
              expect(() => drawFrame(ctx as unknown as CanvasRenderingContext2D, w, { w: v.w, h: v.h, mono, reduced, alpha: 0.5, dpr: v.dpr }, j)).not.toThrow();
            }
            const saves = allContexts().reduce((n, c) => n + (c.save as Mock).mock.calls.length, 0);
            const restores = allContexts().reduce((n, c) => n + (c.restore as Mock).mock.calls.length, 0);
            expect(saves).toBe(restores);
          });
        }
      }
    }
  }
});

describe('world 1 frame budget and modifiers', () => {
  const draw = (w: World, reduced = false) => {
    const ctx = screen();
    for (let f = 0; f < 4; f++) {
      w.t += 1 / 60;
      drawFrame(ctx as unknown as CanvasRenderingContext2D, w, { w: 844, h: 390, mono: false, reduced, alpha: 1, dpr: 3 }, new Juice(reduced));
    }
    return { ctx, stats: frameStats() };
  };

  it('never draws more than 24 lights, however many the level has', () => {
    const { stats } = draw(rooftops());
    expect(stats.lights).toBeLessThanOrEqual(MAX_LIGHTS);
    expect(stats.lights).toBeGreaterThan(10);
  });

  it('blackout: only the scarf, coins and orbs give light, and the night is near black', () => {
    const normal = draw(rooftops()).stats;
    resetWorld1();
    const dark = draw(rooftops({ modifier: 'blackout' })).stats;
    expect(dark.levelLights).toBe(0);
    expect(dark.lights).toBeGreaterThan(0);
    expect(dark.ambient).toBeLessThan(normal.ambient * 0.5);
  });

  it('storm: heavier rain, and lightning now and then except under reduced motion', () => {
    const calm = draw(rooftops()).stats;
    resetWorld1();
    const w = rooftops({ modifier: 'storm' });
    let flashes = 0;
    for (let i = 0; i < 40; i++) { w.t += 0.5; if (draw(w).stats.lightning > 0) flashes++; }
    expect(frameStats().rain).toBeGreaterThan(calm.rain);
    expect(flashes).toBeGreaterThan(0);
    resetWorld1();
    const r = rooftops({ modifier: 'storm' });
    let reducedFlashes = 0;
    for (let i = 0; i < 40; i++) { r.t += 0.5; if (draw(r, true).stats.lightning > 0) reducedFlashes++; }
    expect(reducedFlashes).toBe(0);
  });

  it('low gravity: slower rain and floating dust motes', () => {
    const calm = draw(rooftops()).stats;
    resetWorld1();
    const low = draw(rooftops({ modifier: 'lowGravity' })).stats;
    expect(low.rainSpeed).toBeLessThan(calm.rainSpeed * 0.8);
    expect(low.motes).toBeGreaterThan(0);
    expect(calm.motes).toBe(0);
  });

  it('double aura: coins glow brighter', () => {
    const calm = draw(rooftops()).stats;
    resetWorld1();
    const dbl = draw(rooftops({ modifier: 'doubleAura' })).stats;
    expect(dbl.coinGlow).toBeGreaterThan(calm.coinGlow);
  });

  it('the seed changes the skyline and the neon sign text', () => {
    draw(rooftops({ seed: 1 }));
    const a = frameStats();
    resetWorld1();
    draw(rooftops({ seed: 2 }));
    const b = frameStats();
    expect(a.skylineSeed).not.toBe(b.skylineSeed);
    const texts = new Set<string>();
    for (let s = 0; s < 12; s++) { resetWorld1(); draw(rooftops({ seed: s })); texts.add(frameStats().signText); }
    expect(texts.size).toBeGreaterThan(2);
  });

  it('the world card shows the modifier name', () => {
    const w = rooftops({ modifier: 'storm' });
    w.cardT = 1.5;
    const { ctx } = draw(w);
    const texts = (ctx.fillText as Mock).mock.calls.map(c => String(c[0]));
    expect(texts).toContain('The storm');
  });
});

