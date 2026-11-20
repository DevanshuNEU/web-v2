/**
 * Pixel art as data. A grid is a list of rows, one character per pixel:
 * `.` is clear, every other character is a key into the set's palette.
 * Nothing here touches the DOM; `../bake.ts` turns sets into canvases.
 */

/** Rows of pixels, all the same width. */
export type Grid = readonly string[];

/** Palette key (one character) to a CSS colour, `#rrggbb` or `rgba(...)`. */
export type Palette = Readonly<Record<string, string>>;

export interface Anim {
  frames: readonly Grid[];
  /** Playback rate. 0 means the frames are variants, not a timeline. */
  fps: number;
  loop: boolean;
}

export interface SpriteSet<K extends string> {
  /** Size of every frame in this set, in art pixels. */
  size: { w: number; h: number };
  /** The pixel the engine places at the entity's position. */
  anchor: { x: number; y: number };
  palette: Palette;
  anims: Readonly<Record<K, Anim>>;
}
