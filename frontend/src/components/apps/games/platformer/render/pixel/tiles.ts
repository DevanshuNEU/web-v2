/**
 * Static tiles, baked per chunk with the level's theme. Tile codes come from
 * the sim's TILE table by name, so new codes the sim adds (a roof surface, a
 * one-way ledge, a walkway) are picked up without this file knowing their
 * numbers. Static tiles (roofs, stone, spikes, one-way ledges) and static
 * decor are baked into chunk canvases; tiles that change or move in play
 * (bricks, aura blocks, coins, walkways, thin clouds) are drawn per frame.
 *
 * What a theme paints under a surface (windows, doors, puddles on the roofs;
 * service panels in the terminal) is the theme's `facade`, called once per
 * solid cell at bake time with a FacadeCell.
 */

import { ROWS, TILE, isSolidTile, type Level } from '../../sim/level';
import { ART_TILE } from './camera';
import { CHUNK_COLS, CHUNK_PX } from './chunks';
import { makeCanvas, resize, type Canvas, type Ctx } from './canvas';
import { atlas, drawFrame, rectOf, type Atlas } from './sprites';
import type { Decor } from './read';
import { hash2 } from './skyline';
import type { PixelTheme } from './themes';

export const K = { EMPTY: 0, ROOF: 1, BRICK: 2, AURA: 3, USED: 4, STONE: 5, SPIKE: 6, COIN: 7, ONEWAY: 8, SIGMA: 9, CRACK: 10, CRATE: 11, WALK: 12, PUFF: 13, AWNING: 14, WATER: 15, GATE: 16, CABLE: 17 } as const;

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
    // moving walkways animate and thin clouds come and go: both drawn per frame
    else if (n.startsWith('WALK')) k = K.WALK;
    else if (n.includes('PUFF')) k = K.PUFF;
    // awnings squash on a bounce and water moves: the theme draws both
    else if (n.includes('AWNING')) k = K.AWNING;
    else if (n.includes('WATER')) k = K.WATER;
    // a gate opens and shuts in play, a cable is a diagonal the theme draws whole
    else if (n.includes('GATE')) k = K.GATE;
    else if (n.includes('CABLE')) k = K.CABLE;
    else if (n.includes('ONE') || n.includes('WAY') || n.includes('LEDGE')) k = K.ONEWAY;
    else if (n === 'EMPTY') k = K.EMPTY;
    else if (isSolidTile(code)) k = K.ROOF;
    KIND[code] = k;
  }
})();

export const isStaticKind = (k: number) => k === K.ROOF || k === K.STONE || k === K.SPIKE || k === K.ONEWAY;

/** The walkway direction of a tile code: 1 right, -1 left, 0 not a walkway. */
export const WALK_DIR = new Int8Array(256);
(() => {
  const t = TILE as Record<string, number>;
  if (typeof t.WALK_R === 'number') WALK_DIR[t.WALK_R] = 1;
  if (typeof t.WALK_L === 'number') WALK_DIR[t.WALK_L] = -1;
})();

export function decorSet(theme: PixelTheme, kind: string) {
  return theme.decor[kind] ?? null;
}

/** Decor whose art does not animate is baked into the chunks; the rest draw per frame. */
export function isStaticDecor(theme: PixelTheme, kind: string): boolean {
  if (kind === 'neonSign' || kind === theme.goal.kind || theme.animDecor?.[kind] || theme.frontDecor?.[kind]) return false;
  const s = theme.decor[kind];
  return !!s && (s.anims.idle.fps === 0 || s.anims.idle.frames.length === 1);
}

export function tileAtlas(theme: PixelTheme, mono: boolean): Atlas { return atlas(theme.tiles, mono, theme.glow); }
export function decorAtlas(theme: PixelTheme, kind: string, mono: boolean): Atlas | null {
  const s = theme.decor[kind];
  return s ? atlas(s, mono, theme.glow) : null;
}

function kindAt(level: Level, x: number, y: number): number {
  if (x < 0 || x >= level.cols || y < 0 || y >= ROWS) return K.EMPTY;
  return KIND[level.tiles[y * level.cols + x]];
}

/** The bottom of a decoration, in tiles: the sim gives y as the top of the roof row it stands on. */
export function decorBottom(d: Decor): number {
  return d.y;
}

/** A walkway is a floor too: what is under it is the building, not a roof top. */
const roofCovered = (k: number) => k === K.ROOF || k === K.STONE || k === K.WALK;

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

