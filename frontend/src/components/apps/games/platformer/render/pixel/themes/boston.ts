/**
 * Chapter 4, Boston nights: Newbury Street (4-1, night), the Charles (4-2,
 * late night fog), the Seaport (4-3, sunrise) and Revere Beach (4-4,
 * morning). One lazy chunk, loaded by ../themes.ts when the chapter card
 * shows.
 *
 * Their own layers, all read defensively from the World (missing means
 * none) and drawn without allocating:
 * - awnings that squash when she bounces (`w.bounces`), one per pair of cells;
 * - the river's water, its surface and the deep below, moving;
 * - boats on their lanes (the shared vehicle module): the rowing shell and
 *   the bobbing sailboat with their running lights;
 * - crane hooks on their ropes (`w.hooks`), the beam as wide as the sim's block;
 * - wind streaks over gust zones (`w.gusts`): sparse on the warning, dense
 *   while it blows;
 * - waves rolling up the sand (`w.waves`), and the sand sculptures the blade
 *   breaks (the level's crates), which crumble once.
 */

import type { SpriteSet } from '../../sprites';
import type { Ctx } from '../canvas';
import type { Atlas } from '../sprites';
import type { FacadeCell } from '../tiles';
import type { EnemyArt, PixelTheme, ThemeFrame, ThemeKit } from '../themes';
import type { SkyPreset } from '../timeofday';
import { backdropSky, col, setKit, wispBand } from './strips';
import { drawVehicles, type VehicleArt } from './vehicles';
import { NEWBURY_BACKDROP, NEWBURY_GLOW, NEWBURY_TILES } from '../../sprites/newbury';
import { RIVER_BACKDROP, RIVER_GLOW, RIVER_TILES, SAILBOAT, SHELL } from '../../sprites/river';
import { GUST, HARBOR_BACKDROP, HARBOR_GLOW, HARBOR_TILES, HOOK } from '../../sprites/harbor';
import { BEACH_BACKDROP, BEACH_GLOW, BEACH_TILES } from '../../sprites/beach';
import { BOSTON_ENEMIES, BOSTON_ENEMY_GLOW } from '../../sprites/bostonEnemies';

let D: ThemeKit;

const GAS = '#ffd08a', SHOP = '#ffc070', FOG_LAMP = '#ffd7a0', GOLD = '#ffcf7a', BEACON = '#ff4a5a', WHITE = '#fff6d8';

function mod(a: number, m: number) { return ((a % m) + m) % m; }

/** Frame of a play-once anim `age` seconds in, or -1 once it has finished. */
function onceFrame(anim: { frames: readonly unknown[]; fps: number }, age: number): number {
  const n = anim.frames.length, fps = anim.fps || 12;
  return age >= 0 && age < n / fps ? Math.min(n - 1, Math.floor(age * fps)) : -1;
}

/** Draw one 16 px column of a frame (a half awning, half a sculpture), anchored bottom left at (x, bottom). */
function column(c: Ctx, a: Atlas, anim: string, frame: number, half: number, x: number, bottom: number, layer: 'base' | 'glow') {
  const src = layer === 'glow' ? a.glow : a.sheet;
  if (!src) return;
  const list = a.rects[anim];
  if (!list) return;
  const r = list[((frame % list.length) + list.length) % list.length];
  c.drawImage(src, r.x + half * 16, r.y, 16, r.h, x, bottom - r.h, 16, r.h);
}

// ─────────────────────────────────────────────────────────────────────────────
// Awnings (Newbury)
// ─────────────────────────────────────────────────────────────────────────────

interface Bounce { x: number; y: number; t: number }
const NO_BOUNCES: readonly Bounce[] = [];
const AWNING = NEWBURY_TILES.awning;

/**
 * The shop awnings: the sim lists one entry per awning cell in reading
 * order. Each run of cells draws a full awning per pair and a 16 px half for
 * an odd one, squashing once when that awning bounced her (t from 0).
 */
