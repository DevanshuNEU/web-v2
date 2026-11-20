/**
 * Brainrot Evolution drawing. Canvas only, no React. The view calls
 * `drawBoard` every frame and `drawStrip` when the chain changes.
 *
 * A move becomes a list of sprites: survivors slide, the two tiles of a merge
 * slide into one cell and vanish (ghosts), the merged tile pops in when the
 * slide ends, and the new tile grows in at the same moment.
 */

import { CAST, drawCreature } from '../shared/cast';
import { arcadeTheme, hypeFont, type ArcadeTheme } from '../shared/theme';
import type { Juice } from '../shared/juice';
import { CELLS, LEVELS, SIZE, hasLevel, type Board, type StepResult } from './logic';

/** Slide time in seconds (ease-out). */
export const SLIDE = 0.11;
/** Merge pop after the slide. */
export const POP = 0.18;
/** New tile grow-in after the slide. */
export const GROW = 0.14;
/** New evolution name card. */
export const CARD = 1.2;
/** The "nope" headshake on a move that changes nothing. */
export const NOPE = 0.24;
/** Past every animation: what a static frame uses. */
export const SETTLED = 10;

export type SpriteKind = 'slide' | 'ghost' | 'pop' | 'spawn';
export interface Sprite { kind: SpriteKind; id: number; level: number; from: number; to: number }

/** Sprites for one move: ghosts first so survivors and pops draw on top. */
export function spritesForMove(res: StepResult): Sprite[] {
  const consumed = new Set<number>();
  for (const m of res.merges) { consumed.add(m.sources[0]); consumed.add(m.sources[1]); }
  const out: Sprite[] = [];
  for (const s of res.slides) if (consumed.has(s.id)) out.push({ kind: 'ghost', id: s.id, level: s.level, from: s.from, to: s.to });
  for (const s of res.slides) if (!consumed.has(s.id)) out.push({ kind: 'slide', id: s.id, level: s.level, from: s.from, to: s.to });
  for (const m of res.merges) out.push({ kind: 'pop', id: m.id, level: m.level, from: m.at, to: m.at });
  if (res.spawn) out.push({ kind: 'spawn', id: res.spawn.id, level: res.spawn.level, from: res.spawn.at, to: res.spawn.at });
  return out;
}

/** Sprites for a board with no move behind it. `grow` makes every tile grow in (a new game). */
export function spritesForBoard(board: Board, grow = false): Sprite[] {
  const out: Sprite[] = [];
  for (let i = 0; i < board.length; i++) {
    const t = board[i];
    if (t) out.push({ kind: grow ? 'spawn' : 'slide', id: t.id, level: t.level, from: i, to: i });
  }
  return out;
}

export interface Geometry { size: number; pad: number; gap: number; cell: number }

export function geometry(size: number): Geometry {
  const pad = Math.round(size * 0.03);
  const gap = Math.round(size * 0.026);
  const cell = (size - pad * 2 - gap * (SIZE - 1)) / SIZE;
  return { size, pad, gap, cell };
}

/** Centre of a cell in board pixels. */
export function cellCenter(g: Geometry, idx: number): { x: number; y: number } {
  const r = Math.floor(idx / SIZE);
  const c = idx % SIZE;
  return { x: g.pad + c * (g.cell + g.gap) + g.cell / 2, y: g.pad + r * (g.cell + g.gap) + g.cell / 2 };
}

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const clamp01 = (p: number) => (p < 0 ? 0 : p > 1 ? 1 : p);

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

interface TileColors { face: string; lip: string; number: string }
const tileCache = new Map<string, TileColors[]>();

/** Each tile is a darker shade of its creature's colour, so the sticker pops off it. */
function tileColors(mono: boolean): TileColors[] {
  const key = mono ? 'mono' : 'color';
  const hit = tileCache.get(key);
  if (hit) return hit;
  const theme = arcadeTheme(mono);
  const list = CAST.map(c => {
    const base = mono ? c.mono : c.fill;
    return {
      face: mix(base, theme.board, mono ? 0.72 : 0.62),
      lip: mix(base, theme.outline, mono ? 0.82 : 0.75),
      number: mix(base, theme.text, 0.55),
    };
  });
  tileCache.set(key, list);
  return list;
}

