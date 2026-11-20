/**
 * World 1, the neon rooftops: the pixel-art pipeline.
 *
 * Everything is drawn at 16 art pixels per tile into a low-res buffer the
 * size of the view, then blitted to the screen at a whole number of device
 * pixels per art pixel with smoothing off (see ./camera.ts). Back to front:
 *
 *   sky (stars, moon) > clouds > 3 skyline strips > back rain
 *   > static tile chunks > blocks, decor, enemies, scarf, hero
 *   > light pass (darkness times additive lights, one multiply)
 *   > emissive pixels (neon, eyes, coins, orbs, afterimages)
 *   > glow halos (pre-baked light sprites, additive)
 *   > sparks, juice particles, front rain and splashes
 *   > screen effects (Aura Mode tint and edge glow, hit flash, lightning)
 *   > blit > floating words and level cards at full resolution.
 *
 * World modifiers (per run, from the seed) change the weather and light:
 * blackout (near-black night, only the scarf, coins and orbs light it, neon
 * sputters out), storm (dense rain slanted by the wind, lightning), low
 * gravity (slow rain, floating dust), double aura (brighter coins). The seed
 * also picks the skyline and the words on the neon signs.
 *
 * The hot path allocates nothing: buffers, pools, light slots and scratch
 * objects are made once and rewritten. The renderer only reads the world.
 */

import type { Juice } from '../../../shared/juice';
import { hypeFont } from '../../../shared/theme';
import { ROWS, type Level } from '../../sim/level';
import type { World } from '../../sim/world';
import { toMono } from '../bake';
import { drawCards, type View } from '../pipeline';
import { ENEMIES, HERO, HERO_NECK, PICKUPS, ROOFTOP_TILES, type HeroAnim, type SpriteSet } from '../sprites';
import { pickHeroAnim, type AnimPick } from './anim';
import { ART_TILE, blitOrigin, renderCam, viewMetrics, type BlitOrigin, type ViewMetrics } from './camera';
import { makeCanvas, resize, type Canvas, type Ctx } from './canvas';
import { CHUNK_COLS, CHUNK_PX, ChunkCache, chunkRange, type ChunkSpan } from './chunks';
import { LightList, lightSprite, withAlpha } from './lights';
import {
  afterimagesOf, auraOf, dashReadyOf, decorOf, hitFreezeOf, lightsOf, modifierOf, pickupsOf, readHero, scarfOf, seedOf, windOf,
  type Decor, type HeroPose, type PickupKind,
} from './read';
import { signSet, signWord } from './signs';
import { STRIP_W, bakeSky, drawStrip, flicker, hash2, type Sky, type SkyLayer } from './skyline';
import { atlas, drawFrame, drawTinted, tinted, type Atlas } from './sprites';
import { K, KIND, ROOF_GLOW, bakeChunk, bakeChunkPart, decorAtlas, decorBottom, tileAtlas, type Chunk } from './tiles';
import { Motes, Rain, SLANT, Sparks, type RainOpts } from './weather';

export interface PixelView extends View {
  /** Device pixels per CSS pixel; the screen canvas is that much bigger. */
  dpr?: number;
}

const LEVEL_H = ROWS * ART_TILE;
const AFTERIMAGE_LIFE = 0.18;

/** Night colours. Light colours become white under Mono. */
const COL = {
  ambient: '#6a6496',
  ambientDark: '#15111f',
  lightning: '#c9d8ff',
  cityGlow: '#3a1c3e',
  heroFill: '#9db0ff',
  shot: '#ff8c3a',
  elite: '#ffc24a',
  heroRim: '#c99bff',
  scarfEdge: '#c8246c', scarfCore: '#ff6aae', scarfHot: '#ffd0e6',
  scarfDimEdge: '#3e1a33', scarfDimCore: '#6a2c52',
  magenta: '#ff3d9a', cyan: '#3df2ff', sodium: '#ffb347', violet: '#9a5cff', red: '#ff3b4f', screen: '#ffe14d',
} as const;

const ORB_OF: Readonly<Record<PickupKind, keyof typeof PICKUPS>> = {
  aura: 'auraOrb', magnet: 'magnetOrb', boots: 'bootsOrb', pound: 'poundOrb', spark: 'sparkOrb',
};
const ORB_LIGHT: Readonly<Record<PickupKind, string>> = {
  aura: '#9d62ff', magnet: '#ff5c95', boots: '#3df2ff', pound: '#ff8c3a', spark: '#d4ff3a',
};
/** Glowing keys per sprite set. */
const HERO_GLOW = 'eE';
const ENEMY_GLOW = 'YZXRFEW6GH';
const SCARF_N = 10;

interface Buffers { canvas: Canvas; ctx: Ctx }

/** What the last frame drew, for tests and tuning. One object, rewritten each frame. */
export interface FrameStats {
  lights: number;
  /** Level, decor and enemy lights asked for (0 in a blackout). */
  levelLights: number;
  /** Luminance (0..1) of the night's ambient light. */
  ambient: number;
  rain: number;
  rainSpeed: number;
  motes: number;
  /** Lightning flash strength this frame, 0..1. */
  lightning: number;
  coinGlow: number;
  skylineSeed: number;
  signText: string;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1, 7), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}
const AMBIENT_LUM = luminance(COL.ambient);
const AMBIENT_DARK_LUM = luminance(COL.ambientDark);

interface State {
  m: ViewMetrics;
  main: Buffers | null;
  light: Buffers | null;
  lightBase: Canvas | null;
  lightBaseDark: Canvas | null;
  auraEdge: Canvas | null;
  seed: number;
  motes: Motes;
  rainOpts: RainOpts;
  stats: FrameStats;
  /** This frame's modifier flags. */
  blackout: boolean;
  flash: number;
  sky: Sky | null;
  bw: number; bh: number; mono: boolean;
  level: Level | null;
  decor: readonly Decor[] | null;
  chunks: ChunkCache<Chunk>;
  span: ChunkSpan;
  /** The chunk being baked ahead, a slice per frame: index (-1 none), next column, canvases. */
  pre: { index: number; col: number; chunk: Chunk | null };
  rain: Rain;
  sparks: Sparks;
  lights: LightList;
  pose: HeroPose;
  pick: AnimPick;
  bx: BlitOrigin; by: BlitOrigin;
  ox: number; oy: number;
  tiles: Uint8Array | null; cols: number;
  world: World | null;
  lastT: number; lastRx: number; lastRy: number;
  sparkAcc: number;
  sx: Float32Array; sy: Float32Array;
  fonts: Map<number, string>;
}

let S: State | null = null;

