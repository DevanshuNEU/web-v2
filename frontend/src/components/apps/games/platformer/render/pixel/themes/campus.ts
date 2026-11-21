/**
 * Chapter 3, Northeastern: the campus (3-1, Huntington Avenue), the library
 * (3-2, Snell After Midnight) and the tracks (3-3, Over the Tracks). One
 * lazy chunk, loaded by ../themes.ts when the chapter card shows.
 *
 * Their own layers: the vehicles (the Green Line trolley, the Orange Line and
 * commuter trains) drawn behind her but in front of the tiles, lit windows
 * glowing and a headlight throwing light ahead, with a soft rumble when a
 * train passes close; the signals by the tracks; the boarded construction
 * panels a dash smashes. Everything is read defensively from the World
 * (missing means none) and drawn without allocating.
 */

import type { SpriteSet } from '../../sprites';
import type { Level } from '../../../sim/level';
import type { Decor } from '../read';
import type { Ctx } from '../canvas';
import type { Sky, SkyLayer } from '../skyline';
import type { FacadeCell } from '../tiles';
import type { PixelTheme, ThemeFrame, ThemeKit, EnemyArt } from '../themes';
import type { SkyPreset } from '../timeofday';
import { backdropSky, col, setKit, stripLayer } from './strips';
import { drawRails, drawVehicles, type VehicleArt } from './vehicles';
import { CAMPUS_BACKDROP, CAMPUS_GLOW, CAMPUS_TILES, TROLLEY } from '../../sprites/campus';
import { LIBRARY_BACKDROP, LIBRARY_GLOW, LIBRARY_TILES } from '../../sprites/library';
import { COMMUTER_TRAIN, ORANGE_TRAIN, TRACKS_BACKDROP, TRACKS_GLOW, TRACKS_TILES } from '../../sprites/tracks';
import { CAMPUS_ENEMIES, CAMPUS_ENEMY_GLOW } from '../../sprites/campusEnemies';

let D: ThemeKit;

const WARM = '#ffcf8a', CREAM = '#fff1c2', COOL = '#bfe6ff', SODIUM = '#ffb347', SIGNAL_RED = '#ff4a5a', SIGNAL_GREEN = '#7dffa0';

// ─────────────────────────────────────────────────────────────────────────────
// Vehicles
// ─────────────────────────────────────────────────────────────────────────────

/** The trolley and the trains, cab on the right: headlight ahead, windows glowing, the trains rumble. */
function landVehicle(set: SpriteSet<'idle'>, glow: string, bodyH: number, window: string, rumble: number): VehicleArt {
  const w = set.size.w, top = set.anchor.y;
  return {
    set, glow, rumble,
    lights: [
      { dx: w + 10, dy: top + bodyH * 0.55, r: 70, color: CREAM, k: 0.95, halo: 0.5 },
      { dx: w * 0.3, dy: top + bodyH * 0.45, r: 46, color: window, k: 0.55, halo: 0 },
      { dx: w * 0.7, dy: top + bodyH * 0.45, r: 46, color: window, k: 0.55, halo: 0 },
    ],
  };
}
const VEHICLE_ART: Readonly<Record<string, VehicleArt>> = {
  trolley: landVehicle(TROLLEY, CAMPUS_GLOW, 32, '#ffe2a8', 0.35),
  orangeTrain: landVehicle(ORANGE_TRAIN, TRACKS_GLOW, 32, '#dff0ff', 1.4),
  commuterTrain: landVehicle(COMMUTER_TRAIN, TRACKS_GLOW, 40, '#ffe9c9', 1.6),
};

// ─────────────────────────────────────────────────────────────────────────────
// Signals and panels
// ─────────────────────────────────────────────────────────────────────────────

interface SignalLike { x: number; y: number; green: boolean }
const NO_SIGNALS: readonly SignalLike[] = [];