/** One tile: rounded face on a darker lip, the creature, the chain number top left. */
export function drawTile(
  ctx: CanvasRenderingContext2D, level: number, cx: number, cy: number, cell: number,
  scale: number, t: number, seed: number, mono: boolean,
) {
  if (scale <= 0.01) return;
  const colors = tileColors(mono)[level];
  const s = cell * scale;
  const x = cx - s / 2;
  const y = cy - s / 2;
  const r = s * 0.2;
  ctx.fillStyle = colors.lip;
  ctx.beginPath(); ctx.roundRect(x, y + s * 0.05, s, s * 0.95, r); ctx.fill();
  ctx.fillStyle = colors.face;
  ctx.beginPath(); ctx.roundRect(x, y, s, s * 0.95, r); ctx.fill();
  drawCreature(ctx, CAST[level].id, cx, cy + s * 0.02, s * (0.58 + 0.024 * level), { mono, t: t + seed * 0.37 });
  ctx.font = hypeFont(Math.max(9, s * 0.16));
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = colors.number;
  ctx.fillText(String(level + 1), x + s * 0.09, y + s * 0.07);
}

export interface BoardView {
  size: number;
  mono: boolean;
  reduced: boolean;
  /** Seconds, for idle bobbing and blinks. */
  t: number;
  /** Seconds since the last move began. */
  animT: number;
  sprites: Sprite[];
  /** Seconds of nope headshake left. */
  nope: number;
  card: { level: number; age: number } | null;
  juice: Juice;
}

export function drawBoard(ctx: CanvasRenderingContext2D, v: BoardView) {
  const theme = arcadeTheme(v.mono);
  const g = geometry(v.size);
  const S = v.size;
  ctx.clearRect(0, 0, S, S);

  // A horizontal headshake that dies out: "nope, nothing moves that way".
  const shakeX = v.nope > 0 && !v.reduced ? Math.sin((NOPE - v.nope) * 60) * 7 * (v.nope / NOPE) : 0;
  ctx.save();
  ctx.translate(shakeX, 0);

  ctx.fillStyle = theme.board;
  ctx.beginPath(); ctx.roundRect(0, 0, S, S, S * 0.045); ctx.fill();
  ctx.fillStyle = theme.boardAlt;
  for (let i = 0; i < CELLS; i++) {
    const c = cellCenter(g, i);
    ctx.beginPath(); ctx.roundRect(c.x - g.cell / 2, c.y - g.cell / 2, g.cell, g.cell, g.cell * 0.2); ctx.fill();
  }

  const slideP = easeOut(clamp01(v.animT / SLIDE));
  const after = v.animT - SLIDE;
  for (const sp of v.sprites) {
    const a = cellCenter(g, sp.from);
    if (sp.kind === 'ghost' || sp.kind === 'slide') {
      if (sp.kind === 'ghost' && after >= 0) continue;
      const b = sp.from === sp.to ? a : cellCenter(g, sp.to);
      drawTile(ctx, sp.level, a.x + (b.x - a.x) * slideP, a.y + (b.y - a.y) * slideP, g.cell, 1, v.t, sp.id, v.mono);
    } else if (sp.kind === 'pop') {
      if (after < 0) continue;
      const p = clamp01(after / POP);
      const scale = v.reduced ? 1 : 1 + 0.2 * Math.sin(Math.PI * p);
      drawTile(ctx, sp.level, a.x, a.y, g.cell, scale, v.t, sp.id, v.mono);
    } else {
      if (after < 0) continue;
      const p = clamp01(after / GROW);
      drawTile(ctx, sp.level, a.x, a.y, g.cell, v.reduced ? 1 : 0.25 + 0.75 * easeOut(p), v.t, sp.id, v.mono);
    }
  }

  v.juice.draw(ctx);
  ctx.restore();

  if (v.card) drawCard(ctx, S, v.card.level, v.card.age, v.reduced, v.mono, theme, v.t);
}