function lcg(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

function state(): State {
  if (S) return S;
  const s: State = {
    m: viewMetrics(320, 480, 1),
    main: null, light: null, lightBase: null, lightBaseDark: null, auraEdge: null, sky: null,
    seed: 0, motes: new Motes(lcg(19)), rainOpts: { density: 1, speed: 1, slant: SLANT },
    stats: { lights: 0, levelLights: 0, ambient: 0, rain: 0, rainSpeed: 0, motes: 0, lightning: 0, coinGlow: 0, skylineSeed: 0, signText: '' },
    blackout: false, flash: 0,
    bw: 0, bh: 0, mono: false,
    level: null, decor: null,
    chunks: new ChunkCache<Chunk>(4, (index, reuse) => bakeChunk(reuse, s.level as Level, s.decor ?? [], index, s.mono)),
    span: { first: 0, last: 0 },
    pre: { index: -1, col: 0, chunk: null },
    rain: new Rain(lcg(7)),
    sparks: new Sparks(lcg(13)),
    lights: new LightList(),
    pose: { state: 'ground', facing: 1, vx: 0, vy: 0, animT: 0, landT: 1, wallDir: 0, dashT: 0 },
    pick: { anim: 'idle', frame: 0, facing: 1 },
    bx: { origin: 0, offset: 0 }, by: { origin: 0, offset: 0 },
    ox: 0, oy: 0, tiles: null, cols: 0,
    world: null, lastT: 0, lastRx: 0, lastRy: 0, sparkAcc: 0,
    sx: new Float32Array(SCARF_N), sy: new Float32Array(SCARF_N),
    fonts: new Map(),
  };
  S = s;
  return s;
}

/** The roof top under a falling raindrop, for splashes (buffer pixels), or -1. */
function roofHit(x: number, y: number): number {
  const s = S;
  if (!s || !s.tiles) return -1;
  const wx = x + s.ox, wy = y + s.oy;
  const tx = Math.floor(wx / ART_TILE), ty = Math.floor(wy / ART_TILE);
  if (tx < 0 || tx >= s.cols || ty < 1 || ty >= ROWS) return -1;
  const k = KIND[s.tiles[ty * s.cols + tx]];
  if (k !== K.ROOF && k !== K.STONE && k !== K.BRICK && k !== K.USED && k !== K.AURA && k !== K.CRACK) return -1;
  if (KIND[s.tiles[(ty - 1) * s.cols + tx]] !== K.EMPTY && KIND[s.tiles[(ty - 1) * s.cols + tx]] !== K.COIN) return -1;
  if (wy - ty * ART_TILE > 5) return -1;
  return ty * ART_TILE - s.oy;
}

function col(c: string, mono: boolean): string { return mono ? toMono(c) : c; }
function lightCol(c: string, mono: boolean): string { return mono ? '#ffffff' : c; }

function ensureBuffers(s: State, m: ViewMetrics, mono: boolean, seed: number) {
  if (!s.main) s.main = makeCanvas(m.bw, m.bh);
  if (!s.light) s.light = makeCanvas(m.bw, m.bh);
  if (s.bw === m.bw && s.bh === m.bh && s.mono === mono && s.seed === seed && s.sky) return;
  resize(s.main.canvas, m.bw, m.bh);
  resize(s.light.canvas, m.bw, m.bh);
  s.main.ctx.imageSmoothingEnabled = false;
  s.light.ctx.imageSmoothingEnabled = true;
  s.sky = bakeSky(m.bw, m.bh, mono, seed);
  s.seed = seed;
  s.lightBase = bakeLightBase(m.bw, m.bh, mono, COL.ambient, 1);
  s.lightBaseDark = bakeLightBase(m.bw, m.bh, mono, COL.ambientDark, 0.25);
  s.auraEdge = bakeAuraEdge(m.bw, m.bh, mono);
  s.bw = m.bw; s.bh = m.bh;
  if (s.mono !== mono) { s.mono = mono; s.chunks.reset(); s.pre.index = -1; }
}

/** The darkness: ambient night, lifted by the city glow from below, darker at the edges. */
function bakeLightBase(w: number, h: number, mono: boolean, ambient: string, glow: number): Canvas {
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = col(ambient, mono);
  ctx.fillRect(0, 0, w, h);
  const up = ctx.createLinearGradient?.(0, h, 0, h * 0.35);
  if (up) {
    up.addColorStop(0, withAlpha(col(COL.cityGlow, mono), glow));
    up.addColorStop(1, withAlpha(col(COL.cityGlow, mono), 0));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = up;
    ctx.fillRect(0, 0, w, h);
  }
  const v = ctx.createRadialGradient?.(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.max(w, h) * 0.8);
  if (v) {
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

function bakeAuraEdge(w: number, h: number, mono: boolean): Canvas {
  const { canvas, ctx } = makeCanvas(w, h);
  const g = ctx.createRadialGradient?.(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
  const c = lightCol(COL.violet, mono);
  if (g) {
    g.addColorStop(0, withAlpha(c, 0));
    g.addColorStop(0.7, withAlpha(c, 0.25));
    g.addColorStop(1, withAlpha(c, 0.75));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  return canvas;
}

function mod(a: number, m: number) { return ((a % m) + m) % m; }

/** A light from the level (decor, neon, enemies, level lights): none in a blackout. */
function levelLight(s: State, x: number, y: number, r: number, color: string, k: number, priority: number, halo: number) {
  if (s.blackout) return;
  s.stats.levelLights++;
  s.lights.add(x, y, r, color, k, priority, halo);
}

/** Lightning in a storm: a flash every few seconds, a double flicker then a fade. */
export function lightningAt(t: number): number {
  const period = 4.5;
  const bucket = Math.floor(t / period);
  const at = 0.4 + hash2(bucket, 77) * (period - 1.2);
  const d = t - bucket * period - at;
  if (d < 0 || d > 0.5) return 0;
  if (d < 0.07) return 1;
  if (d < 0.13) return 0.25;
  if (d < 0.22) return 0.85;
  return 0.85 * (1 - (d - 0.22) / 0.28);
}

/** A jagged bolt from the clouds down behind the skyline. */
function drawBolt(c: Ctx, s: State, t: number, a: number, mono: boolean) {
  const bucket = Math.floor(t / 4.5);
  let x = Math.round(s.bw * (0.15 + hash2(bucket, 5) * 0.7));
  let y = Math.round(s.bh * 0.3);
  const end = Math.round(s.bh * 0.75);
  c.globalAlpha = a;
  c.fillStyle = mono ? '#ffffff' : '#e8eeff';
  let i = 0;
  while (y < end) {
    const step = 2 + Math.floor(hash2(bucket * 31 + i, 9) * 5);
    const dx = Math.floor(hash2(bucket * 17 + i, 3) * 5) - 2;
    for (let j = 0; j < step; j++) c.fillRect(x + Math.round((dx * j) / step), y + j, 1, 1);
    x += dx; y += step; i++;
    if (i === 6) { // a short fork
      for (let j = 0; j < 8; j++) c.fillRect(x + j, y + j, 1, 1);
    }
  }
  c.globalAlpha = 1;
}
function clamp01(x: number) { return x < 0 ? 0 : x > 1 ? 1 : x; }

// ─────────────────────────────────────────────────────────────────────────────
// Layers
// ─────────────────────────────────────────────────────────────────────────────

function stripY(s: State, layer: SkyLayer, ry: number): number {
  const viewH = s.m.dh / s.m.k;
  const ry0 = LEVEL_H - viewH;
  return Math.round(viewH + (ry0 - ry) * layer.f + layer.f * 18) - layer.h;
}

function drawBackground(c: Ctx, s: State, rx: number, ry: number, t: number, reduced: boolean, mono: boolean) {
  const sky = s.sky as Sky;
  c.drawImage(sky.canvas, 0, 0);
  // a few stars twinkle (held steady under reduced motion)
  const tw = sky.twinkles;
  c.fillStyle = mono ? '#ffffff' : '#e8ecff';
  for (let i = 0; i < tw.length; i++) {
    const p = tw[i];
    const a = reduced ? 0.6 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (1.3 + (p.seed % 1.7)) + p.seed));
    c.globalAlpha = a;
    c.fillRect(p.x, p.y, 1, 1);
    if (p.bright && a > 0.8) {
      c.globalAlpha = (a - 0.8) * 2;
      c.fillRect(p.x - 1, p.y, 1, 1); c.fillRect(p.x + 1, p.y, 1, 1);
      c.fillRect(p.x, p.y - 1, 1, 1); c.fillRect(p.x, p.y + 1, 1, 1);
    }
  }
  c.globalAlpha = 1;

  if (s.flash > 0.5) drawBolt(c, s, t, s.flash, mono);
  const cl = sky.clouds;
  const drift = reduced ? 0 : t * (s.rainOpts.density > 1 ? 5 : 1.5);
  drawStrip(c, cl, -mod(Math.floor(rx * cl.f + drift), STRIP_W), Math.round(s.bh * 0.3), s.bw);

  for (let li = 0; li < sky.layers.length; li++) {
    const L = sky.layers[li];
    const x0 = -mod(Math.floor(rx * L.f), STRIP_W);
    const y0 = stripY(s, L, ry);
    drawStrip(c, L, x0, y0, s.bw);
    drawLayerGlow(c, s, L, li, x0, y0, t, mono);
    // a rare window flickering off, then back
    for (let i = 0; i < L.flick.length; i++) {
      const f = L.flick[i];
      if (flicker(t * 0.6, f.seed) >= 1) continue;
      c.fillStyle = f.off;
      for (let x = x0 + f.x; x < s.bw; x += STRIP_W) if (x >= -f.w) c.fillRect(x, y0 + f.y, f.w, f.h);
    }
  }
}

/**
 * Neon strips and antenna lights on a skyline layer, drawn right after the
 * layer (so nearer buildings and roofs cover them). They go through the
 * darkness with the rest, so they are drawn over-bright and additive.
 */
function drawLayerGlow(c: Ctx, s: State, L: SkyLayer, li: number, x0: number, y0: number, t: number, mono: boolean) {
  if (s.blackout) return;
  const dim = 0.55 + 0.25 * li;
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < L.neon.length; i++) {
    const n = L.neon[i];
    const k = flicker(t, n.seed);
    if (k <= 0) continue;
    for (let x = x0 + n.x; x < s.bw; x += STRIP_W) {
      if (x < -12) continue;
      c.globalAlpha = dim * k;
      c.fillStyle = n.color;
      c.fillRect(x, y0 + n.y, n.w, n.h);
      c.globalAlpha = 0.5 * dim * k;
      c.drawImage(lightSprite(n.color), x - 7, y0 + n.y - 7, n.w + 14, n.h + 14);
    }
  }
  for (let i = 0; i < L.blinks.length; i++) {
    const b = L.blinks[i];
    if (mod(t * 0.7 + b.seed, 1) >= 0.45) continue;
    for (let x = x0 + b.x; x < s.bw; x += STRIP_W) {
      if (x < -4) continue;
      c.globalAlpha = 0.8;
      c.fillStyle = mono ? '#ffffff' : COL.red;
      c.fillRect(x, y0 + b.y, 1, 1);
      c.globalAlpha = 0.45;
      c.drawImage(lightSprite(lightCol(COL.red, mono)), x - 4, y0 + b.y - 4, 9, 9);
    }
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
}

/** Columns of the next chunk baked per frame, so entering a chunk never bakes it all at once. */
const PREFETCH_COLS = 8;

function prefetchChunk(s: State, level: Level, dir: number, lastChunk: number) {
  const next = dir > 0 ? s.span.last + 1 : s.span.first - 1;
  if (next < 0 || next > lastChunk || s.chunks.has(next)) return;
  const p = s.pre;
  if (p.index !== next) { p.index = next; p.col = 0; }
  const to = Math.min(CHUNK_COLS, p.col + PREFETCH_COLS);
  p.chunk = bakeChunkPart(p.chunk, level, s.decor ?? [], next, s.mono, p.col, to);
  p.col = to;
  if (to < CHUNK_COLS) return;
  p.chunk = s.chunks.adopt(next, p.chunk);
  p.index = -1;
}

function bumpPx(w: World, tx: number, ty: number): number {
  const b = w.bumps;
  for (let i = 0; i < b.length; i++) if (b[i].tx === tx && b[i].ty === ty) return Math.round(Math.sin((b[i].t / 0.18) * Math.PI) * 4.5);
  return 0;
}

function drawDynamicTiles(c: Ctx, s: State, w: World, ta: Atlas, layer: 'base' | 'glow', t: number) {
  const cols = w.level.cols;
  const c0 = Math.max(0, Math.floor(s.ox / ART_TILE)), c1 = Math.min(cols - 1, Math.floor((s.ox + s.bw) / ART_TILE));
  const r0 = Math.max(0, Math.floor(s.oy / ART_TILE)), r1 = Math.min(ROWS - 1, Math.floor((s.oy + s.bh) / ART_TILE));
  const coin = layer === 'glow' ? atlas(PICKUPS.coin, s.mono) : null;
  for (let ty = r0; ty <= r1; ty++) {
    for (let tx = c0; tx <= c1; tx++) {
      const k = KIND[w.tiles[ty * cols + tx]];
      if (k === K.EMPTY || k === K.ROOF || k === K.STONE || k === K.SPIKE || k === K.ONEWAY) continue;
      const x = tx * ART_TILE - s.ox, y = ty * ART_TILE - s.oy;
      if (k === K.COIN || k === K.SIGMA) {
        if (!coin) continue;
        const bob = Math.round(Math.sin(t * 3 + tx * 0.9) * 1);
        drawFrame(c, coin, 'spin', t * (k === K.SIGMA ? 8 : 12) + tx * 0.7, x + 8, y + 8 + bob, 1);
        if (k === K.SIGMA) {
          // the golden Sigma coin: two sparkles circling it
          c.fillStyle = s.mono ? '#ffffff' : '#fff6c8';
          for (let j = 0; j < 2; j++) {
            const a = t * 3 + j * Math.PI;
            const sx = x + 8 + Math.round(Math.cos(a) * 9), sy = y + 8 + bob + Math.round(Math.sin(a) * 5);
            c.fillRect(sx, sy, 1, 1);
            if (((t * 4) | 0) % 2 === j) { c.fillRect(sx - 1, sy, 3, 1); c.fillRect(sx, sy - 1, 1, 3); }
          }
        }
        continue;
      }
      if (k === K.CRACK) {
        if (layer === 'base') drawCrack(c, ta, x, y, tx, ty, s.mono);
        continue;
      }
      const anim = k === K.BRICK ? 'brick' : k === K.AURA ? 'auraBlock' : 'auraBlockUsed';
      drawFrame(c, ta, anim, 0, x, y - bumpPx(w, tx, ty), 1, layer);
    }
  }
}

/** A cracked wall: the building's brick with a lightning-shaped split, so a dash reads as the way through. */
function drawCrack(c: Ctx, ta: Atlas, x: number, y: number, tx: number, ty: number, mono: boolean) {
  drawFrame(c, ta, 'roofFill', (tx + ty) % 3, x, y, 1);
  c.fillStyle = mono ? '#050505' : '#06040d';
  const o = (tx * 5 + ty * 3) % 4;
  // a jagged split top to bottom, with a branch
  for (let j = 0; j < 16; j++) {
    const cx = x + 6 + o + ((j >> 2) % 2 ? 1 : -1) * ((j & 3) < 2 ? 1 : 0) + (j > 8 ? 2 : 0);
    c.fillRect(cx, y + j, 1, 1);
    if (j === 6 || j === 7) c.fillRect(cx + 1 + (j - 6) * 2, y + j + 1, 2, 1);
  }
  c.fillStyle = mono ? '#8a8a93' : '#6a5a9a';
  c.fillRect(x + 7 + o, y + 3, 1, 1);
  c.fillRect(x + 9 + o, y + 11, 1, 1);
}

/** Pooled shots from elite drones: hot pellets with a short trail, glowing. */
function drawShots(c: Ctx, s: State, w: World, layer: 'base' | 'glow') {
  const list = (w as unknown as { shots?: readonly { x: number; y: number; vx: number; vy: number; t: number }[] }).shots;
  if (!Array.isArray(list)) return;
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (!(b.t > 0)) continue;
    const x = Math.round(b.x * ART_TILE) - s.ox, y = Math.round(b.y * ART_TILE) - s.oy;
    if (x < -8 || x > s.bw + 8 || y < -8 || y > s.bh + 8) continue;
    if (layer === 'base') { levelLight(s, x, y, 18, lightCol(COL.shot, s.mono), 0.9, 1, 0.6); continue; }
    const sp = Math.max(1e-6, Math.abs(b.vx) + Math.abs(b.vy));
    const tx = -Math.round((b.vx / sp) * 2), ty = -Math.round((b.vy / sp) * 2);
    c.fillStyle = col(COL.shot, s.mono);
    c.globalAlpha = 0.5;
    c.fillRect(x + tx * 2 - 1, y + ty * 2, 2, 1);
    c.globalAlpha = 1;
    c.fillRect(x + tx - 1, y + ty - 1, 2, 2);
    c.fillRect(x - 1, y - 2, 3, 4); c.fillRect(x - 2, y - 1, 5, 2);
    c.fillStyle = s.mono ? '#ffffff' : '#fff1c2';
    c.fillRect(x, y - 1, 1, 2);
  }
}

/** Animated decor (neon signs, the goal beacon), base or glow layer, and their lights. */
function drawDecor(c: Ctx, s: State, w: World, layer: 'base' | 'glow', t: number, reduced: boolean) {
  const list = decorOf(w);
  let beacon = false;
  for (let i = 0; i < list.length; i++) {
    const d = list[i];
    if (d.kind === 'goalBeacon') beacon = true;
    if (d.kind !== 'neonSign' && d.kind !== 'goalBeacon') continue;
    const a = d.kind === 'neonSign' ? atlas(signSet(signWord(s.seed, w.levelIndex, i)), s.mono, ROOF_GLOW) : decorAtlas(d.kind, s.mono);
    if (!a) continue;
    const x = Math.round(d.x * ART_TILE) - s.ox;
    const bottom = Math.round(decorBottom(d) * ART_TILE) - s.oy;
    if (x > s.bw || x + a.w < 0) continue;
    drawDecorPiece(c, s, a, d.kind, x, bottom, i, layer, t, reduced);
  }
  // A level without a beacon in its decor ends at the flag pole: put the beacon there.
  if (!beacon) {
    const g = (w.level as { goal?: { x: number; top: number; base: number } }).goal ?? w.level.pole;
    const a = decorAtlas('goalBeacon', s.mono);
    if (!a) return;
    const x = g.x * ART_TILE - s.ox, floor = (g.base + 1) * ART_TILE - s.oy;
    if (x > s.bw || x + a.w < 0) return;
    // The lamp sits at the goal's top; a taller goal gets a longer mast down to the roof.
    const top = Math.min(g.top * ART_TILE - s.oy, floor - a.h);
    const bottom = top + a.h;
    if (layer === 'base' && floor > bottom) drawMast(c, x, bottom - 2, floor, s.mono);
    drawDecorPiece(c, s, a, 'goalBeacon', x, bottom, 99, layer, t, reduced);
  }
}

/** The beacon's lattice mast, continued below the sprite: three tones and a rung every 6 px. */
function drawMast(c: Ctx, x: number, from: number, to: number, mono: boolean) {
  const n = col('#7d9bb6', mono), l = col('#2f445e', mono), j = col('#0f1828', mono), m = col('#4a6684', mono), k = col('#1c2a40', mono);
  c.fillStyle = n; c.fillRect(x + 3, from, 1, to - from);
  c.fillStyle = l; c.fillRect(x + 4, from, 1, to - from);
  c.fillStyle = j; c.fillRect(x + 5, from, 1, to - from);
  for (let y = from + 4; y < to - 1; y += 6) {
    c.fillStyle = m; c.fillRect(x + 2, y, 1, 1);
    c.fillStyle = k; c.fillRect(x + 6, y, 1, 1);
  }
  // a foot plate on the roof
  c.fillStyle = l; c.fillRect(x + 1, to - 1, 7, 1);
}

function drawDecorPiece(c: Ctx, s: State, a: Atlas, kind: string, x: number, bottom: number, seed: number, layer: 'base' | 'glow', t: number, reduced: boolean) {
  if (kind === 'neonSign') {
    // In a blackout the sign is dead but for a rare sputter.
    const k = s.blackout ? (flicker(t * 0.5, seed + 0.9) < 1 ? 0.6 : 0) : reduced ? 1 : flicker(t * 0.8, seed + 0.37);
    drawFrame(c, a, 'idle', k < 1 ? 1 : 0, x, bottom, 1, layer);
    if (s.blackout && k === 0) return;
    if (layer === 'base') {
      // the level's own light sits at the sign's left end; this one fills the middle
      levelLight(s, x + 24, bottom - 8, 40, lightCol(COL.magenta, s.mono), 0.6 * Math.max(0.25, k), 2, 0);
    } else if (k > 0) {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.32 * k;
      c.drawImage(lightSprite(lightCol(COL.magenta, s.mono)), x - 14, bottom - 30, 76, 44);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    }
  } else {
    drawFrame(c, a, 'idle', reduced ? 0 : t * 6, x, bottom, 1, layer);
    if (layer === 'base') {
      // the lamp's light comes from the level; the flag adds a magenta wash and the lamp a halo
      levelLight(s, x + 4, bottom - 61, 10, lightCol(COL.cyan, s.mono), 0.8, 3, 0.8);
      levelLight(s, x + 12, bottom - 52, 34, lightCol(COL.magenta, s.mono), 0.8, 2, 0.35);
    }
  }
}

/** Static decor still casts light: water tower lamps, antenna beacons. */
function decorLights(s: State, w: World, t: number) {
  const list = decorOf(w);
  for (let i = 0; i < list.length; i++) {
    const d = list[i];
    const x = d.x * ART_TILE - s.ox;
    if (x > s.bw + 40 || x < -80) continue;
    const bottom = decorBottom(d) * ART_TILE - s.oy;
    if (d.kind === 'antenna') {
      const on = mod(t * 0.8 + i * 0.37, 1) < 0.5;
      levelLight(s, x + 7.5, bottom - 47, on ? 20 : 10, lightCol(COL.red, s.mono), on ? 0.9 : 0.35, 1, on ? 0.6 : 0.15);
    } else if (d.kind === 'waterTower') {
      levelLight(s, x + 13, bottom - 46, 18, lightCol(COL.sodium, s.mono), 0.7, 1, 0.4);
    }
  }
}

function drawCheckpoint(c: Ctx, s: State, w: World, layer: 'base' | 'glow') {
  const cp = w.level.checkpoint;
  if (!cp) return;
  const a = decorAtlas('antenna', s.mono);
  if (!a) return;
  const x = cp.x * ART_TILE - s.ox, bottom = cp.y * ART_TILE - s.oy;
  if (x > s.bw || x + a.w < 0) return;
  drawFrame(c, a, 'idle', 0, x, bottom, 1, layer);
  if (layer === 'base') levelLight(s, x + 7.5, bottom - 46, w.checkpointHit ? 40 : 16, lightCol(w.checkpointHit ? COL.cyan : COL.red, s.mono), w.checkpointHit ? 1 : 0.5, 2, 0.5);
}

function drawPlatforms(c: Ctx, s: State, w: World, ta: Atlas, a: number) {
  for (let i = 0; i < w.platforms.length; i++) {
    const p = w.platforms[i];
    const x = Math.round((p.px + (p.x - p.px) * a) * ART_TILE) - s.ox;
    const y = Math.round((p.py + (p.y - p.py) * a) * ART_TILE) - s.oy;
    for (let j = 0; j < p.w; j++) drawFrame(c, ta, 'oneWay', 0, x + j * ART_TILE, y, 1);
  }
}

function drawEnemies(c: Ctx, s: State, w: World, a: number, t: number, layer: 'base' | 'glow') {
  const drone = atlas(ENEMIES.adDrone, s.mono, ENEMY_GLOW);
  const crawler = atlas(ENEMIES.doomCrawler, s.mono, ENEMY_GLOW);
  for (let i = 0; i < w.enemies.length; i++) {
    const e = w.enemies[i];
    const ex = Math.round((e.px + (e.x - e.px) * a + e.w / 2) * ART_TILE) - s.ox;
    const ey = Math.round((e.py + (e.y - e.py) * a + e.h) * ART_TILE) - s.oy;
    if (ex < -20 || ex > s.bw + 20) continue;
    const kind = e.kind as string;
    const elite = kind === 'eliteDrone';
    const isDrone = elite || kind === 'adDrone' || kind === 'frog';
    const dead = e.deadT !== -1;
    if (dead) c.globalAlpha = clamp01(e.deadT / 0.45);
    if (isDrone) {
      const mode = (e as { mode?: string }).mode;
      const anim = dead ? 'dead' : (mode ? mode === 'dive' : e.vy > 2) ? 'dive' : 'hover';
      drawFrame(c, drone, anim, t * 12 + i, ex, ey, e.dir, layer);
      if (elite && layer === 'base') {
        // the rare gold drone: the same body washed in gold
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha *= 0.45;
        drawTinted(c, drone, tinted(drone, col(COL.elite, s.mono)), anim, t * 12 + i, ex, ey, e.dir);
        c.globalCompositeOperation = 'source-over';
      }
      if (layer === 'base' && !dead) levelLight(s, ex, ey - 8, elite ? 28 : 20, lightCol(elite ? COL.elite : COL.screen, s.mono), elite ? 0.9 : 0.7, elite ? 1 : 0, elite ? 0.6 : 0.45);
    } else {
      drawFrame(c, crawler, dead ? 'squashed' : 'walk', t * 8 + i * 0.5, ex, ey, e.dir, layer);
      if (layer === 'base' && !dead) levelLight(s, ex + e.dir * 3, ey - 6, 14, lightCol(COL.red, s.mono), 0.8, 0, 0.5);
    }
    c.globalAlpha = 1;
  }
}

function drawPickups(c: Ctx, s: State, w: World, t: number, reduced: boolean, layer: 'base' | 'glow') {
  const list = pickupsOf(w);
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (p.taken) continue;
    const set = PICKUPS[ORB_OF[p.kind] ?? 'auraOrb'] as SpriteSet<string>;
    const x = Math.round((p.x + 0.5) * ART_TILE) - s.ox;
    const y = Math.round((p.y + 0.5) * ART_TILE + (reduced ? 0 : Math.sin(t * 2.6 + i) * 2)) - s.oy;
    if (x < -20 || x > s.bw + 20) continue;
    if (layer === 'glow') drawFrame(c, atlas(set, s.mono), 'idle', t * 8, x, y, 1);
    else s.lights.add(x, y, 34, lightCol(ORB_LIGHT[p.kind] ?? COL.violet, s.mono), 0.95, 1, 0.6);
  }
  // the old Aura Crown power-up and coins popping out of blocks
  if (layer !== 'glow') return;
  const orb = atlas(PICKUPS.auraOrb, s.mono);
  for (let i = 0; i < w.crowns.length; i++) {
    const cr = w.crowns[i];
    drawFrame(c, orb, 'idle', t * 8, Math.round((cr.x + cr.w / 2) * ART_TILE) - s.ox, Math.round((cr.y + cr.h / 2) * ART_TILE) - s.oy, 1);
  }
  const coin = atlas(PICKUPS.coin, s.mono);
  for (let i = 0; i < w.pops.length; i++) {
    const p = w.pops[i];
    const k = p.t / 0.55;
    c.globalAlpha = 1 - k * k;
    drawFrame(c, coin, 'spin', p.t * 30, Math.round((p.x + 0.5) * ART_TILE) - s.ox, Math.round((p.y - 0.6 - Math.sin(k * Math.PI) * 1.4) * ART_TILE) - s.oy, 1);
  }
  c.globalAlpha = 1;
}

function coinLights(s: State, w: World, double: boolean) {
  const cols = w.level.cols;
  const c0 = Math.max(0, Math.floor(s.ox / ART_TILE)), c1 = Math.min(cols - 1, Math.floor((s.ox + s.bw) / ART_TILE));
  const r0 = Math.max(0, Math.floor(s.oy / ART_TILE)), r1 = Math.min(ROWS - 1, Math.floor((s.oy + s.bh) / ART_TILE));
  const color = lightCol(COL.sodium, s.mono);
  // coins are a light source of their own in a blackout, and brighter with double aura
  const r = double ? 24 : s.blackout ? 22 : 16, kk = double ? 1 : s.blackout ? 0.8 : 0.55, halo = double ? 0.75 : 0.3;
  s.stats.coinGlow = halo;
  for (let ty = r0; ty <= r1; ty++) {
    for (let tx = c0; tx <= c1; tx++) {
      const k = KIND[w.tiles[ty * cols + tx]];
      if (k === K.COIN) s.lights.add(tx * ART_TILE + 8 - s.ox, ty * ART_TILE + 8 - s.oy, r, color, kk, 0, halo);
      else if (k === K.SIGMA) s.lights.add(tx * ART_TILE + 8 - s.ox, ty * ART_TILE + 8 - s.oy, r * 2, color, 1, 1, 0.9);
      else if (k === K.AURA) levelLight(s, tx * ART_TILE + 8 - s.ox, ty * ART_TILE + 8 - s.oy, 22, lightCol(COL.violet, s.mono), 0.6, 0, 0.3);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero, scarf, afterimages
// ─────────────────────────────────────────────────────────────────────────────

interface HeroDraw { x: number; y: number; neckX: number; neckY: number; facing: 1 | -1; anim: string; frame: number; dw: number; dh: number; visible: boolean }
const HD: HeroDraw = { x: 0, y: 0, neckX: 0, neckY: 0, facing: 1, anim: 'idle', frame: 0, dw: 0, dh: 0, visible: true };

function poseHero(s: State, w: World, feetX: number, feetY: number): HeroDraw {
  const p = readHero(s.pose, w);
  const pick = pickHeroAnim(s.pick, p);
  const anim = pick.anim as HeroAnim;
  const necks = HERO_NECK[anim] ?? HERO_NECK.idle;
  const n = necks[pick.frame % necks.length];
  // land squash: a couple of pixels shorter and wider, easing out
  const sq = p.state === 'ground' && p.landT >= 0 && p.landT < 0.12 ? 1 - p.landT / 0.12 : 0;
  HD.dh = -Math.round(3 * sq);
  HD.dw = Math.round(2 * sq);
  HD.x = feetX; HD.y = feetY;
  HD.facing = pick.facing;
  HD.anim = anim; HD.frame = pick.frame;
  const h = HERO.size.h;
  HD.neckX = feetX - HERO.anchor.x + (pick.facing > 0 ? n.x : HERO.size.w - 1 - n.x);
  HD.neckY = feetY - Math.round(((h - n.y) * (h + HD.dh)) / h);
  const blink = w.invuln > 0 && w.phase === 'play' && Math.floor(w.invuln * 12) % 2 === 0;
  HD.visible = !w.hidden && !blink;
  return HD;
}

/** Scarf points in buffer pixels into s.sx/s.sy; [0] is pinned to the sprite's neck. */
function scarfPoints(s: State, w: World, hd: HeroDraw, t: number, reduced: boolean): number {
  const pts = scarfOf(w);
  s.sx[0] = hd.neckX; s.sy[0] = hd.neckY;
  if (pts.length >= 2) {
    const n = Math.min(SCARF_N, pts.length);
    // keep the sim's rope shape, moved so its root sits on the drawn neck
    const dx = hd.neckX - (pts[0].x * ART_TILE - s.ox), dy = hd.neckY - (pts[0].y * ART_TILE - s.oy);
    // it never hangs through the roof he stands on
    const floor = hd.y - 1;
    // a little flutter on top of the rope, stronger towards the tail and with speed
    const flap = reduced ? 0 : Math.min(1, Math.abs(s.pose.vx) / 6) * 1.4;
    for (let i = 1; i < n; i++) {
      const k = 1 - i / n;
      s.sx[i] = pts[i].x * ART_TILE - s.ox + dx * k;
      s.sy[i] = Math.min(floor, pts[i].y * ART_TILE - s.oy + dy * k + Math.sin(t * 15 - i * 0.9) * flap * (i / n));
    }
    return n;
  }
  // No rope from the sim yet: a short trailing scarf that flutters.
  const speed = Math.min(1, Math.abs(s.pose.vx) / 8);
  for (let i = 1; i < SCARF_N; i++) {
    const wave = reduced ? 0 : Math.sin(t * 10 - i * 0.8) * (0.3 + speed * 0.5) * i * 0.35;
    s.sx[i] = hd.neckX - hd.facing * i * (1.4 + speed * 1.1);
    s.sy[i] = hd.neckY + i * (0.9 - speed * 0.6) + wave;
  }
  return SCARF_N;
}

/** A pixel line through the scarf points: 2 px edge, 1 px core, thinning at the tail. */
function drawScarf(c: Ctx, s: State, n: number, edge: string, core: string, coreOnly: boolean) {
  for (let pass = coreOnly ? 1 : 0; pass < 2; pass++) {
    c.fillStyle = pass === 0 ? edge : core;
    for (let i = 0; i < n - 1; i++) {
      const x0 = s.sx[i], y0 = s.sy[i], x1 = s.sx[i + 1], y1 = s.sy[i + 1];
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      const thick = pass === 0 ? (i < n - 3 ? 2 : 1) : 1;
      if (pass === 1 && i >= n - 2) break;
      for (let j = 0; j < steps; j++) {
        const f = j / steps;
        c.fillRect(Math.round(x0 + (x1 - x0) * f), Math.round(y0 + (y1 - y0) * f), thick, thick);
      }
    }
  }
}

function drawAfterimages(c: Ctx, s: State, w: World, hero: Atlas) {
  const list = afterimagesOf(w);
  if (!list.length) return;
  const hw = w.hero.w, hh = w.hero.h;
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < list.length; i++) {
    const g = list[i];
    if (g.t <= 0) continue;
    const t = tinted(hero, lightCol(i % 2 ? COL.cyan : COL.magenta, s.mono));
    c.globalAlpha = 0.6 * clamp01(g.t / AFTERIMAGE_LIFE);
    drawTinted(c, hero, t, 'dash', 0, Math.round((g.x + hw / 2) * ART_TILE) - s.ox, Math.round((g.y + hh) * ART_TILE) - s.oy, g.facing);
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
}

// ─────────────────────────────────────────────────────────────────────────────
// Light, glow, particles, screen effects
// ─────────────────────────────────────────────────────────────────────────────

function worldLights(s: State, w: World, t: number, reduced: boolean) {
  if (s.blackout) return;
  const list = lightsOf(w);
  for (let i = 0; i < list.length; i++) {
    const L = list[i];
    const amp = (L.flicker || 0) * (reduced ? 0.5 : 1);
    const k = amp > 0 ? 1 - amp * (1 - flicker(t, i * 3.7 + 0.1)) : 1;
    levelLight(s, L.x * ART_TILE - s.ox, L.y * ART_TILE - s.oy, Math.max(1, L.r) * ART_TILE, lightCol(L.color, s.mono), k, 4, 0.35 * k);
  }
}

function lightPass(c: Ctx, s: State) {
  const L = s.light as Buffers;
  const lc = L.ctx;
  lc.globalCompositeOperation = 'source-over';
  lc.globalAlpha = 1;
  lc.drawImage((s.blackout ? s.lightBaseDark : s.lightBase) as Canvas, 0, 0);
  lc.globalCompositeOperation = 'lighter';
  if (s.flash > 0) {
    // lightning lights the whole scene for a moment
    lc.globalAlpha = s.flash * 0.75;
    lc.fillStyle = lightCol(COL.lightning, s.mono);
    lc.fillRect(0, 0, s.bw, s.bh);
  }
  const slots = s.lights.slots;
  for (let i = 0; i < s.lights.count; i++) {
    const l = slots[i];
    lc.globalAlpha = l.k;
    lc.drawImage(lightSprite(l.color), l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  lc.globalAlpha = 1;
  lc.globalCompositeOperation = 'source-over';
  c.globalCompositeOperation = 'multiply';
  c.drawImage(L.canvas, 0, 0);
  c.globalCompositeOperation = 'source-over';
}

function haloPass(c: Ctx, s: State) {
  c.globalCompositeOperation = 'lighter';
  const slots = s.lights.slots;
  for (let i = 0; i < s.lights.count; i++) {
    const l = slots[i];
    if (l.halo <= 0) continue;
    const r = Math.max(4, l.r * 0.42);
    c.globalAlpha = l.halo * l.k;
    c.drawImage(lightSprite(l.color), l.x - r, l.y - r, r * 2, r * 2);
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
}

function drawParticles(c: Ctx, s: State, juice: Juice, mono: boolean) {
  const T = s.m.tileCss;
  const k = ART_TILE / T;
  const ps = juice.particles;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    const size = Math.max(1, Math.round(p.size * k * 0.8));
    c.globalAlpha = clamp01(p.life / p.max);
    c.fillStyle = mono ? toMono(p.color) : p.color;
    c.fillRect(Math.round(p.x * k) - s.ox - (size >> 1), Math.round(p.y * k) - s.oy - (size >> 1), size, size);
  }
  c.globalAlpha = 1;
}

function fontFor(s: State, size: number): string {
  const px = Math.round(size);
  let f = s.fonts.get(px);
  if (!f) { f = hypeFont(px); s.fonts.set(px, f); }
  return f;
}

/** Floating words at full resolution, so they stay crisp over the pixels. */
function drawFloaters(ctx: CanvasRenderingContext2D, s: State, juice: Juice, rx: number, ry: number, shakeX: number, shakeY: number, mono: boolean) {
  const fl = juice.floaters;
  if (!fl.length) return;
  const m = s.m;
  const perArt = m.k / m.dpr; // CSS px per art px
  const toArt = ART_TILE / m.tileCss;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (let i = 0; i < fl.length; i++) {
    const f = fl[i];
    const k = f.life / f.max;
    const pop = juice.reduced ? 1 : Math.min(1, (1 - k) * 8) * (1 + 0.15 * Math.max(0, 1 - (1 - k) * 6));
    const x = (f.x * toArt - rx) * perArt + shakeX, y = (f.y * toArt - ry) * perArt + shakeY;
    ctx.globalAlpha = Math.min(1, k * 2.5);
    ctx.font = fontFor(s, f.size * pop);
    ctx.lineWidth = Math.max(3, f.size * 0.22);
    ctx.strokeStyle = '#0a0716';
    ctx.strokeText(f.text, x, y);
    ctx.fillStyle = mono ? toMono(f.color) : f.color;
    ctx.fillText(f.text, x, y);
  }
  ctx.globalAlpha = 1;
}

function screenEffects(c: Ctx, s: State, w: World, t: number, reduced: boolean) {
  const aura = auraOf(w);
  if (aura > 0) {
    const fade = Math.min(1, aura / 0.4, (8 - aura) / 0.3 + 0.0001);
    // the last two seconds pulse faster as a warning (steady under reduced motion)
    const pulse = reduced ? 0.8 : aura < 2 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 9)) : 0.75 + 0.25 * Math.sin(t * 3);
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.08 * clamp01(fade);
    c.fillStyle = lightCol(COL.violet, s.mono);
    c.fillRect(0, 0, s.bw, s.bh);
    c.globalAlpha = clamp01(fade) * pulse;
    c.drawImage(s.auraEdge as Canvas, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
  if (s.flash > 0) {
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = s.flash * 0.22;
    c.fillStyle = lightCol(COL.lightning, s.mono);
    c.fillRect(0, 0, s.bw, s.bh);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
  const freeze = hitFreezeOf(w);
  if (freeze > 0 && !reduced) {
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = Math.min(0.16, freeze * 2.5);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, s.bw, s.bh);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// The frame
// ─────────────────────────────────────────────────────────────────────────────

/** Tile size in CSS pixels for the pixel renderer at this view. */
export function pixelTile(w: number, h: number, dpr: number): number {
  return viewMetrics(w, h, dpr, state().m).tileCss;
}

export function drawWorld1(ctx: CanvasRenderingContext2D, world: World, v: PixelView, juice: Juice) {
  const s = state();
  const dpr = v.dpr && v.dpr > 0 ? v.dpr : 1;
  const m = viewMetrics(v.w, v.h, dpr, s.m);
  const mono = v.mono, reduced = v.reduced;
  const seed = seedOf(world);
  ensureBuffers(s, m, mono, seed);
  const modifier = modifierOf(world);
  s.blackout = modifier === 'blackout';
  const storm = modifier === 'storm', lowG = modifier === 'lowGravity';
  s.flash = storm && !reduced ? lightningAt(world.t) : 0;
  const wind = windOf(world);
  const ro = s.rainOpts;
  ro.density = storm ? 1.9 : lowG ? 0.8 : 1;
  ro.speed = storm ? 1.35 : lowG ? 0.45 : 1;
  // rain leans with the wind (tiles/s, signed): hard in a storm, a little otherwise
  ro.slant = Math.max(-0.95, Math.min(0.95, (storm ? -0.3 : SLANT) + wind * (storm ? 0.45 : 0.12)));
  const st = s.stats;
  st.levelLights = 0;
  st.ambient = s.blackout ? AMBIENT_DARK_LUM : AMBIENT_LUM;
  st.lightning = s.flash;
  st.skylineSeed = seed;
  st.signText = signWord(seed, world.levelIndex, 0);
  const level = world.level;
  const decor = decorOf(world);
  if (s.level !== level || s.decor !== decor) { s.level = level; s.decor = decor; s.chunks.reset(); s.pre.index = -1; }
  s.tiles = world.tiles; s.cols = level.cols;

  const a = clamp01(v.alpha);
  const t = world.t;
  const h = world.hero;
  const hx = world.heroPx + (h.x - world.heroPx) * a, hy = world.heroPy + (h.y - world.heroPy) * a;
  const cam = world.cam;
  const camX = (cam.px + (cam.x - cam.px) * a) * ART_TILE, camY = (cam.py + (cam.y - cam.py) * a) * ART_TILE;
  const anchorX = (hx + h.w / 2) * ART_TILE, anchorY = (hy + h.h) * ART_TILE;
  const rx = renderCam(camX, anchorX, clamp01((Math.abs(h.vx) - 0.5) / 2));
  const ry = renderCam(camY, anchorY, clamp01((Math.abs(h.vy) - 0.5) / 3));
  blitOrigin(s.bx, rx, m.k); blitOrigin(s.by, ry, m.k);
  s.ox = s.bx.origin; s.oy = s.by.origin;

  let dt = t - s.lastT;
  if (s.world !== world || dt < 0 || dt > 0.1) { dt = 0; s.lastRx = rx; s.lastRy = ry; }
  const camDx = rx - s.lastRx, camDy = ry - s.lastRy;
  s.world = world; s.lastT = t; s.lastRx = rx; s.lastRy = ry;

  const c = (s.main as Buffers).ctx;
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  s.lights.begin(0, 0, s.bw, s.bh, Math.round(anchorX) - s.ox, Math.round(anchorY) - s.oy - 12);

  // ── back to front ──
  drawBackground(c, s, rx, ry, t, reduced, mono);
  s.rain.update(dt, s.bw, s.bh, camDx, camDy, reduced, roofHit, ro);
  s.motes.update(dt, s.bw, s.bh, camDx, camDy, lowG, reduced);
  s.rain.draw(c, false, mono);

  chunkRange(s.span, s.ox, s.bw);
  const lastChunk = Math.floor((level.cols - 1) / CHUNK_COLS);
  for (let i = s.span.first; i <= Math.min(s.span.last, lastChunk); i++) {
    c.drawImage(s.chunks.get(i).base, i * CHUNK_PX - s.ox, -s.oy);
  }
  prefetchChunk(s, level, h.vx >= 0 ? 1 : -1, lastChunk);
  const ta = tileAtlas(mono);
  drawDynamicTiles(c, s, world, ta, 'base', t);
  drawPlatforms(c, s, world, ta, a);
  drawCheckpoint(c, s, world, 'base');
  drawDecor(c, s, world, 'base', t, reduced);
  decorLights(s, world, t);
  drawEnemies(c, s, world, a, t, 'base');
  drawShots(c, s, world, 'base');
  drawPickups(c, s, world, t, reduced, 'base');

  const hero = atlas(HERO, mono, HERO_GLOW);
  const hd = poseHero(s, world, Math.round(anchorX) - s.ox, Math.round(anchorY) - s.oy);
  const ready = dashReadyOf(world);
  const n = scarfPoints(s, world, hd, t, reduced);
  if (hd.visible) {
    drawScarf(c, s, n, col(ready ? COL.scarfEdge : COL.scarfDimEdge, mono), col(ready ? COL.scarfCore : COL.scarfDimCore, mono), false);
    // rim light from the city glow behind him: a one pixel edge on his back and hood
    const rim = tinted(hero, col(COL.heroRim, mono));
    c.globalAlpha = 0.85;
    drawTinted(c, hero, rim, hd.anim, hd.frame, hd.x - hd.facing, hd.y, hd.facing);
    drawTinted(c, hero, rim, hd.anim, hd.frame, hd.x, hd.y - 1, hd.facing);
    c.globalAlpha = 1;
    drawFrame(c, hero, hd.anim, hd.frame, hd.x, hd.y, hd.facing, 'base', hd.dw, hd.dh);
  }
  // wall slide sparks at the hand on the wall
  s.sparkAcc += dt;
  if (s.pose.state === 'wallSlide' && s.sparkAcc > 0.05 && !reduced) {
    s.sparkAcc = 0;
    s.sparks.emit(hd.x + (s.pose.wallDir || hd.facing) * 5 + s.ox, hd.y - 4 + s.oy, s.pose.wallDir || hd.facing, 2);
  }
  s.sparks.update(dt);

  // ── lights ──
  const auraOn = auraOf(world) > 0;
  if (!s.blackout || auraOn) s.lights.add(hd.x, hd.y - 12, auraOn ? 70 : 40, lightCol(auraOn ? COL.violet : COL.heroFill, mono), auraOn ? 1 : 0.7, 5, auraOn ? 0.4 : 0);
  if (hd.visible) {
    const mid = n >> 1;
    // in a blackout the scarf is the hero's lantern
    const r = s.blackout ? (ready ? 52 : 30) : ready ? 30 : 16;
    s.lights.add(s.sx[mid], s.sy[mid], r, lightCol(COL.magenta, mono), ready ? 0.95 : s.blackout ? 0.6 : 0.35, 5, ready ? 0.45 : 0);
  }
  worldLights(s, world, t, reduced);
  coinLights(s, world, modifier === 'doubleAura');
  lightPass(c, s);

  // ── emissive: what glows stays bright through the darkness ──
  if (!s.blackout) {
    for (let i = s.span.first; i <= Math.min(s.span.last, lastChunk); i++) {
      c.drawImage(s.chunks.get(i).glow, i * CHUNK_PX - s.ox, -s.oy);
    }
  }
  drawDynamicTiles(c, s, world, ta, 'glow', t);
  drawCheckpoint(c, s, world, 'glow');
  drawDecor(c, s, world, 'glow', t, reduced);
  drawEnemies(c, s, world, a, t, 'glow');
  drawShots(c, s, world, 'glow');
  drawPickups(c, s, world, t, reduced, 'glow');
  drawAfterimages(c, s, world, hero);
  if (hd.visible) {
    if (ready) drawScarf(c, s, n, '', col(COL.scarfHot, mono), true);
    drawFrame(c, hero, hd.anim, hd.frame, hd.x, hd.y, hd.facing, 'glow', hd.dw, hd.dh);
  }
  haloPass(c, s);

  s.sparks.draw(c, s.ox, s.oy, mono);
  s.motes.draw(c, mono);
  drawParticles(c, s, juice, mono);
  s.rain.draw(c, true, mono);
  screenEffects(c, s, world, t, reduced);
  st.lights = s.lights.count;
  st.rain = s.rain.active;
  let sum = 0;
  for (let i = 0; i < s.rain.active; i++) sum += s.rain.streaks[i].speed;
  st.rainSpeed = s.rain.active ? sum / s.rain.active : 0;
  st.motes = s.motes.active;

  // ── blit: whole device pixels per art pixel, the camera fraction as an offset ──
  let shakeX = 0, shakeY = 0;
  if (juice.shakeTime > 0 && !reduced) {
    const mag = juice.shakeMag * Math.min(1, juice.shakeTime / 0.18);
    shakeX = (hash2(Math.floor(t * 60), 1) * 2 - 1) * mag;
    shakeY = (hash2(Math.floor(t * 60), 2) * 2 - 1) * mag;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage((s.main as Buffers).canvas, s.bx.offset + Math.round(shakeX * dpr), s.by.offset + Math.round(shakeY * dpr), s.bw * m.k, s.bh * m.k);
  ctx.restore();

  ctx.save();
  drawFloaters(ctx, s, juice, rx, ry, shakeX, shakeY, mono);
  ctx.restore();
  drawCards(ctx, world, v, mono);
}

/** What the last frame drew. */
export function frameStats(): FrameStats { return state().stats; }

/** For tests: forget every buffer and cache. */
export function resetWorld1() { S = null; }

export { ROOFTOP_TILES };
