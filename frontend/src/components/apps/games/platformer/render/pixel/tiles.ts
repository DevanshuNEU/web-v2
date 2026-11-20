/**
 * Rooftop tiles. Tile codes come from the sim's TILE table by name, so new
 * codes the sim adds (a roof surface, a one-way ledge) are picked up without
 * this file knowing their numbers. Static tiles (roofs, stone, spikes, one-way
 * ledges) and static decor are baked into chunk canvases; tiles that change
 * in play (bricks, aura blocks, coins) are drawn per frame.
 */

import { ROWS, TILE, isSolidTile, type Level } from '../../sim/level';
import { ROOFTOP_TILES } from '../sprites';
import { ART_TILE } from './camera';
import { CHUNK_COLS, CHUNK_PX } from './chunks';
import { makeCanvas, resize, type Canvas, type Ctx } from './canvas';
import { atlas, drawFrame, rectOf, type Atlas } from './sprites';
import type { Decor } from './read';
import { hash2 } from './skyline';
import { toMono } from '../bake';

export const K = { EMPTY: 0, ROOF: 1, BRICK: 2, AURA: 3, USED: 4, STONE: 5, SPIKE: 6, COIN: 7, ONEWAY: 8, SIGMA: 9, CRACK: 10, CRATE: 11 } as const;

/** Tile code to kind. */
export const KIND = new Uint8Array(256);
(() => {
  for (const [name, code] of Object.entries(TILE as Record<string, number>)) {
    if (typeof code !== 'number' || code < 0 || code > 255) continue;
    const n = name.toUpperCase();
    let k: number = K.EMPTY;
    // cracked walls break in play, so they are drawn per frame, not baked
    if (n === 'BRICK') k = K.BRICK;
    else if (n.includes('CRACK') || n.includes('BREAK')) k = K.CRACK;
    else if (n.includes('CRATE')) k = K.CRATE;
    else if (n.startsWith('AURA')) k = K.AURA;
    else if (n === 'USED') k = K.USED;
    else if (n === 'STONE') k = K.STONE;
    else if (n.startsWith('SPIKE')) k = K.SPIKE;
    else if (n === 'COIN') k = K.COIN;
    else if (n.includes('SIGMA')) k = K.SIGMA;
    else if (n.includes('ONE') || n.includes('WAY') || n.includes('LEDGE')) k = K.ONEWAY;
    else if (n === 'EMPTY') k = K.EMPTY;
    else if (isSolidTile(code)) k = K.ROOF;
    KIND[code] = k;
  }
})();

export const isStaticKind = (k: number) => k === K.ROOF || k === K.STONE || k === K.SPIKE || k === K.ONEWAY;

/** Decor baked into chunks; the rest animate and are drawn per frame. */
export const STATIC_DECOR: Readonly<Record<string, boolean>> = { waterTower: true, antenna: true, acUnit: true, chimney: true, crate: true };

type DecorSet = (typeof ROOFTOP_TILES.decor)[keyof typeof ROOFTOP_TILES.decor];
export function decorSet(kind: string): DecorSet | null {
  return (ROOFTOP_TILES.decor as Record<string, DecorSet>)[kind] ?? null;
}

/** Keys of the rooftop palette that glow: neon, lamps and their halos. */
export const ROOF_GLOW = 'NMDCTSWVQRGHIJK';

export function tileAtlas(mono: boolean): Atlas { return atlas(ROOFTOP_TILES.tiles, mono, ROOF_GLOW); }
export function decorAtlas(kind: string, mono: boolean): Atlas | null {
  const s = decorSet(kind);
  return s ? atlas(s, mono, ROOF_GLOW) : null;
}

function kindAt(level: Level, x: number, y: number): number {
  if (x < 0 || x >= level.cols || y < 0 || y >= ROWS) return K.EMPTY;
  return KIND[level.tiles[y * level.cols + x]];
}

/** The bottom of a decoration, in tiles: the sim gives y as the top of the roof row it stands on. */
export function decorBottom(d: Decor): number {
  return d.y;
}

const roofCovered = (k: number) => k === K.ROOF || k === K.STONE;

/** Variant index from a column hash, weighted so the plain variant is most common. */
function variant(x: number, y: number, weights: readonly number[]): number {
  const r = hash2(x * 7 + 3, y * 13 + 5);
  let acc = 0;
  for (let i = 0; i < weights.length; i++) { acc += weights[i]; if (r < acc) return i; }
  return 0;
}

/** Rows of roof above a tile: 0 for a roof top. */
function depthOf(level: Level, tx: number, ty: number): number {
  let d = 0;
  while (d < 8 && roofCovered(kindAt(level, tx, ty - d - 1))) d++;
  return d;
}

const WINDOW_LIT = ['#d9965a', '#e0b070', '#6aa6c8'];

/**
 * The front of a building under its roof: darker the further down, the odd
 * lit window, drainpipes, and a fire-escape door with a lamp. Roof tops get
 * puddles. Glowing parts go on the chunk's glow layer.
 */