/** "New evolution" band across the middle of the board. The game keeps playing under it. */
function drawCard(
  ctx: CanvasRenderingContext2D, S: number, level: number, age: number,
  reduced: boolean, mono: boolean, theme: ArcadeTheme, t: number,
) {
  const c = CAST[level];
  const fill = mono ? c.mono : c.fill;
  const fadeIn = reduced ? 1 : clamp01(age / 0.12);
  const fadeOut = reduced ? 1 : clamp01((CARD - age) / 0.25);
  const alpha = Math.min(fadeIn, fadeOut);
  if (alpha <= 0) return;
  const p = clamp01(age / 0.22);
  const pop = reduced ? 1 : 0.7 + 0.3 * easeOut(p) + 0.08 * Math.sin(Math.PI * p);

  const h = S * 0.44;
  const top = (S - h) / 2;
  const x = S * 0.05;
  const w = S * 0.9;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = theme.outline;
  ctx.beginPath(); ctx.roundRect(x, top + 5, w, h, S * 0.05); ctx.fill();
  ctx.fillStyle = theme.board;
  ctx.beginPath(); ctx.roundRect(x, top, w, h, S * 0.05); ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = fill;
  ctx.stroke();

  drawCreature(ctx, c.id, S / 2, top + h * 0.34, h * 0.46 * pop, { mono, t });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = hypeFont(S * 0.046);
  ctx.fillStyle = theme.textDim;
  ctx.fillText('New evolution', S / 2, top + h * 0.68);

  let fs = S * 0.088;
  ctx.font = hypeFont(fs);
  const tw = ctx.measureText(c.name).width;
  if (tw > w * 0.9) { fs *= (w * 0.9) / tw; ctx.font = hypeFont(fs); }
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, fs * 0.2);
  ctx.strokeStyle = theme.outline;
  ctx.strokeText(c.name, S / 2, top + h * 0.85);
  ctx.fillStyle = fill;
  ctx.fillText(c.name, S / 2, top + h * 0.85);
  ctx.restore();
}

let scratch: HTMLCanvasElement | null = null;

/**
 * The evolution chain: nine creatures in a row, the ones reached this game
 * in colour, the rest as dark silhouettes. Drawn in CSS px on a ctx that
 * already has the DPR transform.
 */
export function drawStrip(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number, seen: number, mono: boolean) {
  const theme = arcadeTheme(mono);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = theme.board;
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, h * 0.3); ctx.fill();
  const slot = w / LEVELS;
  const size = Math.min(slot * 0.82, h * 0.78);
  const silhouette = mono ? '#050505' : '#0c0716';

  if (!scratch && typeof document !== 'undefined') scratch = document.createElement('canvas');
  const box = Math.ceil(size * 1.3);
  for (let l = 0; l < LEVELS; l++) {
    const cx = slot * (l + 0.5);
    const cy = h / 2;
    if (hasLevel(seen, l)) {
      drawCreature(ctx, CAST[l].id, cx, cy, size, { mono });
      continue;
    }
    // Silhouette: draw the creature alone, paint over it with source-in, stamp it.
    const sc = scratch;
    const sctx = sc?.getContext('2d');
    if (!sc || !sctx) continue;
    const px = Math.ceil(box * dpr);
    if (sc.width !== px) { sc.width = px; sc.height = px; }
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.globalCompositeOperation = 'source-over';
    sctx.clearRect(0, 0, box, box);
    drawCreature(sctx, CAST[l].id, box / 2, box / 2, size, { mono });
    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = silhouette;
    sctx.fillRect(0, 0, box, box);
    sctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(sc, cx - box / 2, cy - box / 2, box, box);
  }
}
