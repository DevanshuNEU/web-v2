/**
 * The render seam: `drawFrame(ctx, world, view, juice)` picks the renderer
 * by the level's theme. The rooftops, Austin and every newer theme use the
 * pixel-art pipeline in ./pixel (its art per theme comes from
 * ./pixel/themes.ts); the old worlds (grass, cave, sky, stars) keep the
 * cartoon renderer in ./pipeline.ts, a lazy chunk of its own (fetched by
 * `preloadTheme`, or on its first frame, which draws plain dark meanwhile).
 * `viewTile` is the matching tile size in CSS pixels, which the view hands
 * to the sim (viewCols, viewRows) and to Juice. `preloadTheme` fetches a
 * theme's art ahead (each chapter after the first is a lazy chunk).
 */

import type { Juice } from '../../shared/juice';
import type { World } from '../sim/world';
import { tileFor } from './view';
import { drawWorld1, pixelEvent, pixelTile, setFinaleCards, type PixelView } from './pixel/world1';
import { loadTheme, themeFor } from './pixel/themes';

export type View = PixelView;
export type Renderer = 'pixel' | 'cartoon';

const CARTOON: ReadonlySet<string> = new Set(['grass', 'cave', 'sky', 'stars']);

/** Every theme but the old cartoon worlds uses the pixel renderer. */
export function rendererFor(theme: string): Renderer {
  return CARTOON.has(theme) ? 'cartoon' : 'pixel';
}

type Cartoon = typeof import('./pipeline');
let cartoon: Cartoon | null = null;
let cartoonLoad: Promise<Cartoon> | null = null;
/** The cartoon renderer's chunk, once (a failed load can be retried). */
function loadCartoon(): Promise<Cartoon> {
  if (!cartoonLoad) {
    const p: Promise<Cartoon> = import('./pipeline').then(m => { cartoon = m; setFinaleCards(m.drawCards); return m; });
    p.catch(() => { cartoonLoad = null; });
    cartoonLoad = p;
  }
  return cartoonLoad;
}

/** True when a theme's art is here to draw (bundled or loaded). */
export function themeReady(theme: string): boolean {
  return rendererFor(theme) === 'pixel' ? themeFor(theme) !== null : cartoon !== null;
}

/** Fetch a level theme's art (or the cartoon renderer) ahead of time; resolves at once when it is here. */
export function preloadTheme(theme: string): Promise<unknown> {
  return rendererFor(theme) === 'pixel' ? loadTheme(theme) : loadCartoon();
}

/** CSS pixels per tile for a w by h view at this DPR, for a level theme. */
export function viewTile(theme: string, w: number, h: number, dpr: number): number {
  return rendererFor(theme) === 'pixel' ? pixelTile(w, h, dpr) : tileFor(w, h);
}

export function drawFrame(ctx: CanvasRenderingContext2D, world: World, view: View, juice: Juice) {
  if (rendererFor(world.level.theme) === 'pixel') drawWorld1(ctx, world, view, juice);
  else if (cartoon) cartoon.drawFrame(ctx, world, view, juice);
  else {
    // its chunk is on the way: a plain dark frame meanwhile
    loadCartoon().catch(() => {});
    ctx.save();
    ctx.fillStyle = '#120b1f';
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.restore();
  }
}

/**
 * Tell the renderer about a game event it draws (positions in tiles). The
 * view forwards these while it drains the sim's events: `doubleJump`, `pogo`,
 * `memory`, `unlock`, `swing`, `hit`, `break`, `coinPull` (a coin a power pulls in),
 * `decoyDive` (a drone struck a decoy: the pigeon scatters, the can tips).
 */
export function noteEvent(type: string, x: number, y: number, n = 0) {
  pixelEvent(type, x, y, n);
}