function facade(c: Chunk, level: Level, tx: number, ty: number, px: number, py: number, mono: boolean) {
  const b = c.baseCtx, g = c.glowCtx;
  const col = (s: string) => (mono ? toMonoCached(s) : s);
  const depth = depthOf(level, tx, ty);
  if (depth === 0) {
    // a puddle on the roof top: a glossy dark strip that reflections light up live
    if (hash2(tx * 17, 31) < 0.24) {
      const w = 5 + Math.floor(hash2(tx, 77) * 7), x = px + Math.floor(hash2(tx, 78) * (16 - w));
      b.fillStyle = col('#151129');
      b.fillRect(x, py + 1, w, 2);
      b.fillStyle = col('#221c3c');
      b.fillRect(x + 1, py + 1, w - 2, 1);
      c.puddles.push(x, py + 1, w);
    }
    return;
  }
  const below = roofCovered(kindAt(level, tx, ty + 1)) || ty + 1 >= ROWS;
  const pipe = hash2(tx * 13, 401) < 0.07;
  const door = depth === 1 && below && hash2(tx * 29, 503) < 0.045;
  if (door) {
    // a fire-escape door: frame, a lit pane, a tiny landing and a lamp above
    b.fillStyle = col('#06040c'); b.fillRect(px + 4, py + 2, 9, 14);
    b.fillStyle = col('#2a1a2a'); b.fillRect(px + 5, py + 3, 7, 13);
    b.fillStyle = col('#3a2436'); b.fillRect(px + 5, py + 3, 1, 13);
    g.fillStyle = col('#ffcf7a'); g.fillRect(px + 6, py + 5, 5, 4);
    b.fillStyle = col('#ffcf7a'); b.fillRect(px + 6, py + 5, 5, 4);
    b.fillStyle = col('#4a3a6a'); b.fillRect(px + 2, py + 16, 13, 1);
    g.fillStyle = col('#fff1c2'); g.fillRect(px + 7, py, 3, 1);
    c.lamps.push(px + 8, py + 1);
  } else if (!pipe && depth >= 2 && below && hash2(tx * 7, ty * 11 + 5) < 0.07) {
    // an apartment window, sometimes someone in it
    const lit = hash2(tx, ty * 3) < 0.7;
    b.fillStyle = col('#06040c'); b.fillRect(px + 4, py + 4, 8, 8);
    b.fillStyle = col('#2a2040'); b.fillRect(px + 4, py + 12, 8, 1);
    const wc = lit ? WINDOW_LIT[Math.floor(hash2(tx, ty) * WINDOW_LIT.length)] : '#0c0a18';
    for (const k of lit ? [b, g] : [b]) {
      k.fillStyle = col(wc); k.fillRect(px + 5, py + 5, 6, 6);
      if (lit) { k.fillStyle = 'rgba(0,0,0,0.35)'; k.fillRect(px + 5, py + 5, 6, 1); }
      if (lit && hash2(tx * 3, ty) < 0.35) { k.fillStyle = col('#07050c'); k.fillRect(px + 7, py + 7, 2, 1); k.fillRect(px + 6, py + 8, 4, 3); }
    }
  }
  if (pipe) {
    b.fillStyle = col('#1c2a40'); b.fillRect(px + 11, py, 2, 16);
    b.fillStyle = col('#4a6684'); b.fillRect(px + 11, py, 1, 16);
    b.fillStyle = col('#0f1828'); b.fillRect(px + 10, py + 8, 4, 1);
  }
  // deeper is darker: the street light never reaches the lower floors
  b.fillStyle = 'rgba(3,2,9,1)';
  b.globalAlpha = Math.min(0.6, 0.12 * depth);
  b.fillRect(px, py, 16, 16);
  b.globalAlpha = 1;
}

const monoMemo = new Map<string, string>();
function toMonoCached(s: string): string {
  let v = monoMemo.get(s);
  if (!v) { v = toMono(s); monoMemo.set(s, v); }
  return v;
}

const TOP_W = [0.6, 0.12, 0.28];
const FILL_W = [0.62, 0.3, 0.08];

export interface Chunk {
  base: Canvas; glow: Canvas; baseCtx: Ctx; glowCtx: Ctx;
  /** Puddles on roof tops (chunk pixels: left, surface row, width), lit live by reflections. */
  puddles: number[];
  /** Lamps over doors (chunk pixels x, y), added to the lights when the chunk is on screen. */
  lamps: number[];
  /** Roof top edges for the blackout (x, y, edge: 0 inside, 1 left end, 2 right end) and spikes (x, y). */
  rims: number[];
  spikes: number[];
}

/**
 * Bake one chunk of static tiles and decor: base art plus its glowing
 * pixels (drawn after the darkness). Reuses `reuse`'s canvases when given.
 */
export function bakeChunk(reuse: Chunk | null, level: Level, decor: readonly Decor[], index: number, mono: boolean): Chunk {
  return bakeChunkPart(reuse, level, decor, index, mono, 0, CHUNK_COLS);
}

