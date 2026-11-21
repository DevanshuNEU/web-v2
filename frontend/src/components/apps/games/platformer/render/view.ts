/**
 * The view's size rules shared by both renderers: the cartoon renderer
 * (./pipeline.ts, a lazy chunk) and the pixel one (./pixel). Kept apart so
 * the pixel renderer and the render seam need nothing from the cartoon one.
 */

/** Rows of tiles the cartoon view shows; the tile size comes from the view height. */
export const VIEW_ROWS = 13;

export interface View {
  w: number; h: number;
  mono: boolean; reduced: boolean;
  /** 0..1 between the last two physics steps. */
  alpha: number;
}

/**
 * Tile size for a w by h view. Wide views show VIEW_ROWS rows, as before.
 * Tall portrait views (a phone) size tiles from the width so about 13
 * columns show and the world stays chunky; the extra rows are sky. Never
 * more than 17 rows, so a very tall window does not shrink the world.
 */
export function tileFor(w: number, h: number): number {
  return Math.max(8, Math.max(h / 17, Math.min(h / VIEW_ROWS, w / 13)));
}
