/**
 * The render seam: `drawFrame(ctx, world, view, juice)` picks the renderer
 * by the level's theme. World 1 (theme 'rooftops') uses the pixel-art
 * pipeline in ./pixel; every other world keeps the cartoon renderer in
 * ./pipeline.ts until phase 3. `viewTile` is the matching tile size in CSS
 * pixels, which the view hands to the sim (viewCols, viewRows) and to Juice.
 */

import type { Juice } from '../../shared/juice';
import type { World } from '../sim/world';
import { drawFrame as drawCartoon, tileFor } from './pipeline';
import { drawWorld1, pixelEvent, pixelTile, type PixelView } from './pixel/world1';

export type View = PixelView;
export type Renderer = 'pixel' | 'cartoon';

/** World 1's rooftops and chapter 1 (Austin) use the pixel renderer. */
export function rendererFor(theme: string): Renderer {
  return theme === 'rooftops' || theme === 'austin' ? 'pixel' : 'cartoon';
}

/** CSS pixels per tile for a w by h view at this DPR, for a level theme. */
export function viewTile(theme: string, w: number, h: number, dpr: number): number {
  return rendererFor(theme) === 'pixel' ? pixelTile(w, h, dpr) : tileFor(w, h);
}

export function drawFrame(ctx: CanvasRenderingContext2D, world: World, view: View, juice: Juice) {
  if (rendererFor(world.level.theme) === 'pixel') drawWorld1(ctx, world, view, juice);
  else drawCartoon(ctx, world, view, juice);
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
