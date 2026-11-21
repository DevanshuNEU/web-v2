/**
 * Chapter 2, the trip: the airport (2-1, Departures) and the clouds (2-2,
 * Red-Eye). One lazy chunk, loaded by ../themes.ts when the chapter card
 * shows. Everything here is data for the PixelTheme seam plus the theme's
 * own layers: animated walkways, rain on the terminal glass, thin clouds
 * that puff away, drifting wisps in front, the far plane layer, and the
 * descent onto the city at night.
 *
 * Per-frame layers are stateless functions of time and the camera, over
 * fixed tables made once, so they allocate nothing.
 */

import type { SpriteSet } from '../../sprites';
import type { Level } from '../../../sim/level';
import type { Decor } from '../read';
import type { Canvas, Ctx } from '../canvas';
import type { FacadeCell } from '../tiles';
import type { PixelTheme, ThemeFrame, TripKit } from '../themes';
import { backdropSky, clamp01, col, glowOnly, lightCol, mod, setKit, wispBand } from './strips';
import type { SkyPreset } from '../timeofday';
import {
  AIRPORT_BACKDROP, AIRPORT_GLOW, AIRPORT_TILES, BOSTON_NIGHT, CLOUD_BACKDROP, CLOUD_GLOW, CLOUD_TILES, LANDING_LIGHT, PLANES, PLANES_GLOW,
  TRIP_ENEMIES, TRIP_ENEMY_GLOW,
} from './tripArt';

/**
 * What this chunk borrows from the renderer, handed in by ../themes.ts when
 * it loads. Taking it as a value (no runtime imports back into the main
 * bundle) keeps the platformer's own chunk one concatenated module.
 */
let D: TripKit;

const FLUORESCENT = '#bfe6ff', AMBER = '#ffb347', BLUE = '#7ad0ff', MOON = '#cfd8ff', NAV_RED = '#ff4a5a', NAV_GREEN = '#7dffa0', WHITE = '#fff6d8';

// ─────────────────────────────────────────────────────────────────────────────
// The far plane layer: a few planes on fixed paths, more over a 'planes' stretch
// ─────────────────────────────────────────────────────────────────────────────

type PlaneKind = 'approach' | 'depart' | 'taxi';
interface PlanePath { kind: PlaneKind; period: number; phase: number; y0: number; y1: number; dir: 1 | -1; busy: boolean }
/** y0, y1: fractions of the buffer height at the start and end of the path. */
const PATHS: readonly PlanePath[] = [
  { kind: 'approach', period: 26, phase: 0.1, y0: 0.16, y1: 0.42, dir: 1, busy: false },
  { kind: 'depart', period: 31, phase: 0.6, y0: 0.4, y1: 0.12, dir: -1, busy: false },
  { kind: 'approach', period: 22, phase: 0.45, y0: 0.1, y1: 0.36, dir: 1, busy: true },
  { kind: 'approach', period: 19, phase: 0.8, y0: 0.22, y1: 0.46, dir: 1, busy: true },
  { kind: 'depart', period: 24, phase: 0.3, y0: 0.44, y1: 0.2, dir: -1, busy: true },
];

function inSetPiece(f: ThemeFrame, kind: string, out: { k: number }): boolean {
  const list = (f.world.level as unknown as { setPieces?: readonly { kind: string; x0: number; x1: number }[] }).setPieces;
  out.k = 0;
  if (!Array.isArray(list)) return false;
  const hx = (f.heroX + f.ox) / D.ART_TILE;
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (p.kind !== kind) continue;
    if (hx < p.x0 - 6 || hx > p.x1 + 6) continue;
    out.k = clamp01((hx - p.x0) / Math.max(1, p.x1 - p.x0));
    return true;
  }
  return false;
}
const PIECE = { k: 0 };

