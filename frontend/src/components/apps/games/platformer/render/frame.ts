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
import { drawWorld1, pixelTile, type PixelView } from './pixel/world1';

export type View = PixelView;
export type Renderer = 'pixel' | 'cartoon';

export function rendererFor(theme: string): Renderer {
  return theme === 'rooftops' ? 'pixel' : 'cartoon';
}

/** CSS pixels per tile for a w by h view at this DPR, for a level theme. */
export function viewTile(theme: string, w: number, h: number, dpr: number): number {
  return rendererFor(theme) === 'pixel' ? pixelTile(w, h, dpr) : tileFor(w, h);
}

export function drawFrame(ctx: CanvasRenderingContext2D, world: World, view: View, juice: Juice) {
  if (rendererFor(world.level.theme) === 'pixel') drawWorld1(ctx, world, view, juice);
  else drawCartoon(ctx, world, view, juice);
}
