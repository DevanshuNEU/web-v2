/**
 * Pixel camera maths. The world is drawn at 16 art pixels per tile into a
 * low-res buffer, then blitted at a whole number of device pixels per art
 * pixel (k) with smoothing off. The camera is snapped to whole buffer pixels
 * for drawing and the fraction left over becomes a blit offset in device
 * pixels, so a slow pan moves the world one device pixel at a time instead of
 * one art pixel (k device pixels) at a time.
 */

import { tileFor } from '../pipeline';

export const ART_TILE = 16;

/** Device pixels per art pixel: the old tile size, rounded to whole art pixels. */
export function pixelScale(cssW: number, cssH: number, dpr: number): number {
  const d = dpr > 0 ? dpr : 1;
  return Math.max(1, Math.round((tileFor(cssW, cssH) * d) / ART_TILE));
}

export interface ViewMetrics {
  /** Device pixels per art pixel. */
  k: number;
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
  const m = out ?? { k: 0, dpr: 0, tileCss: 0, cols: 0, rows: 0, bw: 0, bh: 0, dw: 0, dh: 0 };
  m.k = k; m.dpr = d; m.tileCss = tileCss;
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
export function renderCam(cam: number, anchor: number, lock: number): number {
  return cam + lock * (Math.round(anchor) - anchor);
}

export interface BlitOrigin { origin: number; offset: number }

/** Whole buffer origin for drawing, and the leftover as a device pixel offset (0 or negative). */
export function blitOrigin(out: BlitOrigin, cam: number, k: number): BlitOrigin {
  const origin = Math.floor(cam);
  out.origin = origin;
  out.offset = -Math.round((cam - origin) * k);
  return out;
}