function drawAwnings(c: Ctx, f: ThemeFrame, layer: 'base' | 'glow') {
  const list = (f.world as unknown as { bounces?: readonly Bounce[] }).bounces ?? NO_BOUNCES;
  if (!list.length) return;
  const T = D.ART_TILE;
  const a = D.atlas(AWNING, f.mono, NEWBURY_GLOW);
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const b = list[i], next = list[i + 1];
    if (next && next.y === b.y && next.x === b.x + 1) continue;
    // a run from `start` to i
    const first = list[start];
    const sq = f.reduced ? -1 : onceFrame(AWNING.anims.squash, first.t);
    const anim = sq >= 0 ? 'squash' : 'idle', frame = sq >= 0 ? sq : 0;
    const top = first.y * T - f.oy;
    if (top > -16 && top < f.bh + 16) {
      for (let k = start; k <= i; k += 2) {
        const x = list[k].x * T - f.ox;
        if (x > f.bw || x + 32 < 0) continue;
        // anchor (0, 1): the fabric's top at the cell's top
        if (k + 1 <= i) D.drawFrame(c, a, anim, frame, x, top, 1, layer);
        else column(c, a, anim, frame, 0, x, top - 1 + a.h, layer);
      }
    }
    start = i + 1;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Water (the Charles, and any water cell)
// ─────────────────────────────────────────────────────────────────────────────

const WATER = RIVER_TILES.water;

/**
 * Water cells, moving at the art's rate: at night the river's surface cell
 * (fog over a lit line) over its deep; by day (`sea`) the bright wave water
 * over a clear blue deep.
 */
function drawWater(c: Ctx, f: ThemeFrame, layer: 'base' | 'glow', sea = false) {
  const w = f.world, cols = w.level.cols, T = D.ART_TILE, WK = D.K.WATER;
  const c0 = Math.max(0, Math.floor(f.ox / T)), c1 = Math.min(cols - 1, Math.floor((f.ox + f.bw) / T));
  const r0 = Math.max(0, Math.floor(f.oy / T)), r1 = Math.min(D.ROWS - 1, Math.floor((f.oy + f.bh) / T));
  const a = D.atlas(WATER, f.mono, RIVER_GLOW);
  const frame = f.reduced ? 0 : f.t * (WATER.anims.surface.fps || 4);
  for (let ty = r0; ty <= r1; ty++) {
    for (let tx = c0; tx <= c1; tx++) {
      if (D.KIND[w.tiles[ty * cols + tx]] !== WK) continue;
      const surface = ty === 0 || D.KIND[w.tiles[(ty - 1) * cols + tx]] !== WK;
      const x = tx * T - f.ox, y = ty * T - f.oy;
      if (!sea) D.drawFrame(c, a, surface ? 'surface' : 'deep', frame, x, y, 1, layer);
      else if (surface) D.drawFrame(c, D.atlas(WAVE, f.mono, BEACH_GLOW), 'body', frame + tx, x, y + T, 1, layer);
      else if (layer === 'base') { c.fillStyle = col('#2f78ac', f.mono); c.fillRect(x, y, T, T); }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Boats
// ─────────────────────────────────────────────────────────────────────────────

const BOATS: Readonly<Record<string, VehicleArt>> = {
  shell: { set: SHELL, glow: RIVER_GLOW, rumble: 0, fps: SHELL.anims.idle.fps || 3, lights: [{ dx: 4, dy: 7, r: 14, color: WHITE, k: 0.8, halo: 0.5 }] },
  sailboat: {
    // the sim's hull reaches a tile under the deck, to the water; the art's, half that
    set: SAILBOAT, glow: RIVER_GLOW, rumble: 0, drop: 8,
    lights: [
      { dx: 26, dy: 0, r: 14, color: WHITE, k: 0.85, halo: 0.6 },
      { dx: 24, dy: 30, r: 22, color: GAS, k: 0.7, halo: 0.2 },
      { dx: 55, dy: 34, r: 14, color: '#7dffa0', k: 0.8, halo: 0.5 },
      { dx: 9, dy: 34, r: 12, color: WHITE, k: 0.7, halo: 0.4 },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Crane hooks (the Seaport)
// ─────────────────────────────────────────────────────────────────────────────

interface HookLike { x: number; y: number; px: number; py: number; w?: number }
const NO_HOOKS: readonly HookLike[] = [];

/**
 * A crane hook: the rope from the pivot to the block's top, the block,
 * hook and slings at the centre, and the spreader beam (level as it swings)
 * as wide as the sim's block: the art's 16 px beam laid across it.
 */
function drawHooks(c: Ctx, f: ThemeFrame, layer: 'base' | 'glow') {
  const list = (f.world as unknown as { hooks?: readonly HookLike[] }).hooks ?? NO_HOOKS;
  if (!list.length) return;
  const T = D.ART_TILE;
  const a = D.atlas(HOOK, f.mono, HARBOR_GLOW);
  const src = layer === 'glow' ? a.glow : a.sheet;
  const r = a.rects.idle[0];
  const ax = HOOK.anchor.x, ay = HOOK.anchor.y;
  for (let i = 0; i < list.length; i++) {
    const h = list[i];
    const px = Math.round(h.px * T) - f.ox, py = Math.round(h.py * T) - f.oy;
    const half = Math.round(((h.w ?? 2) * T) / 2);
    if (px + half < -8 || px - half > f.bw + 8) continue;
    if (layer === 'base') {
      // the rope: a dark steel line from the pivot down to the block
      const x0 = Math.round(h.x * T) - f.ox, y0 = Math.round(h.y * T) - f.oy, x1 = px, y1 = py - ay;
      const steps = Math.max(1, Math.abs(y1 - y0), Math.abs(x1 - x0));
      c.fillStyle = col('#2a2630', f.mono);
      for (let s = 0; s <= steps; s++) c.fillRect(Math.round(x0 + ((x1 - x0) * s) / steps), Math.round(y0 + ((y1 - y0) * s) / steps), 1, 1);
    }
    if (!src) continue;
    // the beam across the block's width, in 16 px pieces
    for (let bx = px - half; bx < px + half; bx += 16) {
      const wpx = Math.min(16, px + half - bx);
      c.drawImage(src, r.x, r.y + ay, wpx, r.h - ay, bx, py, wpx, r.h - ay);
    }
    // the block, hook and slings over it
    c.drawImage(src, r.x, r.y, r.w, ay, px - ax, py - ay, r.w, ay);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Wind and waves
// ─────────────────────────────────────────────────────────────────────────────

interface GustLike { x0: number; x1: number; dir: number; warn: boolean; on: boolean }
const NO_GUSTS: readonly GustLike[] = [];
const STREAKS = 16;

/** Wind streaks over a gust zone on screen: a few on the warning, many while it blows. */
function drawGusts(c: Ctx, f: ThemeFrame) {
  const list = (f.world as unknown as { gusts?: readonly GustLike[] }).gusts ?? NO_GUSTS;
  if (!list.length) return;
  const T = D.ART_TILE;
  const a = D.atlas(GUST, f.mono, '');
  const t = f.reduced ? 0 : f.t;
  for (let i = 0; i < list.length; i++) {
    const g = list[i];
    if (!g.warn && !g.on) continue;
    const left = g.x0 * T - f.ox, W = (g.x1 + 1 - g.x0) * T;
    if (left > f.bw || left + W < 0) continue;
    const n = g.on ? STREAKS : 5;
    c.globalAlpha = g.on ? 0.85 : 0.45;
    for (let j = 0; j < n; j++) {
      const speed = (g.on ? 220 : 90) * (0.7 + D.hash2(i * 31 + j, 3) * 0.6);
      const x = left + mod(D.hash2(i * 17 + j, 1) * W + g.dir * t * speed, W);
      const y = Math.round(f.bh * (0.08 + D.hash2(i * 13 + j, 2) * 0.84));
      if (x < -16 || x > f.bw + 16) continue;
      D.drawFrame(c, a, 'idle', g.on ? t * 10 + j : 0, Math.round(x), y, g.dir < 0 ? -1 : 1);
    }
  }
  c.globalAlpha = 1;
}

interface WaveLike { x0: number; x1: number; row: number; dir: number; front: number; on: boolean }
const NO_WAVES: readonly WaveLike[] = [];
const WAVE = BEACH_TILES.wave;

/** The water rolled up the sand: body cells from the sea edge to the front, the foaming front cell at `front`. */
function drawWaves(c: Ctx, f: ThemeFrame) {
  const list = (f.world as unknown as { waves?: readonly WaveLike[] }).waves ?? NO_WAVES;
  if (!list.length) return;
  const T = D.ART_TILE;
  const a = D.atlas(WAVE, f.mono, BEACH_GLOW);
  const frame = f.reduced ? 0 : f.t * (WAVE.anims.body.fps || 8);
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    const bottom = v.row * T - f.oy;
    if (bottom < -4 || bottom > f.bh + 16) continue;
    const front = Math.round(v.front);
    const from = v.dir < 0 ? front : v.x0, to = v.dir < 0 ? v.x1 : front;
    for (let tx = from; tx <= to; tx++) {
      const x = tx * T - f.ox;
      if (x > f.bw || x + 16 < 0) continue;
      if (tx === front) D.drawFrame(c, a, 'front', frame, v.dir < 0 ? x + 16 : x, bottom, v.dir < 0 ? -1 : 1);
      else D.drawFrame(c, a, 'body', frame + tx, x, bottom, 1);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sand sculptures (the beach's crates)
// ─────────────────────────────────────────────────────────────────────────────

const SCULPT = BEACH_TILES.sandSculpture;
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

/**
 * The crates as sand sculptures: two cells side by side make one sculpture
 * (left and right halves), a lone cell shows its left half. A cell the blade
 * broke crumbles its half once, then is gone.
 */
function drawSculptures(c: Ctx, f: ThemeFrame, layer: 'base' | 'glow') {
  if (layer !== 'base') return;
  const w = f.world, level = w.level, cols = level.cols, T = D.ART_TILE, CR = D.K.CRATE;
  if (brokenLevel !== level) { brokenLevel = level; for (const b of broken) { b.x = -1; b.y = -1; } }
  const a = D.atlas(SCULPT, f.mono, BEACH_GLOW);
  const c0 = Math.max(0, Math.floor(f.ox / T) - 1), c1 = Math.min(cols - 1, Math.floor((f.ox + f.bw) / T) + 1);
  for (let ty = 0; ty < D.ROWS; ty++) {
    for (let tx = c0; tx <= c1; tx++) {
      if (D.KIND[level.tiles[ty * cols + tx]] !== CR) continue;
      let start = tx;
      while (start > 0 && D.KIND[level.tiles[ty * cols + start - 1]] === CR) start--;
      const half = (tx - start) % 2;
      const x = tx * T - f.ox, bottom = (ty + 1) * T - f.oy;
      if (D.KIND[w.tiles[ty * cols + tx]] === CR) column(c, a, 'idle', 0, half, x, bottom, 'base');
      else {
        const fr = onceFrame(SCULPT.anims.crumble, f.t - brokeAt(tx, ty, f.t));
        if (fr >= 0) column(c, a, 'crumble', fr, half, x, bottom, 'base');
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Facades and the themes
// ─────────────────────────────────────────────────────────────────────────────

function facadeOf(max: number, per: number, dark: string, shade: string, rim: string) {
  return (cell: FacadeCell) => {
    const { base: b, px, py, depth } = cell;
    if (depth > 0) {
      b.fillStyle = dark;
      b.globalAlpha = Math.min(max, per * depth);
      b.fillRect(px, py, 16, 16);
      b.globalAlpha = 1;
    }
    if (cell.openL) { b.fillStyle = cell.mono ? '#0b0b0c' : shade; b.fillRect(px, py + 1, 1, 15); b.fillStyle = cell.mono ? '#4a4a50' : rim; b.fillRect(px + 1, py + 2, 1, 14); }
    if (cell.openR) { b.fillStyle = cell.mono ? '#0b0b0c' : shade; b.fillRect(px + 15, py + 1, 1, 15); }
  };
}

const ENEMIES: { walker: EnemyArt; flyer: EnemyArt } = {
  // the pigeon hops once per sim hop (every 1.2 s) and stands between hops
  walker: { set: BOSTON_ENEMIES.pigeon, glow: BOSTON_ENEMY_GLOW, move: 'hop', dead: 'squashed', light: '#ffa04a', hop: { every: 1.2, fps: BOSTON_ENEMIES.pigeon.anims.hop.fps || 8, frames: BOSTON_ENEMIES.pigeon.anims.hop.frames.length } },
  flyer: { set: BOSTON_ENEMIES.gull, glow: BOSTON_ENEMY_GLOW, move: 'hover', dive: 'swoop', dead: 'dead', light: '#fff6c8' },
};

const discless = new Map<SkyPreset, SkyPreset>();
/** The preset without its sun or moon (the backdrop paints its own). */
function noDisc(p: SkyPreset): SkyPreset {
  let v = discless.get(p);
  if (!v) { v = { ...p, disc: null }; discless.set(p, v); }
  return v;
}

/** No sign art in this chapter: the rooftops' slang neon, in the boutique windows. */
const neonSign = (seed: number, level: number, i: number): SpriteSet<'idle'> => D.neonSign(seed, level, i);

const goalFps = (s: SpriteSet<'idle'>) => s.anims.idle.fps || 4;

export const NEWBURY: PixelTheme = {
  id: 'newbury',
  tiles: NEWBURY_TILES.tiles,
  decor: NEWBURY_TILES.decor,
  glow: NEWBURY_GLOW,
  fillWeights: [0.78, 0.14, 0.08],
  facade: facadeOf(0.5, 0.1, 'rgba(6,3,6,1)', '#0a0508', '#4a3028'),
  sky: (w, h, mono, seed, o) => backdropSky(NEWBURY_BACKDROP, w, h, mono, seed, o.sky, wispBand(51 + seed * 17, mono, '#5a3a4a', '#1e1a34'), [0.07, 0.2, 0.5],
    [{ lift: 70, blinks: 2, seed: 41 }, { lift: 48 }, { lift: 26 }]),
  weather: 'none',
  enemies: ENEMIES,
  goal: {
    // the end of the street at the garden's edge: the double lantern post
    kind: 'goalLamp', mast: false, fps: goalFps(NEWBURY_TILES.decor.goalLamp),
    lights: [
      { dx: 15, dy: -38, r: 40, color: GAS, k: 0.95, priority: 3, halo: 0.55 },
      { dx: 27, dy: -38, r: 40, color: GAS, k: 0.95, priority: 3, halo: 0.55 },
    ],
  },
  sign: neonSign,
  signLight: '#ff6ab8',
  decorLights: {
    gasLamp: { dx: 8, dy: -39, r: 42, colors: [GAS], k: 0.9, halo: 0.55, blink: 0 },
    shopWindow: { dx: 24, dy: -16, r: 44, colors: [SHOP], k: 0.75, halo: 0.25, blink: 0 },
  },
  checkpoint: 'gasLamp',
  layers: { tiles: drawAwnings },
};

export const RIVER: PixelTheme = {
  id: 'river',
  tiles: RIVER_TILES.tiles,
  decor: RIVER_TILES.decor,
  glow: RIVER_GLOW,
  fillWeights: [0.8, 0.12, 0.08],
  facade: facadeOf(0.5, 0.1, 'rgba(3,4,10,1)', '#06080e', '#3a4256'),
  sky: (w, h, mono, seed, o) => backdropSky(RIVER_BACKDROP, w, h, mono, seed, o.sky, wispBand(61 + seed * 17, mono, '#6a6a8a', '#2a2a44'), [0.06, 0.18, 0.42],
    [{ lift: 64 }, { lift: 40 }, { lift: 14 }]),
  weather: 'none',
  enemies: ENEMIES,
  goal: {
    // the Hatch Shell, the goal at its centre stage
    kind: 'hatchShell', mast: false, dx: -24, fps: goalFps(RIVER_TILES.decor.hatchShell),
    lights: [
      { dx: 32, dy: -16, r: 54, color: '#ffb347', k: 0.95, priority: 3, halo: 0.45 },
      { dx: 32, dy: -9, r: 40, color: GAS, k: 0.7, priority: 2, halo: 0.3 },
    ],
  },
  sign: neonSign,
  signLight: '#3df2ff',
  decorLights: {
    // the bridge lamps: wide and soft in the fog
    bridgeLamp: { dx: 8, dy: -42, r: 64, colors: [FOG_LAMP], k: 0.8, halo: 0.6, blink: 0 },
  },
  checkpoint: 'bridgeLamp',
  layers: {
    tiles(c, f, layer) { drawWater(c, f, layer); drawAwnings(c, f, layer); drawVehicles(c, f, layer, BOATS); },
  },
};

export const HARBOR: PixelTheme = {
  id: 'harbor',
  tiles: HARBOR_TILES.tiles,
  decor: HARBOR_TILES.decor,
  glow: HARBOR_GLOW,
  fillWeights: [0.8, 0.12, 0.08],
  facade: facadeOf(0.4, 0.08, 'rgba(20,10,30,1)', '#1a1020', '#c08a5a'),
  sky: (w, h, mono, seed, o) => backdropSky(HARBOR_BACKDROP, w, h, mono, seed, o.sky, wispBand(71 + seed * 17, mono, '#ffcf9a', '#a07090'), [0.06, 0.2, 0.45],
    [{ lift: 64, blinks: 2, seed: 7 }, { lift: 44, blinks: 4, seed: 8 }, { lift: 16 }]),
  weather: 'none',
  enemies: ENEMIES,
  goal: {
    // the museum's overhang: the goal at its right edge, under the glass
    kind: 'museumOverhang', mast: false, dx: -48, fps: goalFps(HARBOR_TILES.decor.museumOverhang),
    lights: [{ dx: 5, dy: -7, r: 30, color: GOLD, k: 0.8, priority: 3, halo: 0.4 }],
  },
  sign: neonSign,
  signLight: GOLD,
  decorLights: {
    craneLeg: { dx: 16, dy: -46, r: 18, colors: [BEACON], k: 0.8, halo: 0.6, blink: 0.7 },
  },
  checkpoint: 'craneLeg',
  layers: {
    tiles(c, f, layer) { drawWater(c, f, layer); drawAwnings(c, f, layer); drawHooks(c, f, layer); drawVehicles(c, f, layer, BOATS); },
    front: drawGusts,
  },
};

export const BEACH: PixelTheme = {
  id: 'beach',
  tiles: BEACH_TILES.tiles,
  decor: BEACH_TILES.decor,
  glow: BEACH_GLOW,
  fillWeights: [0.8, 0.12, 0.08],
  facade: facadeOf(0.35, 0.07, 'rgba(60,40,30,1)', '#6a4a30', '#fff0c8'),
  // the far strip carries its own sun
  sky: (w, h, mono, seed, o) => backdropSky(BEACH_BACKDROP, w, h, mono, seed, noDisc(o.sky), wispBand(81 + seed * 17, mono, '#ffffff', '#dfe8f4'), [0.05, 0.16, 0.4],
    [{ lift: 60 }, { lift: 36 }, { lift: 10 }]),
  weather: 'none',
  enemies: ENEMIES,
  goal: {
    // the old bandstand: the goal on its roof, its granite floor carried down to the sand
    kind: 'bandstand', mast: false, dx: -24, lift: 32, liftRow: 24, fps: goalFps(BEACH_TILES.decor.bandstand),
    lights: [{ dx: 32, dy: -24, r: 30, color: WHITE, k: 0.5, priority: 2, halo: 0.2 }],
  },
  sign: neonSign,
  signLight: '#ff6ab8',
  decorLights: {
    boulevardLamp: { dx: 8, dy: -43, r: 26, colors: [WHITE], k: 0.4, halo: 0.3, blink: 0 },
  },
  drawsCrates: true,
  checkpoint: 'boulevardLamp',
  layers: {
    tiles(c, f, layer) { drawWater(c, f, layer, true); drawAwnings(c, f, layer); drawSculptures(c, f, layer); },
    front(c, f) { drawWaves(c, f); drawGusts(c, f); },
  },
};

const BOSTON_THEMES: Readonly<Record<'newbury' | 'river' | 'harbor' | 'beach', PixelTheme>> = { newbury: NEWBURY, river: RIVER, harbor: HARBOR, beach: BEACH };

/** The chapter 4 themes, given the renderer's kit (once, when the chunk loads). */
export function bostonThemes(kit: ThemeKit): Readonly<Record<'newbury' | 'river' | 'harbor' | 'beach', PixelTheme>> {
  if (!D) {
    D = kit; setKit(kit);
    // the borrowed neon sign glows with its own keys
    for (const t of [NEWBURY, RIVER, HARBOR, BEACH]) t.signGlow = kit.neonGlow;
  }
  return BOSTON_THEMES;
}