/** Signals stand in their cell: frame 0 red, frame 1 green, and their lamp lights the track. */
function drawSignals(c: Ctx, f: ThemeFrame, layer: 'base' | 'glow') {
  const list = (f.world as unknown as { signals?: readonly SignalLike[] }).signals ?? NO_SIGNALS;
  if (!list.length) return;
  const T = D.ART_TILE;
  const a = D.atlas(TRACKS_TILES.decor.signal, f.mono, TRACKS_GLOW);
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    const x = s.x * T - f.ox, bottom = (s.y + 1) * T - f.oy;
    if (x > f.bw || x + a.w < 0) continue;
    D.drawFrame(c, a, 'idle', s.green ? 1 : 0, x, bottom, 1, layer);
    if (layer === 'base') f.light(x + 8, bottom - a.h + (s.green ? 10 : 4), 24, s.green ? SIGNAL_GREEN : SIGNAL_RED, 0.9, 0.6);
  }
}

/** Panels already broken (tile cell and the time it went), so the crack plays once. Fixed pool. */
const BROKEN_CAP = 24;
const broken = Array.from({ length: BROKEN_CAP }, () => ({ x: -1, y: -1, t0: 0 }));
let brokenLevel: unknown = null;
let brokenNext = 0;

function brokeAt(x: number, y: number, t: number): number {
  for (let i = 0; i < BROKEN_CAP; i++) if (broken[i].x === x && broken[i].y === y) return broken[i].t0;
  const b = broken[brokenNext];
  brokenNext = (brokenNext + 1) % BROKEN_CAP;
  b.x = x; b.y = y; b.t0 = t;
  return t;
}

const PANEL = CAMPUS_TILES.panel;
const CRACK = PANEL.anims.crack;
const CRACK_TIME = CRACK.frames.length / (CRACK.fps || 12);

/**
 * The construction panels (the dash-breakable % cells), drawn by the theme:
 * one 16 x 32 panel per two stacked cells, counted from the bottom of each
 * run in the level as built; a lone cell shows the panel's lower half. When
 * the cells break the panel plays its crack once, then is gone.
 */
