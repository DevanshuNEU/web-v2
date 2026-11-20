/**
 * Turns pixel-art data (`./sprites`) into canvases, once.
 *
 * `bakeSet` lays a set out as a sheet: one row per animation (in the order
 * the anims are declared), one column per frame, with a one pixel clear
 * gutter so a frame never samples its neighbour. `bakeGrid` bakes a single
 * grid. Both are memoised per input object and per mono flag, so calling
 * them every frame is cheap. Mono maps each colour to its luminance grey.
 */
import type { Grid, Palette, SpriteSet } from './sprites/types';

export type BakeCanvas = HTMLCanvasElement | OffscreenCanvas;
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface FrameRect { x: number; y: number; w: number; h: number }

export interface BakedSheet {
  canvas: BakeCanvas;
  w: number;
  h: number;
  /** Where a frame sits in the sheet. The frame index wraps, so a running counter works. */
  frameRect(anim: string, frame: number): FrameRect;
}

export interface BakeOptions { mono?: boolean }

const GUTTER = 1;

function makeCanvas(w: number, h: number): { canvas: BakeCanvas; ctx: Ctx2D } {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (ctx) return { canvas, ctx };
  }
  if (typeof document === 'undefined') throw new Error('bake: no canvas available');
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('bake: no 2d context');
  return { canvas, ctx };
}

function parseColor(c: string): [number, number, number, number] {
  const s = c.trim();
  if (s[0] === '#') {
    const hex = s.length === 4 ? s.slice(1).split('').map((ch) => ch + ch).join('') : s.slice(1, 7);
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 1];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) throw new Error(`bake: unknown colour ${c}`);
  const p = m[1].split(',').map((v) => parseFloat(v));
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
}

const monoCache = new Map<string, string>();

/** The luminance grey of a colour, alpha kept. */
export function toMono(c: string): string {
  const hit = monoCache.get(c);
  if (hit) return hit;
  const [r, g, b, a] = parseColor(c);
  const y = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const out = a >= 1 ? `rgb(${y},${y},${y})` : `rgba(${y},${y},${y},${a})`;
  monoCache.set(c, out);
  return out;
}

/** Paint a grid at (ox, oy), merging runs of one colour into one rect. */
function paint(ctx: Ctx2D, grid: Grid, palette: Palette, ox: number, oy: number, mono: boolean) {
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (ch !== '.') {
        const colour = palette[ch];
        if (colour === undefined) throw new Error(`bake: palette has no key '${ch}'`);
        ctx.fillStyle = mono ? toMono(colour) : colour;
        ctx.fillRect(ox + x, oy + y, end - x, 1);
      }
      x = end;
    }
  }
}

const setCache = [new WeakMap<object, BakedSheet>(), new WeakMap<object, BakedSheet>()];

export function bakeSet<K extends string>(set: SpriteSet<K>, opts?: BakeOptions): BakedSheet {
  const mono = !!opts?.mono;
  const cache = setCache[mono ? 1 : 0];
  const hit = cache.get(set);
  if (hit) return hit;

  const { w, h } = set.size;
  const names = Object.keys(set.anims) as K[];
  const cols = Math.max(1, ...names.map((n) => set.anims[n].frames.length));
  const sheetW = cols * (w + GUTTER);
  const sheetH = names.length * (h + GUTTER);
  const { canvas, ctx } = makeCanvas(sheetW, sheetH);
  const rows = new Map<string, { row: number; count: number }>();

  names.forEach((name, row) => {
    const frames = set.anims[name].frames;
    rows.set(name, { row, count: frames.length });
    frames.forEach((grid, col) => paint(ctx, grid, set.palette, col * (w + GUTTER), row * (h + GUTTER), mono));
  });

  const sheet: BakedSheet = {
    canvas,
    w: sheetW,
    h: sheetH,
    frameRect(anim, frame) {
      const r = rows.get(anim);
      if (!r) throw new Error(`bake: no anim '${anim}'`);
      const i = ((Math.floor(frame) % r.count) + r.count) % r.count;
      return { x: i * (w + GUTTER), y: r.row * (h + GUTTER), w, h };
    },
  };
  cache.set(set, sheet);
  return sheet;
}

const gridCache = [new WeakMap<Grid, WeakMap<Palette, BakeCanvas>>(), new WeakMap<Grid, WeakMap<Palette, BakeCanvas>>()];

export function bakeGrid(grid: Grid, palette: Palette, opts?: BakeOptions): BakeCanvas {
  const mono = !!opts?.mono;
  const cache = gridCache[mono ? 1 : 0];
  let byPalette = cache.get(grid);
  if (!byPalette) {
    byPalette = new WeakMap();
    cache.set(grid, byPalette);
  }
  const hit = byPalette.get(palette);
  if (hit) return hit;
  const { canvas, ctx } = makeCanvas(grid[0]?.length ?? 0, grid.length);
  paint(ctx, grid, palette, 0, 0, mono);
  byPalette.set(palette, canvas);
  return canvas;
}