/** Planes in the far sky: the body in the back pass, nav and landing lights in the glow pass. */
function drawPlanes(c: Ctx, f: ThemeFrame, layer: 'base' | 'glow') {
  const busy = inSetPiece(f, 'planes', PIECE);
  const a = D.atlas(PLANES, f.mono, PLANES_GLOW);
  const t = f.reduced ? f.t * 0.5 : f.t;
  const span = f.bw + 60;
  const drift = f.rx * 0.03;
  for (let i = 0; i < PATHS.length; i++) {
    const p = PATHS[i];
    if (p.busy && !busy) continue;
    const u = mod(t / p.period + p.phase, 1);
    const x = Math.round(mod((p.dir > 0 ? u : 1 - u) * span - drift, span) - 30);
    const y = Math.round(f.bh * (p.y0 + (p.y1 - p.y0) * u));
    D.drawFrame(c, a, p.kind, t * 2 + i, x, y, p.dir, layer);
    if (layer === 'glow' && p.kind === 'approach') {
      // the landing light: a bright dot at the nose and its halo
      const nx = x + p.dir * 10;
      D.drawFrame(c, D.atlas(LANDING_LIGHT, f.mono), 'idle', 0, nx, y + 1, 1);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.5;
      c.drawImage(D.lightSprite(lightCol(WHITE, f.mono)), nx - 7, y - 6, 14, 14);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Airport layers
// ─────────────────────────────────────────────────────────────────────────────

/** Raindrops sliding down the terminal glass (a 512 wide tile, parallax of the window wall). */
let DROPS: readonly { x: number; phase: number; speed: number; len: number }[] = [];
const makeDrops = () => {
  const r = D.rng(77);
  return Array.from({ length: 56 }, () => ({ x: Math.floor(r() * D.STRIP_W), phase: r(), speed: 8 + r() * 14, len: 3 + Math.floor(r() * 5) }));
};

function windowRain(c: Ctx, f: ThemeFrame) {
  const t = f.reduced ? 0 : f.t;
  const H = f.bh + 12;
  const shift = mod(f.rx * 0.6, D.STRIP_W);
  c.fillStyle = col('#9fb4e8', f.mono);
  for (let i = 0; i < DROPS.length; i++) {
    const d = DROPS[i];
    const y = Math.round(mod(t * d.speed + d.phase * H, H)) - 6;
    c.globalAlpha = 0.16 + (i % 3) * 0.05;
    for (let x = d.x - shift; x < f.bw; x += D.STRIP_W) {
      if (x < -1) continue;
      c.fillRect(x, y, 1, d.len);
      c.fillRect(x, y + d.len, 1, 1);
    }
  }
  c.globalAlpha = 1;
}

function drawWalkways(c: Ctx, f: ThemeFrame, layer: 'base' | 'glow') {
  const w = f.world, cols = w.level.cols;
  const c0 = Math.max(0, Math.floor(f.ox / D.ART_TILE)), c1 = Math.min(cols - 1, Math.floor((f.ox + f.bw) / D.ART_TILE));
  const r0 = Math.max(0, Math.floor(f.oy / D.ART_TILE)), r1 = Math.min(D.ROWS - 1, Math.floor((f.oy + f.bh) / D.ART_TILE));
  const a = D.atlas(AIRPORT_TILES.walkway, f.mono, AIRPORT_GLOW);
  // the belt runs at the walkway's speed: its treads move with world time
  const fps = AIRPORT_TILES.walkway.anims.right.fps || 8;
  const frame = f.reduced ? 0 : f.t * fps;
  for (let ty = r0; ty <= r1; ty++) {
    for (let tx = c0; tx <= c1; tx++) {
      const code = w.tiles[ty * cols + tx];
      if (D.KIND[code] !== D.K.WALK) continue;
      D.drawFrame(c, a, D.WALK_DIR[code] < 0 ? 'left' : 'right', frame, tx * D.ART_TILE - f.ox, ty * D.ART_TILE - f.oy, 1, layer);
    }
  }
}

/** The terminal under its floor: polished terrazzo that mirrors the lights, dark structure, service panels. */
function airportFacade(cell: FacadeCell) {
  const { base: b, glow: g, mono, tx, ty, px, py, depth } = cell;
  if (depth === 0) {
    // the floor's shine: a strip the renderer lights with the nearest light
    if (D.hash2(tx * 11, 91) < 0.55) {
      const w = 8 + Math.floor(D.hash2(tx, 92) * 9), x = px + Math.floor(D.hash2(tx, 93) * (17 - w));
      cell.puddles.push(x, py + 3, w);
    }
  } else {
    if (depth === 1 && cell.below && D.hash2(tx * 19, ty + 401) < 0.08) {
      // a service panel with a status light
      b.fillStyle = col('#0c0e18', mono); b.fillRect(px + 3, py + 4, 10, 9);
      b.fillStyle = col('#33395a', mono); b.fillRect(px + 4, py + 5, 8, 7);
      g.fillStyle = col(D.hash2(tx, 5) < 0.5 ? BLUE : AMBER, mono); g.fillRect(px + 10, py + 6, 1, 1);
      b.fillStyle = g.fillStyle; b.fillRect(px + 10, py + 6, 1, 1);
    }
    b.fillStyle = 'rgba(2,3,10,1)';
    b.globalAlpha = Math.min(0.55, 0.11 * depth);
    b.fillRect(px, py, 16, 16);
    b.globalAlpha = 1;
  }
  const shade = mono ? '#0b0b0c' : '#080a14', rim = mono ? '#4a4a50' : '#3a4266';
  if (cell.openL) { b.fillStyle = shade; b.fillRect(px, py + 1, 1, 15); b.fillStyle = rim; b.fillRect(px + 1, py + 2, 1, 14); }
  if (cell.openR) { b.fillStyle = shade; b.fillRect(px + 15, py + 1, 1, 15); }
}

/**
 * Set dressing: a baggage carousel in the middle of an indoor hall (a clear
 * floor at least 8 tiles long under a ceiling), clear of other decor, at
 * most one every 60 columns.
 */
function airportDressing(level: Level): readonly Decor[] {
  const out: Decor[] = [];
  const cols = level.cols;
  const kind = (x: number, y: number) => (x < 0 || x >= cols || y < 0 || y >= D.ROWS ? D.K.EMPTY : D.KIND[level.tiles[y * cols + x]]);
  const floor = (x: number, y: number) => { const k = kind(x, y); return k === D.K.ROOF || k === D.K.STONE; };
  const taken = (level as unknown as { decor?: readonly Decor[] }).decor ?? [];
  /** A clear floor tile at (x, y) under a ceiling within 9 rows. */
  const hall = (x: number, y: number) => {
    if (!floor(x, y) || kind(x, y - 1) !== D.K.EMPTY || kind(x, y - 2) !== D.K.EMPTY) return false;
    for (let yy = y - 3; yy >= Math.max(0, y - 9); yy--) if (floor(x, yy)) return true;
    return false;
  };
  let last = -999;
  for (let y = 4; y < D.ROWS; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (!hall(x, y)) continue;
      let end = x;
      while (end + 1 < cols && hall(end + 1, y)) end++;
      const len = end - x + 1;
      // the middle of a hall at least 8 tiles long
      const at = x + Math.floor((len - 4) / 2);
      let ok = len >= 8 && at - last >= 60;
      for (let j = 0; j < taken.length && ok; j++) ok = !(Math.abs(taken[j].y - y) < 3 && taken[j].x > at - 3 && taken[j].x < at + 5);
      if (ok) { out.push({ kind: 'carousel', x: at, y }); last = at; }
      x = end;
    }
  }
  return out;
}

const GATE_SIGN = AIRPORT_TILES.decor.gateSign;

export const AIRPORT: PixelTheme = {
  id: 'airport',
  tiles: AIRPORT_TILES.tiles,
  decor: AIRPORT_TILES.decor,
  glow: AIRPORT_GLOW,
  facade: airportFacade,
  // no moon over the airfield: the terminal glow and the runway lights carry the night
  sky: (w, h, mono, seed, o) => backdropSky(AIRPORT_BACKDROP, w, h, mono, seed, noDisc(o.sky), wispBand(31 + seed * 17, mono, '#5a3a4a', '#1e1a34'), [0.08, 0.22, 0.55],
    [{ blinks: 3, seed: 3, lift: 70 }, { blinks: 2, seed: 4, lift: 56 }, { lift: 40 }]),
  weather: 'none',
  enemies: {
    walker: { set: TRIP_ENEMIES.suitcase, glow: TRIP_ENEMY_GLOW, move: 'roll', dead: 'squashed', light: AMBER },
    flyer: { set: TRIP_ENEMIES.paDrone, glow: TRIP_ENEMY_GLOW, move: 'hover', dead: 'dead', light: BLUE },
  },
  goal: {
    // the jet bridge door, its board settling on BOARDING as she comes near
    kind: 'gateDoor', mast: false, fps: 0,
    lights: [
      { dx: 16, dy: -42, r: 34, color: AMBER, k: 0.85, priority: 3, halo: 0.5 },
      { dx: 16, dy: -16, r: 30, color: FLUORESCENT, k: 0.7, priority: 2, halo: 0.2 },
    ],
  },
  sign: () => GATE_SIGN,
  signLight: AMBER,
  decorLights: {
    departureBoard: { dx: 16, dy: -34, r: 30, colors: [AMBER], k: 0.6, halo: 0.25, blink: 0 },
    kiosk: { dx: 8, dy: -22, r: 16, colors: [BLUE], k: 0.7, halo: 0.35, blink: 0 },
  },
  checkpoint: 'kiosk',
  dressing: airportDressing,
  layers: {
    back(c, f) { windowRain(c, f); drawPlanes(c, f, 'base'); },
    backGlow(c, f) { drawPlanes(c, f, 'glow'); },
    tiles: drawWalkways,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Clouds layers
// ─────────────────────────────────────────────────────────────────────────────

interface PuffLike { x: number; y: number; t: number; solid: boolean }
const NO_PUFFS: readonly PuffLike[] = [];
/** Seconds a gone puff stays away (the sim's PUFF.gone), and how long its burst plays. */
const PUFF_GONE = 3;
const GONE = CLOUD_TILES.puff.anims.gone;
const BURST = GONE.frames.length / (GONE.fps || 10);

function drawPuffs(c: Ctx, f: ThemeFrame, layer: 'base' | 'glow') {
  if (layer !== 'base') return;
  const list = (f.world as unknown as { puffs?: readonly PuffLike[] }).puffs ?? NO_PUFFS;
  if (!list.length) return;
  const a = D.atlas(CLOUD_TILES.puff, f.mono, CLOUD_GLOW);
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    const x = p.x * D.ART_TILE - f.ox, y = p.y * D.ART_TILE - f.oy;
    if (x < -16 || x > f.bw || y < -16 || y > f.bh) continue;
    if (p.solid) {
      // stood on: it wobbles until it goes
      if (p.t > 0) D.drawFrame(c, a, 'wobble', f.reduced ? 0 : p.t * (CLOUD_TILES.puff.anims.wobble.fps || 12), x, y, 1);
      else D.drawFrame(c, a, 'solid', 0, x, y, 1);
    } else if (p.t < BURST) {
      D.drawFrame(c, a, 'gone', Math.min(GONE.frames.length - 1, p.t * (GONE.fps || 10)), x, y, 1);
    } else if (p.t > PUFF_GONE - 0.6) {
      // about to come back: a faint outline gathering
      c.globalAlpha = 0.25 + 0.4 * clamp01((p.t - (PUFF_GONE - 0.6)) / 0.6);
      D.drawFrame(c, a, 'solid', 0, x, y, 1);
      c.globalAlpha = 1;
    }
  }
}

/** Soft wisps drifting past in front, a little faster than the world: one table, three baked shapes. */
let WISPS: readonly { x: number; y: number; speed: number; shape: number; alpha: number; par: number }[] = [];
const makeWisps = () => {
  const r = D.rng(91);
  return Array.from({ length: 6 }, (_, i) => ({ x: r() * 900, y: 0.2 + r() * 0.7, speed: 4 + r() * 8, shape: i % 3, alpha: 0.07 + r() * 0.08, par: 1.15 + r() * 0.3 }));
};
const wispArt: (Canvas | null)[] = [null, null, null, null, null, null];

function wispCanvas(shape: number, mono: boolean): Canvas {
  const key = shape * 2 + (mono ? 1 : 0);
  const hit = wispArt[key];
  if (hit) return hit;
  const w = 70 + shape * 30, h = 12 + shape * 3;
  const { canvas, ctx } = D.makeCanvas(w, h);
  const r = D.rng(200 + shape);
  for (let j = 0; j < h; j++) {
    const k = 1 - Math.abs(j - h * 0.45) / (h * 0.55);
    if (k <= 0) continue;
    const len = Math.round(w * k * (0.75 + r() * 0.25)), x = Math.round((w - len) / 2 + (r() - 0.5) * 6);
    ctx.fillStyle = col(j < h * 0.35 ? '#e8ecff' : '#aab4dc', mono);
    ctx.globalAlpha = 0.5 + 0.5 * k;
    ctx.fillRect(x, j, len, 1);
  }
  wispArt[key] = canvas;
  return canvas;
}

function drawWisps(c: Ctx, f: ThemeFrame) {
  // the clouds part for the descent
  const part = inSetPiece(f, 'descent', PIECE) ? 1 - clamp01(PIECE.k * 2) : 1;
  if (part <= 0) return;
  const t = f.reduced ? 0 : f.t;
  const span = f.bw + 240;
  for (let i = 0; i < WISPS.length; i++) {
    const p = WISPS[i];
    const img = wispCanvas(p.shape, f.mono);
    const x = Math.round(mod(p.x - t * p.speed - f.rx * p.par, span)) - 120;
    const y = Math.round(f.bh * p.y - (f.ry * 0.1) % 40);
    c.globalAlpha = p.alpha * part;
    c.drawImage(img, x, y);
  }
  c.globalAlpha = 1;
}

/**
 * The descent: the city at night rises out from under the cloud floor as she
 * runs down the last slope. The harbor's far shore settles at the floor of
 * the goal (the runway threshold), the skyline standing on it.
 */
function drawCity(c: Ctx, f: ThemeFrame, layer: 'base' | 'glow') {
  if (!inSetPiece(f, 'descent', PIECE)) return;
  const k = clamp01(PIECE.k * 1.6);
  if (k <= 0) return;
  const pal = BOSTON_NIGHT.palette;
  const far = D.bakeGrid(BOSTON_NIGHT.far, layer === 'base' ? pal : glowOnly(pal, BOSTON_NIGHT.glow), { mono: f.mono }) as Canvas;
  const near = D.bakeGrid(BOSTON_NIGHT.near, layer === 'base' ? pal : glowOnly(pal, BOSTON_NIGHT.glow), { mono: f.mono }) as Canvas;
  const fh = BOSTON_NIGHT.far.length, nh = BOSTON_NIGHT.near.length;
  const g = (f.world.level as { goal?: { base: number } }).goal;
  const ground = Math.min(f.bh, g ? (g.base + 1) * D.ART_TILE - f.oy : f.bh);
  // it rises the last stretch into place
  const ny = Math.round(ground - nh + (1 - k) * (fh + nh) * 0.6), fy = ny - fh;
  c.globalAlpha = (layer === 'base' ? 1 : 0.9) * k;
  for (let x = -mod(Math.floor(f.rx * 0.08), D.STRIP_W); x < f.bw; x += D.STRIP_W) c.drawImage(far, x, fy);
  for (let x = -mod(Math.floor(f.rx * 0.16), D.STRIP_W); x < f.bw; x += D.STRIP_W) c.drawImage(near, x, ny);
  c.globalAlpha = 1;
  if (layer !== 'glow') return;
  // the harbor: lights glinting in the water
  const t = f.reduced ? 0 : f.t;
  c.fillStyle = col('#ffe9c9', f.mono);
  const wy = ny + Math.round(nh * 0.7);
  for (let i = 0; i < 28; i++) {
    const gl = D.hash2(Math.floor(t * 3 + i * 0.37), i);
    if (gl < 0.6) continue;
    c.globalAlpha = (gl - 0.6) * 2 * k;
    c.fillRect(Math.floor(D.hash2(i, 9) * f.bw), wy + Math.floor(D.hash2(i, 10) * (nh * 0.3)), gl > 0.9 ? 2 : 1, 1);
  }
  c.globalAlpha = 1;
}

/**
 * The city's glow from below in the descent: a warm haze behind the
 * skyline, and the cloud floor lit amber from under (level lights, so the
 * playfield takes the colour too).
 */
function cityGlow(c: Ctx, f: ThemeFrame) {
  if (!inSetPiece(f, 'descent', PIECE)) return;
  const k = clamp01(PIECE.k * 1.6);
  if (k <= 0) return;
  const g = (f.world.level as { goal?: { base: number } }).goal;
  const ground = Math.min(f.bh, g ? (g.base + 1) * D.ART_TILE - f.oy : f.bh);
  const haze = hazeCanvas(f.mono);
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = 0.55 * k;
  c.drawImage(haze, 0, ground - 150, f.bw, 170);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
  for (let x = 40; x < f.bw + 80; x += 120) f.light(x - mod(f.rx * 0.3, 120), ground + 10, 110, '#ffb070', 0.45 * k, 0);
}

const hazeArt: (Canvas | null)[] = [null, null];
/** A vertical warm gradient, clear at the top: sodium light rising off the city. */
function hazeCanvas(mono: boolean): Canvas {
  const hit = hazeArt[mono ? 1 : 0];
  if (hit) return hit;
  const { canvas, ctx } = D.makeCanvas(4, 64);
  for (let y = 0; y < 64; y++) {
    ctx.globalAlpha = Math.pow(y / 63, 2) * 0.8;
    ctx.fillStyle = col(y > 48 ? '#ff9a5a' : '#c0607a', mono);
    ctx.fillRect(0, y, 4, 1);
  }
  hazeArt[mono ? 1 : 0] = canvas;
  return canvas;
}

/** The approach lights on the cloud floor: steady dots and a strobe running in to the threshold. */
function approachLights(c: Ctx, f: ThemeFrame) {
  if (!inSetPiece(f, 'descent', PIECE)) return;
  const k = clamp01(PIECE.k * 1.6);
  const g = (f.world.level as { goal?: { x: number; base: number } }).goal;
  if (k <= 0 || !g) return;
  const n = 14;
  const t = f.reduced ? 0 : f.t;
  const lit = Math.floor(t * 16) % (n + 6);
  const y = (g.base + 1) * D.ART_TILE - f.oy - 2;
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = (g.x - n + i) * D.ART_TILE + 6 - f.ox;
    if (x < -8 || x > f.bw + 8) continue;
    const on = i === lit || i === lit - 1;
    c.globalAlpha = (on ? 1 : 0.4) * k;
    c.fillStyle = lightCol(on ? '#ffffff' : '#fff1c2', f.mono);
    c.fillRect(x, y, 3, 1);
    if (on) c.drawImage(D.lightSprite(lightCol(WHITE, f.mono)), x - 7, y - 7, 17, 15);
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
}

/** Cloud bodies: soft blue-grey, deeper is darker, the open sides lit silver on the left. */
function cloudFacade(cell: FacadeCell) {
  const { base: b, mono, px, py, depth } = cell;
  if (depth > 0) {
    b.fillStyle = 'rgba(6,8,24,1)';
    b.globalAlpha = Math.min(0.5, 0.09 * depth);
    b.fillRect(px, py, 16, 16);
    b.globalAlpha = 1;
  }
  if (cell.openL) { b.fillStyle = col('#8f9ac4', mono); b.globalAlpha = 0.5; b.fillRect(px, py + 2, 1, 14); b.globalAlpha = 1; }
  if (cell.openR) { b.fillStyle = col('#1c2244', mono); b.globalAlpha = 0.6; b.fillRect(px + 15, py + 2, 1, 14); b.globalAlpha = 1; }
}

const discless = new Map<SkyPreset, SkyPreset>();
/** The preset without its moon or sun (the clouds' backdrop paints its own; the airport has none). */
function noDisc(p: SkyPreset): SkyPreset {
  let v = discless.get(p);
  if (!v) { v = { ...p, disc: null }; discless.set(p, v); }
  return v;
}

/** The clouds' breakable sign: a little knot of moonlit wisp. */
const MOON_WISP: SpriteSet<'idle'> = (() => {
  const row = (s: string) => s.padEnd(48, '.');
  const on = [
    '', '', '', '', '', '....aa......', '..abbbaa....aab', '.abbbbbba..abbbba', '..bbccbbbbbbbccbb', '....cc..bbbcc', '', '', '', '', '', '',
  ].map(row);
  const off = on.map(r => r.replace(/a/g, 'b'));
  return { size: { w: 48, h: 16 }, anchor: { x: 0, y: 16 }, palette: { a: '#fff6d8', b: '#c4cce8', c: '#8f9ac4' }, anims: { idle: { frames: [on, off], fps: 2, loop: true } } };
})();

export const CLOUDS: PixelTheme = {
  id: 'clouds',
  tiles: CLOUD_TILES.tiles,
  decor: CLOUD_TILES.decor,
  glow: CLOUD_GLOW,
  facade: cloudFacade,
  sky: (w, h, mono, seed, o) => backdropSky(CLOUD_BACKDROP, w, h, mono, seed, noDisc(o.sky), wispBand(43 + seed * 17, mono, '#c4cce8', '#3c4672'), [0.05, 0.16, 0.45],
    [{ lift: 80 }, { lift: 64 }, { lift: 24, lights: CLOUD_BACKDROP.navLights }]),
  weather: 'none',
  enemies: {
    // no walkers in 2-2; if one is placed it is a storm cell too
    walker: { set: TRIP_ENEMIES.stormCell, glow: TRIP_ENEMY_GLOW, move: 'hover', dead: 'dead', light: '#fff6a0' },
    flyer: { set: TRIP_ENEMIES.stormCell, glow: TRIP_ENEMY_GLOW, move: 'hover', dead: 'dead', light: '#fff6a0' },
  },
  goal: {
    // the runway threshold: a bar of green lights with a strobe running in
    kind: 'runwayLights', mast: false, fps: CLOUD_TILES.decor.runwayLights.anims.idle.fps || 6,
    lights: [{ dx: 16, dy: -5, r: 40, color: NAV_GREEN, k: 0.9, priority: 3, halo: 0.5 }],
  },
  sign: () => MOON_WISP,
  signLight: MOON,
  decorLights: {
    wingLight: { dx: 7.5, dy: -9, r: 18, colors: [NAV_RED, NAV_GREEN], k: 0.95, halo: 0.6, blink: 1 },
  },
  // wing lights: red on, red off, green on, green off; alternate decorations are green
  animDecor: { wingLight: { frames: 2, fps: 2 } },
  // a cloud tower only looks solid: she runs into it (memory c hides inside one)
  frontDecor: { cloudTower: true },
  checkpoint: 'wingLight',
  layers: {
    back(c, f) { cityGlow(c, f); drawPlanes(c, f, 'base'); drawCity(c, f, 'base'); },
    backGlow(c, f) { drawPlanes(c, f, 'glow'); drawCity(c, f, 'glow'); },
    tiles(c, f, layer) { drawPuffs(c, f, layer); if (layer === 'glow') approachLights(c, f); },
    front: drawWisps,
  },
};

const TRIP_THEMES: Readonly<Record<'airport' | 'clouds', PixelTheme>> = { airport: AIRPORT, clouds: CLOUDS };

/** The trip themes, given the renderer's kit (once, when the chunk loads). */
export function tripThemes(kit: TripKit): Readonly<Record<'airport' | 'clouds', PixelTheme>> {
  if (!D) { D = kit; setKit(kit); DROPS = makeDrops(); WISPS = makeWisps(); }
  return TRIP_THEMES;
}