function drawPanels(c: Ctx, f: ThemeFrame, layer: 'base' | 'glow') {
  if (layer !== 'base') return;
  const w = f.world, level = w.level, cols = level.cols, T = D.ART_TILE, CK = D.K.CRACK;
  if (brokenLevel !== level) { brokenLevel = level; for (const b of broken) { b.x = -1; b.y = -1; } }
  const a = D.atlas(PANEL, f.mono, CAMPUS_GLOW);
  const c0 = Math.max(0, Math.floor(f.ox / T)), c1 = Math.min(cols - 1, Math.floor((f.ox + f.bw) / T));
  const rows = D.ROWS;
  for (let tx = c0; tx <= c1; tx++) {
    let ty = rows - 1;
    while (ty >= 0) {
      if (D.KIND[level.tiles[ty * cols + tx]] !== CK) { ty--; continue; }
      // the bottom of a run: pair upwards
      const pair = ty > 0 && D.KIND[level.tiles[(ty - 1) * cols + tx]] === CK;
      const x = tx * T - f.ox, bottom = (ty + 1) * T - f.oy;
      const intact = D.KIND[w.tiles[ty * cols + tx]] === CK;
      if (intact) {
        if (pair) D.drawFrame(c, a, 'idle', 0, x, bottom, 1);
        else {
          const r = a.rects.idle[0];
          c.drawImage(a.sheet, r.x, r.y + 16, 16, 16, x, bottom - 16, 16, 16);
        }
      } else {
        const age = f.t - brokeAt(tx, ty, f.t);
        if (age < CRACK_TIME) D.drawFrame(c, a, 'crack', Math.min(CRACK.frames.length - 1, age * (CRACK.fps || 12)), x, bottom, 1);
      }
      ty -= pair ? 2 : 1;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Facades
// ─────────────────────────────────────────────────────────────────────────────

function shadeAndSides(cell: FacadeCell, max: number, per: number, shade: string, rim: string, dark: string) {
  const { base: b, px, py, depth } = cell;
  if (depth > 0) {
    b.fillStyle = dark;
    b.globalAlpha = Math.min(max, per * depth);
    b.fillRect(px, py, 16, 16);
    b.globalAlpha = 1;
  }
  if (cell.openL) { b.fillStyle = shade; b.fillRect(px, py + 1, 1, 15); b.fillStyle = rim; b.fillRect(px + 1, py + 2, 1, 14); }
  if (cell.openR) { b.fillStyle = shade; b.fillRect(px + 15, py + 1, 1, 15); }
}

/** Brick under limestone: lower floors darker, the corners read. */
function campusFacade(cell: FacadeCell) {
  shadeAndSides(cell, 0.5, 0.1, cell.mono ? '#0b0b0c' : '#0a0610', cell.mono ? '#4a4a50' : '#5a3a3a', 'rgba(4,2,8,1)');
}

/** Concrete platforms and piers. */
function tracksFacade(cell: FacadeCell) {
  shadeAndSides(cell, 0.55, 0.11, cell.mono ? '#0b0b0c' : '#06080e', cell.mono ? '#4a4a50' : '#3a4256', 'rgba(2,3,8,1)');
}

const STACK_W = [0.42, 0.3, 0.24, 0.04];
/** The stacks: tall blocks of shelving are book-spine tiles; the slab at a block's foot stays floor structure. */
function libraryFacade(cell: FacadeCell) {
  if (cell.depth >= 1 && cell.below) {
    const a = D.atlas(LIBRARY_TILES.stacks, cell.mono, LIBRARY_GLOW);
    const h = D.hash2(cell.tx * 13 + 7, cell.ty * 5 + 3);
    let v = 0, acc = 0;
    for (let i = 0; i < STACK_W.length; i++) { acc += STACK_W[i]; if (h < acc) { v = i; break; } }
    const r = a.rects.idle[v];
    cell.base.drawImage(a.sheet, r.x, r.y, r.w, r.h, cell.px, cell.py, r.w, r.h);
    if (a.glow) cell.glow.drawImage(a.glow, r.x, r.y, r.w, r.h, cell.px, cell.py, r.w, r.h);
  }
  shadeAndSides(cell, 0.3, 0.05, cell.mono ? '#0b0b0c' : '#07060c', cell.mono ? '#4a4a50' : '#3a3046', 'rgba(5,3,6,1)');
}

// ─────────────────────────────────────────────────────────────────────────────
// Backgrounds
// ─────────────────────────────────────────────────────────────────────────────

const emptyBand: (SkyLayer | null)[] = [null, null];
/** No clouds indoors: a clear band. */
function noClouds(mono: boolean): SkyLayer {
  const hit = emptyBand[mono ? 1 : 0];
  if (hit) return hit;
  const { canvas } = D.makeCanvas(D.STRIP_W, 1);
  const L: SkyLayer = { canvas, glow: null, drips: [], tvs: [], h: 1, f: 0, flick: [], blinks: [], neon: [] };
  emptyBand[mono ? 1 : 0] = L;
  return L;
}

/**
 * The library has no sky: its fill colour, then the deep stacks receding in
 * two tiers (the upper one dimmer, further into the dark), the atrium
 * balconies and the nearest stack ends. No stars, no moon.
 */
function librarySky(w: number, h: number, mono: boolean): Sky {
  const { canvas, ctx } = D.makeCanvas(w, h);
  const fill = col(LIBRARY_BACKDROP.fill, mono);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
  const b = LIBRARY_BACKDROP;
  const upper = stripLayer(b.far, b.palette, '', 0.07, mono, { lift: 190 });
  // a copy of its own, dimmed into the dark (the baked strip is shared)
  const dim = D.makeCanvas(D.STRIP_W, upper.h);
  dim.ctx.drawImage(upper.canvas, 0, 0);
  dim.ctx.globalCompositeOperation = 'source-atop';
  dim.ctx.globalAlpha = 0.55;
  dim.ctx.fillStyle = fill;
  dim.ctx.fillRect(0, 0, D.STRIP_W, upper.h);
  upper.canvas = dim.canvas;
  return {
    canvas, twinkles: [], clouds: noClouds(mono),
    layers: [
      upper,
      stripLayer(b.far, b.palette, b.glow, 0.12, mono, { lift: 70 }),
      stripLayer(b.mid, b.palette, b.glow, 0.3, mono, { lift: 34 }),
      stripLayer(b.near, b.palette, b.glow, 0.55, mono, { lift: 12 }),
    ],
  };
}

const discless = new Map<SkyPreset, SkyPreset>();
/** The preset without its moon (a backdrop that paints its own sky details). */
function noDisc(p: SkyPreset): SkyPreset {
  let v = discless.get(p);
  if (!v) { v = { ...p, disc: null }; discless.set(p, v); }
  return v;
}

// ─────────────────────────────────────────────────────────────────────────────
// Set dressing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A trolley shelter on the street beside each trolley lane's middle, where
 * the floor under the lane is clear: the stop she boards from.
 */
function campusDressing(level: Level): readonly Decor[] {
  const out: Decor[] = [];
  const defs = (level as unknown as { vehicles?: readonly { kind: string; row: number; x0: number; x1: number }[] }).vehicles ?? [];
  const cols = level.cols;
  const kind = (x: number, y: number) => (x < 0 || x >= cols || y < 0 || y >= D.ROWS ? 0 : D.KIND[level.tiles[y * cols + x]]);
  const floor = (x: number, y: number) => { const k = kind(x, y); return k === D.K.ROOF || k === D.K.STONE; };
  const taken = (level as unknown as { decor?: readonly Decor[] }).decor ?? [];
  for (const d of defs) {
    if (d.kind !== 'trolley') continue;
    // the street the trolley runs on: the first floor under its body
    let street = -1;
    for (let y = d.row + 2; y < D.ROWS && street < 0; y++) if (floor(Math.floor((d.x0 + d.x1) / 2), y)) street = y;
    if (street < 0) continue;
    // a clear spot on that street near the lane's start, before she meets the trolley
    for (let x = Math.max(1, d.x0 - 8); x < d.x1 - 3; x++) {
      let ok = true;
      for (let i = 0; i < 3 && ok; i++) ok = floor(x + i, street) && kind(x + i, street - 1) === 0 && kind(x + i, street - 2) === 0;
      for (let j = 0; j < taken.length && ok; j++) ok = !(Math.abs(taken[j].y - street) < 3 && taken[j].x > x - 3 && taken[j].x < x + 4);
      if (!ok) continue;
      out.push({ kind: 'trolleyStop', x, y: street });
      break;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// The themes
// ─────────────────────────────────────────────────────────────────────────────

const ENEMIES: { walker: EnemyArt; flyer: EnemyArt } = {
  walker: { set: CAMPUS_ENEMIES.scooter, glow: CAMPUS_ENEMY_GLOW, move: 'roll', dead: 'squashed', light: '#7af0e0' },
  flyer: { set: CAMPUS_ENEMIES.ticketDrone, glow: CAMPUS_ENEMY_GLOW, move: 'hover', dead: 'dead', light: SODIUM },
};

export const CAMPUS: PixelTheme = {
  id: 'campus',
  tiles: CAMPUS_TILES.tiles,
  decor: CAMPUS_TILES.decor,
  glow: CAMPUS_GLOW,
  // the plain brick wall heaviest, a lit window now and then, a dark one rarely
  fillWeights: [0.8, 0.13, 0.07],
  facade: campusFacade,
  sky: (w, h, mono, seed, o) => backdropSky(CAMPUS_BACKDROP, w, h, mono, seed, o.sky, noClouds(mono), [0.08, 0.2, 0.45],
    [{ lift: 70, blinks: 2, seed: 31 }, { lift: 50 }, { lift: 30 }]),
  weather: 'none',
  enemies: ENEMIES,
  goal: {
    // the library steps: the doors glow, two lanterns
    kind: 'goalSteps', mast: false, fps: CAMPUS_TILES.decor.goalSteps.anims.idle.fps || 4,
    lights: [
      { dx: 16, dy: -22, r: 40, color: WARM, k: 0.9, priority: 3, halo: 0.4 },
      { dx: 5, dy: -30, r: 22, color: CREAM, k: 0.8, priority: 2, halo: 0.5 },
      { dx: 26, dy: -30, r: 22, color: CREAM, k: 0.8, priority: 2, halo: 0.5 },
    ],
  },
  sign: () => CAMPUS_TILES.decor.campusSign,
  signLight: WARM,
  decorLights: {
    lampPost: { dx: 7, dy: -40, r: 38, colors: [WARM], k: 0.85, halo: 0.5, blink: 0 },
    trolleyStop: { dx: 24, dy: -27, r: 30, colors: [CREAM], k: 0.7, halo: 0.3, blink: 0 },
    stringLights: { dx: 32, dy: -4, r: 40, colors: [WARM], k: 0.6, halo: 0.3, blink: 0 },
  },
  drawsCracks: true,
  checkpoint: 'lampPost',
  dressing: campusDressing,
  layers: {
    tiles(c, f, layer) { drawPanels(c, f, layer); if (layer === 'base') drawRails(c, f, col); drawVehicles(c, f, layer, VEHICLE_ART); },
  },
};

export const LIBRARY: PixelTheme = {
  id: 'library',
  tiles: LIBRARY_TILES.tiles,
  decor: LIBRARY_TILES.decor,
  glow: LIBRARY_GLOW,
  facade: libraryFacade,
  sky: (w, h, mono) => librarySky(w, h, mono),
  // warm and quiet: dust drifting in the lamp light, no rain
  weather: 'motes',
  ambient: '#8a7e96',
  cityGlow: '#3a2418',
  enemies: ENEMIES,
  goal: {
    // the top floor window over the campus
    kind: 'goalWindow', mast: false, fps: LIBRARY_TILES.decor.goalWindow.anims.idle.fps || 4,
    lights: [
      { dx: 16, dy: -24, r: 44, color: COOL, k: 0.75, priority: 3, halo: 0.35 },
      { dx: 21, dy: -17, r: 18, color: WARM, k: 0.7, priority: 2, halo: 0.4 },
    ],
  },
  sign: () => LIBRARY_TILES.decor.quietSign,
  signLight: '#ffd59a',
  decorLights: {
    studyLamp: { dx: 7, dy: -18, r: 30, colors: ['#ffe0a8'], k: 0.85, halo: 0.45, blink: 0 },
    window: { dx: 31, dy: -19, r: 16, colors: [WARM], k: 0.5, halo: 0.3, blink: 0 },
  },
  checkpoint: 'studyLamp',
};

export const TRACKS: PixelTheme = {
  id: 'tracks',
  tiles: TRACKS_TILES.tiles,
  decor: TRACKS_TILES.decor,
  glow: TRACKS_GLOW,
  facade: tracksFacade,
  sky: (w, h, mono, seed, o) => backdropSky(TRACKS_BACKDROP, w, h, mono, seed, noDisc(o.sky), noClouds(mono), [0.07, 0.22, 0.5],
    [{ lift: 70, blinks: 3, seed: 17 }, { lift: 46 }, { lift: 26 }]),
  weather: 'rain',
  enemies: ENEMIES,
  goal: {
    // the far end of the footbridge, its rail lights chasing
    kind: 'goalBridgeEnd', mast: false, fps: TRACKS_TILES.decor.goalBridgeEnd.anims.idle.fps || 4,
    lights: [{ dx: 15, dy: -21, r: 42, color: SODIUM, k: 0.9, priority: 3, halo: 0.45 }],
  },
  sign: () => TRACKS_TILES.decor.platformSign,
  signLight: SODIUM,
  decorLights: {
    stationLamp: { dx: 9, dy: -35, r: 40, colors: [COOL], k: 0.85, halo: 0.5, blink: 0 },
    gantry: { dx: 30, dy: -29, r: 20, colors: [SIGNAL_RED], k: 0.6, halo: 0.4, blink: 0 },
    glassStairs: { dx: 14, dy: -37, r: 36, colors: [CREAM], k: 0.75, halo: 0.3, blink: 0 },
  },
  checkpoint: 'stationLamp',
  layers: {
    tiles(c, f, layer) { if (layer === 'base') drawRails(c, f, col); drawSignals(c, f, layer); drawVehicles(c, f, layer, VEHICLE_ART); },
  },
};

const CAMPUS_THEMES: Readonly<Record<'campus' | 'library' | 'tracks', PixelTheme>> = { campus: CAMPUS, library: LIBRARY, tracks: TRACKS };

/** The chapter 3 themes, given the renderer's kit (once, when the chunk loads). */
export function campusThemes(kit: ThemeKit): Readonly<Record<'campus' | 'library' | 'tracks', PixelTheme>> {
  if (!D) { D = kit; setKit(kit); }
  return CAMPUS_THEMES;
}
