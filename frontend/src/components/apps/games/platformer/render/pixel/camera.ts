/**
 * Pixel camera maths. The world is drawn at 16 art pixels per tile into a
 * low-res buffer, then blitted at a whole number of device pixels per art
 * pixel (k) with smoothing off. The camera is snapped to whole buffer pixels
 * for drawing and the fraction left over becomes a blit offset in device
 * pixels, so a slow pan moves the world one device pixel at a time instead of
 * one art pixel (k device pixels) at a time.
 *
 * The buffers hold q sub-pixels per art pixel (q divides k), so the camera
 * and the hero move in 1/q art pixel steps: on a phone (k = 6, q = 3) the
 * world scrolls 2 device pixels at a time instead of 6, which is what keeps
 * a 60 Hz run from shaking. Art stays on whole art pixels within itself.
 */

import { tileFor } from '../pipeline';
import { pagePerf } from '../../ui/perf';

export const ART_TILE = 16;

/** Device pixels per art pixel: the old tile size, rounded to whole art pixels. */
export function pixelScale(cssW: number, cssH: number, dpr: number): number {
  const d = dpr > 0 ? dpr : 1;
  return Math.max(1, Math.round((tileFor(cssW, cssH) * d) / ART_TILE));
}

/** Sub-pixels per art pixel for a scale of k: the largest of 3, 2, 1 that divides k. */
export function subPixels(k: number): number {
  if (k % 3 === 0) return 3;
  if (k % 2 === 0) return 2;
  return 1;
}

/** Round to the nearest 1/q. */
export function snapTo(v: number, q: number): number {
  return Math.round(v * q) / q;
}

export interface ViewMetrics {
  /** Device pixels per art pixel. */
  k: number;
  /** Buffer sub-pixels per art pixel (divides k). */
  q: number;
  dpr: number;
  /** CSS pixels per tile. */
  tileCss: number;
  /** Tiles visible. */
  cols: number;
  rows: number;
  /** Buffer size in art pixels, one spare pixel each way for the sub-pixel shift. */
  bw: number;
  bh: number;
  /** Screen size in device pixels. */
  dw: number;
  dh: number;
}

export function viewMetrics(cssW: number, cssH: number, dpr: number, out?: ViewMetrics): ViewMetrics {
  const d = dpr > 0 ? dpr : 1;
  const k = pixelScale(cssW, cssH, d);
  const dw = Math.round(cssW * d), dh = Math.round(cssH * d);
  const tileCss = (ART_TILE * k) / d;
  const m = out ?? { k: 0, q: 1, dpr: 0, tileCss: 0, cols: 0, rows: 0, bw: 0, bh: 0, dw: 0, dh: 0 };
  const forced = pagePerf().q;
  m.k = k; m.q = forced && k % forced === 0 ? forced : subPixels(k); m.dpr = d; m.tileCss = tileCss;
  m.cols = cssW / tileCss; m.rows = cssH / tileCss;
  m.bw = Math.ceil(dw / k) + 1; m.bh = Math.ceil(dh / k) + 1;
  m.dw = dw; m.dh = dh;
  return m;
}

/**
 * The camera position actually rendered, in art pixels. `anchor` is the
 * hero's position on the same axis and `lock` (0..1) how fast he moves.
 * Locked, the camera takes on the hero's rounding error, so the hero (drawn
 * at a whole buffer pixel) holds still on screen while he runs and the world
 * scrolls in step with him. Unlocked (standing, slow pans) the camera is
 * exact and the sub-pixel blit makes the pan smooth.
 */
export function renderCam(cam: number, anchor: number, lock: number, q = 1): number {
  return cam + lock * (snapTo(anchor, q) - anchor);
}

export interface BlitOrigin { origin: number; offset: number }

/** Buffer origin for drawing (a whole sub-pixel, in art pixels), and the leftover as a device pixel offset (0 or negative). */
export function blitOrigin(out: BlitOrigin, cam: number, k: number, q = 1): BlitOrigin {
  const sub = Math.floor(cam * q);
  out.origin = sub / q;
  out.offset = -Math.round((cam * q - sub) * (k / q));
  return out;
}

interface Placed { hero: { x: number; y: number; w: number; h: number; vx: number; vy: number }; heroPx: number; heroPy: number; cam: { x: number; y: number; px: number; py: number } }

/** Where a frame sits, in art pixels: the hero (interpolated), the camera, and the camera actually rendered. */
export interface Placement { hx: number; hy: number; camX: number; camY: number; anchorX: number; anchorY: number; rx: number; ry: number }

function clamp01(x: number) { return x < 0 ? 0 : x > 1 ? 1 : x; }

/** Place a frame `alpha` of the way between the last two sim steps. */
export function placeFrame(w: Placed, alpha: number, out: Placement, q = 1): Placement {
  const a = clamp01(alpha);
  const h = w.hero, cam = w.cam;
  out.hx = w.heroPx + (h.x - w.heroPx) * a;
  out.hy = w.heroPy + (h.y - w.heroPy) * a;
  out.camX = (cam.px + (cam.x - cam.px) * a) * ART_TILE;
  out.camY = (cam.py + (cam.y - cam.py) * a) * ART_TILE;
  out.anchorX = (out.hx + h.w / 2) * ART_TILE;
  out.anchorY = (out.hy + h.h) * ART_TILE;
  out.rx = renderCam(out.camX, out.anchorX, clamp01((Math.abs(h.vx) - 0.5) / 2), q);
  out.ry = renderCam(out.camY, out.anchorY, clamp01((Math.abs(h.vy) - 0.5) / 3), q);
  return out;
}

/** Where the world's origin and the hero's anchor land on screen, in device pixels. */
export interface ScreenPlacement { worldX: number; worldY: number; heroX: number; heroY: number }

const BX: BlitOrigin = { origin: 0, offset: 0 }, BY: BlitOrigin = { origin: 0, offset: 0 };

/** The device pixel positions a frame draws at, `k` device px per art px. */
export function screenPlacement(p: Placement, k: number, out: ScreenPlacement, q = 1): ScreenPlacement {
  blitOrigin(BX, p.rx, k, q); blitOrigin(BY, p.ry, k, q);
  out.worldX = Math.round(-BX.origin * k) + BX.offset;
  out.worldY = Math.round(-BY.origin * k) + BY.offset;
  out.heroX = Math.round((snapTo(p.anchorX, q) - BX.origin) * k) + BX.offset;
  out.heroY = Math.round((snapTo(p.anchorY, q) - BY.origin) * k) + BY.offset;
  return out;
}
