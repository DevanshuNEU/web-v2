/**
 * Sprite sheets for the pixel renderer, built on the baker (../bake.ts).
 * Each atlas keeps its frame rects in plain arrays (the baker's frameRect
 * allocates), plus a mirrored sheet for facing left, an emissive sheet (only
 * the pixels that glow, drawn after the darkness so neon stays bright), and
 * tinted silhouettes for dash afterimages. All baked once and memoised.
 */

import { bakeSet } from '../bake';
import type { Palette, SpriteSet } from '../sprites';
import { makeCanvas, type Canvas, type Ctx } from './canvas';

export interface Rect { x: number; y: number; w: number; h: number }

export interface Atlas {
  sheet: Canvas;
  flip: Canvas;
  /** Glowing pixels only, or null when the set has none. */
  glow: Canvas | null;
  glowFlip: Canvas | null;
  w: number; h: number;
  ax: number; ay: number;
  sheetW: number;
  rects: Readonly<Record<string, readonly Rect[]>>;
}

const CLEAR = 'rgba(0,0,0,0)';

function mirror(src: Canvas, w: number, h: number): Canvas {
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  ctx.restore();
  return canvas;
}

/** A palette where only `keys` keep their colour; the rest bake clear. */
function keepOnly(p: Palette, keys: string): Palette {
  const out: Record<string, string> = {};
  for (const k of Object.keys(p)) out[k] = keys.includes(k) ? p[k] : CLEAR;
  return out;
}

const cache = [new WeakMap<object, Atlas>(), new WeakMap<object, Atlas>()];
const glowSets = new WeakMap<object, SpriteSet<string>>();

/** Bake a set (and its emissive keys, if any) into an atlas. */
export function atlas<K extends string>(set: SpriteSet<K>, mono: boolean, glowKeys = ''): Atlas {
  const memo = cache[mono ? 1 : 0];
  const hit = memo.get(set);
  if (hit) return hit;
  const sheet = bakeSet(set, { mono });
  const rects: Record<string, Rect[]> = {};
  for (const name of Object.keys(set.anims) as K[]) {
    rects[name] = set.anims[name].frames.map((_, i) => ({ ...sheet.frameRect(name, i) }));
  }
  let glow: Canvas | null = null;
  if (glowKeys) {
    let gs = glowSets.get(set);
    if (!gs) {
      gs = { ...set, palette: keepOnly(set.palette, glowKeys) } as SpriteSet<string>;
      glowSets.set(set, gs);
    }
    glow = bakeSet(gs, { mono }).canvas;
  }
  const a: Atlas = {
    sheet: sheet.canvas,
    flip: mirror(sheet.canvas, sheet.w, sheet.h),
    glow,
    glowFlip: glow ? mirror(glow, sheet.w, sheet.h) : null,
    w: set.size.w, h: set.size.h,
    ax: set.anchor.x, ay: set.anchor.y,
    sheetW: sheet.w,
    rects,
  };
  memo.set(set, a);
  return a;
}

/** The rect for a frame; the index wraps. */
export function rectOf(a: Atlas, anim: string, frame: number): Rect {
  const list = a.rects[anim] ?? a.rects[Object.keys(a.rects)[0]];
  const n = list.length;
  return list[((Math.floor(frame) % n) + n) % n];
}

/**
 * Draw a frame with its anchor at buffer pixel (x, y). Facing left uses the
 * mirrored sheet; `layer` picks the base art or its glowing pixels. `dw` and
 * `dh` squash or stretch from the anchor (0 keeps the size).
 */
export function drawFrame(ctx: Ctx, a: Atlas, anim: string, frame: number, x: number, y: number, facing: number, layer: 'base' | 'glow' = 'base', dw = 0, dh = 0) {
  const src = layer === 'glow' ? (facing < 0 ? a.glowFlip : a.glow) : facing < 0 ? a.flip : a.sheet;
  if (!src) return;
  const r = rectOf(a, anim, frame);
  const sx = facing < 0 ? a.sheetW - r.x - r.w : r.x;
  const ax = facing < 0 ? a.w - a.ax : a.ax;
  const w = r.w + dw, h = r.h + dh;
  // keep the anchor fixed while squashing: scale about it
  const ox = Math.round(x - (ax * w) / r.w);
  const oy = Math.round(y - (a.ay * h) / r.h);
  ctx.drawImage(src, sx, r.y, r.w, r.h, ox, oy, w, h);
}

const tints = new WeakMap<Atlas, Map<string, { base: Canvas; flip: Canvas }>>();

/** A one-colour silhouette of an atlas (dash afterimages), memoised per atlas and colour. */
export function tinted(a: Atlas, color: string): { base: Canvas; flip: Canvas } {
  let byColor = tints.get(a);
  if (!byColor) { byColor = new Map(); tints.set(a, byColor); }
  const hit = byColor.get(color);
  if (hit) return hit;
  const make = (src: Canvas) => {
    const { canvas, ctx } = makeCanvas(a.sheetW, src.height);
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, a.sheetW, src.height);
    ctx.globalCompositeOperation = 'source-over';
    return canvas;
  };
  const t = { base: make(a.sheet), flip: make(a.flip) };
  byColor.set(color, t);
  return t;
}

/** Draw a frame of a tinted silhouette, placed like drawFrame. */
export function drawTinted(ctx: Ctx, a: Atlas, t: { base: Canvas; flip: Canvas }, anim: string, frame: number, x: number, y: number, facing: number) {
  const r = rectOf(a, anim, frame);
  const sx = facing < 0 ? a.sheetW - r.x - r.w : r.x;
  const ax = facing < 0 ? a.w - a.ax : a.ax;
  ctx.drawImage(facing < 0 ? t.flip : t.base, sx, r.y, r.w, r.h, Math.round(x - ax), Math.round(y - a.ay), r.w, r.h);
}