/**
 * One solid cell handed to a theme's facade at bake time, after its tile art
 * is drawn. Chunk pixels; `puddles` (left, surface row, width) and `lamps`
 * (x, y) collect what the renderer lights live. One object, rewritten.
 */
export interface FacadeCell {
  base: Ctx; glow: Ctx; mono: boolean;
  tx: number; ty: number; px: number; py: number;
  /** Rows of surface above this cell: 0 is the top surface. */
  depth: number;
  /** More building (or the bottom of the level) under this cell. */
  below: boolean;
  /** Open air to the left or right: an exposed side. */
  openL: boolean; openR: boolean;
  puddles: number[]; lamps: number[];
}

const CELL: FacadeCell = {
  base: null as unknown as Ctx, glow: null as unknown as Ctx, mono: false,
  tx: 0, ty: 0, px: 0, py: 0, depth: 0, below: false, openL: false, openR: false, puddles: [], lamps: [],
};

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
export function bakeChunk(reuse: Chunk | null, theme: PixelTheme, level: Level, decor: readonly Decor[], index: number, mono: boolean): Chunk {
  return bakeChunkPart(reuse, theme, level, decor, index, mono, 0, CHUNK_COLS);
}

/**
 * Bake columns [from, to) of a chunk (from 0 clears it first; reaching the
 * last column adds the decor), so a chunk can be baked a slice per frame.
 */
export function bakeChunkPart(reuse: Chunk | null, theme: PixelTheme, level: Level, decor: readonly Decor[], index: number, mono: boolean, from: number, to: number): Chunk {
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
  const ta = tileAtlas(theme, mono);
  const x0 = index * CHUNK_COLS;
  const t0 = x0 + from - (from === 0 ? 1 : 0), t1 = x0 + to - 1 + (to >= CHUNK_COLS ? 1 : 0);
  const cell = CELL;
  cell.base = c.baseCtx; cell.glow = c.glowCtx; cell.mono = mono; cell.puddles = c.puddles; cell.lamps = c.lamps;

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
          frame = variant(tx, ty, theme.fillWeights ?? FILL_W);
          if (depth === 2 && hash2(tx * 31, ty * 17) < 0.035) anim = 'vent';
        }
      } else if (k === K.SPIKE) anim = 'spikes';
      else if (k === K.ONEWAY) anim = 'oneWay';
      const r = rectOf(ta, anim, frame);
      c.baseCtx.drawImage(ta.sheet, r.x, r.y, r.w, r.h, px, py, r.w, r.h);
      if (ta.glow) c.glowCtx.drawImage(ta.glow, r.x, r.y, r.w, r.h, px, py, r.w, r.h);
      if (tx >= x0 && tx < x0 + CHUNK_COLS) {
        if ((k === K.ROOF || k === K.STONE || k === K.ONEWAY) && !roofCovered(kindAt(level, tx, ty - 1))) {
          const l = kindAt(level, tx - 1, ty) === K.EMPTY, r = kindAt(level, tx + 1, ty) === K.EMPTY;
          c.rims.push(px, py, l ? 1 : r ? 2 : 0);
        } else if (k === K.SPIKE) c.spikes.push(px, py);
      }
      if (k === K.ROOF) {
        cell.tx = tx; cell.ty = ty; cell.px = px; cell.py = py;
        cell.depth = depthOf(level, tx, ty);
        cell.below = roofCovered(kindAt(level, tx, ty + 1)) || ty + 1 >= ROWS;
        cell.openL = kindAt(level, tx - 1, ty) === K.EMPTY;
        cell.openR = kindAt(level, tx + 1, ty) === K.EMPTY;
        theme.facade(cell);
      }
    }
  }

  if (to < CHUNK_COLS) return c;
  for (let i = 0; i < decor.length; i++) {
    const d = decor[i];
    if (!isStaticDecor(theme, d.kind)) continue;
    const a = decorAtlas(theme, d.kind, mono);
    if (!a) continue;
    const left = (d.x - x0) * ART_TILE;
    if (left > CHUNK_PX || left + a.w < 0) continue;
    const bottom = decorBottom(d) * ART_TILE;
    drawFrame(c.baseCtx, a, 'idle', 0, left, bottom, 1);
    drawFrame(c.glowCtx, a, 'idle', 0, left, bottom, 1, 'glow');
  }
  return c;
}