/**
 * Bake columns [from, to) of a chunk (from 0 clears it first; reaching the
 * last column adds the decor), so a chunk can be baked a slice per frame.
 */
export function bakeChunkPart(reuse: Chunk | null, level: Level, decor: readonly Decor[], index: number, mono: boolean, from: number, to: number): Chunk {
  const H = ROWS * ART_TILE;
  let c = reuse;
  if (!c) {
    const b = makeCanvas(CHUNK_PX, H), g = makeCanvas(CHUNK_PX, H);
    c = { base: b.canvas, glow: g.canvas, baseCtx: b.ctx, glowCtx: g.ctx, puddles: [], lamps: [], rims: [], spikes: [] };
  } else if (from === 0) {
    resize(c.base, CHUNK_PX, H); resize(c.glow, CHUNK_PX, H);
    c.baseCtx.clearRect(0, 0, CHUNK_PX, H); c.glowCtx.clearRect(0, 0, CHUNK_PX, H);
  }
  if (from === 0) { c.puddles.length = 0; c.lamps.length = 0; c.rims.length = 0; c.spikes.length = 0; }
  const ta = tileAtlas(mono);
  const x0 = index * CHUNK_COLS;
  const t0 = x0 + from - (from === 0 ? 1 : 0), t1 = x0 + to - 1 + (to >= CHUNK_COLS ? 1 : 0);
  const shade = mono ? '#0b0b0c' : '#07050f';
  const rim = mono ? '#3a3a40' : '#2c2346';

  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = t0; tx <= t1; tx++) {
      const k = kindAt(level, tx, ty);
      if (!isStaticKind(k)) continue;
      const px = (tx - x0) * ART_TILE, py = ty * ART_TILE;
      let anim = 'stone', frame = 0;
      if (k === K.ROOF) {
        const top = !roofCovered(kindAt(level, tx, ty - 1));
        const l = kindAt(level, tx - 1, ty) === K.ROOF, r = kindAt(level, tx + 1, ty) === K.ROOF;
        if (top) {
          if (!l && r) anim = 'roofEdgeLeft';
          else if (l && !r) anim = 'roofEdgeRight';
          else { anim = 'roofTop'; frame = variant(tx, 0, TOP_W); }
        } else {
          const depth = roofCovered(kindAt(level, tx, ty - 2)) ? 2 : 1;
          anim = 'roofFill';
          frame = variant(tx, ty, FILL_W);
          if (depth === 2 && hash2(tx * 31, ty * 17) < 0.035) anim = 'vent';
        }
      } else if (k === K.SPIKE) anim = 'spikes';
      else if (k === K.ONEWAY) anim = 'oneWay';
      const r = rectOf(ta, anim, frame);
      c.baseCtx.drawImage(ta.sheet, r.x, r.y, r.w, r.h, px, py, r.w, r.h);
      if (ta.glow) c.glowCtx.drawImage(ta.glow, r.x, r.y, r.w, r.h, px, py, r.w, r.h);
      if (k === K.ROOF) facade(c, level, tx, ty, px, py, mono);
      if (tx >= x0 && tx < x0 + CHUNK_COLS) {
        if ((k === K.ROOF || k === K.STONE || k === K.ONEWAY) && !roofCovered(kindAt(level, tx, ty - 1))) {
          const l = kindAt(level, tx - 1, ty) === K.EMPTY, r = kindAt(level, tx + 1, ty) === K.EMPTY;
          c.rims.push(px, py, l ? 1 : r ? 2 : 0);
        } else if (k === K.SPIKE) c.spikes.push(px, py);
      }
      // exposed building sides: a dark seam and a faint rim, so walls read
      if (k === K.ROOF) {
        if (kindAt(level, tx - 1, ty) === K.EMPTY) { c.baseCtx.fillStyle = shade; c.baseCtx.fillRect(px, py + 1, 1, 15); c.baseCtx.fillStyle = rim; c.baseCtx.fillRect(px + 1, py + 2, 1, 14); }
        if (kindAt(level, tx + 1, ty) === K.EMPTY) { c.baseCtx.fillStyle = shade; c.baseCtx.fillRect(px + 15, py + 1, 1, 15); }
      }
    }
  }

  if (to < CHUNK_COLS) return c;
  for (let i = 0; i < decor.length; i++) {
    const d = decor[i];
    if (!STATIC_DECOR[d.kind]) continue;
    const a = decorAtlas(d.kind, mono);
    if (!a) continue;
    const left = (d.x - x0) * ART_TILE;
    if (left > CHUNK_PX || left + a.w < 0) continue;
    const bottom = decorBottom(d) * ART_TILE;
    drawFrame(c.baseCtx, a, 'idle', 0, left, bottom, 1);
    drawFrame(c.glowCtx, a, 'idle', 0, left, bottom, 1, 'glow');
  }
  return c;
}
