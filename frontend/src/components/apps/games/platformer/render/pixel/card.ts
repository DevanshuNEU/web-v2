/**
 * Pixel-native cards for world 1: the level title ("WORLD 1", the level
 * name, the run's modifier) and the level-clear tally. Drawn into the low-res
 * buffer in the 5x7 font, so they sit on the same pixel grid as the art.
 *
 * A card wipes in from the top behind a bright scanline with a little
 * horizontal glitch at the edge, its thin neon frame flickers on, and it
 * closes to its middle line on the way out. Under reduced motion it simply
 * appears and goes. The panel and text are baked once per card; the frame,
 * the wipe and the tally's numbers are drawn live.
 */

import { toMono } from '../bake';
import { makeCanvas, type Canvas, type Ctx } from './canvas';
import { drawNumber, drawText, numberWidth, textWidth, wrap, GLYPH_H } from './font';
import { lightSprite } from './lights';
import { hash2 } from './skyline';

export const WIPE_IN = 0.3;
export const WIPE_OUT = 0.25;
/** Horizontal room the card keeps from the view's edges, px. */
const MARGIN = 28;

export interface Wipe { from: number; to: number }

/** Visible rows of a card as fractions of its height, from its age and time left. */
export function cardWipe(out: Wipe, elapsed: number, remaining: number, reduced: boolean): Wipe {
  if (reduced) { out.from = 0; out.to = 1; return out; }
  if (elapsed < WIPE_IN) {
    const p = Math.max(0, elapsed / WIPE_IN);
    out.from = 0; out.to = 1 - (1 - p) * (1 - p);
    return out;
  }
  if (remaining < WIPE_OUT) {
    const p = Math.max(0, remaining / WIPE_OUT);
    out.from = 0.5 - p / 2; out.to = 0.5 + p / 2;
    return out;
  }
  out.from = 0; out.to = 1;
  return out;
}

export interface CardLayout { scale: number; lines: string[] }

/** The level name large (2x) on up to two lines if it fits the view, else small. */
export function cardLayout(name: string, bw: number): CardLayout {
  const text = name.toUpperCase();
  const maxW = bw - MARGIN;
  const big = wrap(text, maxW, 2);
  if (big.length <= 2 && big.every(l => textWidth(l, 2) <= maxW)) return { scale: 2, lines: big };
  return { scale: 1, lines: wrap(text, maxW, 1) };
}

export interface CardArt {
  canvas: Canvas;
  w: number; h: number;
  frame: string; corner: string;
  /** Tally only: where the two numbers go (right edge x, top y). */
  numX: number; timeY: number; clearY: number;
}

const ACCENT: Readonly<Record<string, string>> = {
  blackout: '#ff3d9a', storm: '#3df2ff', lowGravity: '#9a5cff', doubleAura: '#ffb347', droneSwarm: '#ff4a4a', mirror: '#3df2ff',
};

/** The colour a modifier's name is set in. */
export function accentOf(modifier: string): string { return ACCENT[modifier] ?? '#ff3d9a'; }

const PANEL = 'rgba(6,4,16,0.86)';

function panel(c: Ctx, w: number, h: number) {
  c.fillStyle = PANEL;
  c.fillRect(0, 0, w, h);
  // faint scanlines, every other row
  c.fillStyle = 'rgba(0,0,0,0.28)';
  for (let y = 1; y < h; y += 2) c.fillRect(1, y, w - 2, 1);
}

/** Large text with a chromatic split: magenta left, cyan right, warm white on top. */
function chroma(c: Ctx, text: string, x: number, y: number, scale: number, col: (s: string) => string) {
  c.globalAlpha = 0.6;
  c.fillStyle = col('#ff3d9a'); drawText(c, text, x - 1, y, scale);
  c.fillStyle = col('#3df2ff'); drawText(c, text, x + 1, y, scale);
  c.globalAlpha = 1;
  c.fillStyle = col('#fff4e8'); drawText(c, text, x, y, scale);
}

/** Bake the title card: label, name and the modifier's name. */
export function bakeTitle(label: string, name: string, modName: string, modifier: string, bw: number, mono: boolean): CardArt {
  const col = mono ? toMono : (s: string) => s;
  const lay = cardLayout(name, bw);
  const lab = label.toUpperCase(), mod = modName.toUpperCase();
  const nameW = Math.max(...lay.lines.map(l => textWidth(l, lay.scale)));
  const w = Math.min(bw - 8, Math.max(nameW, textWidth(lab, 1, 1), mod ? textWidth(mod, 1, 1) + 12 : 0) + 28);
  const lineH = GLYPH_H * lay.scale;
  const h = 8 + GLYPH_H + 6 + lay.lines.length * lineH + (lay.lines.length - 1) * 3 * lay.scale + (mod ? 7 + GLYPH_H : 0) + 8;
  const { canvas, ctx } = makeCanvas(w, h);
  panel(ctx, w, h);
  let y = 8;
  ctx.fillStyle = col('#9d8fd6');
  drawText(ctx, lab, Math.round((w - textWidth(lab, 1, 1)) / 2), y, 1, 1);
  y += GLYPH_H + 2;
  // a short rule under the label with a bright centre
  ctx.fillStyle = col('#3a2f6a');
  ctx.fillRect(Math.round(w / 2 - 14), y, 28, 1);
  ctx.fillStyle = col('#ff3d9a');
  ctx.fillRect(Math.round(w / 2 - 1), y, 2, 1);
  y += 4;
  for (const line of lay.lines) {
    chroma(ctx, line, Math.round((w - textWidth(line, lay.scale)) / 2), y, lay.scale, col);
    y += lineH + 3 * lay.scale;
  }
  y -= 3 * lay.scale;
  if (mod) {
    y += 7;
    const accent = col(accentOf(modifier));
    const mw = textWidth(mod, 1, 1);
    const mx = Math.round((w - mw) / 2);
    ctx.fillStyle = accent;
    drawText(ctx, mod, mx, y, 1, 1);
    ctx.fillRect(mx - 7, y + 3, 4, 1);
    ctx.fillRect(mx + mw + 3, y + 3, 4, 1);
  }
  return { canvas, w, h, frame: col('#3df2ff'), corner: col('#ff3d9a'), numX: 0, timeY: 0, clearY: 0 };
}

/** Bake the level-clear card: the headline and the two bonus labels; numbers are drawn live. */
export function bakeTally(title: string, bw: number, mono: boolean): CardArt {
  const col = mono ? toMono : (s: string) => s;
  const lay = cardLayout(title, bw);
  const nameW = Math.max(...lay.lines.map(l => textWidth(l, lay.scale)));
  const w = Math.min(bw - 8, Math.max(nameW, textWidth('CLEAR BONUS +0000', 1)) + 28);
  const lineH = GLYPH_H * lay.scale;
  const h = 9 + lay.lines.length * lineH + (lay.lines.length - 1) * 3 * lay.scale + 9 + GLYPH_H + 5 + GLYPH_H + 9;
  const { canvas, ctx } = makeCanvas(w, h);
  panel(ctx, w, h);
  let y = 9;
  for (const line of lay.lines) {
    chroma(ctx, line, Math.round((w - textWidth(line, lay.scale)) / 2), y, lay.scale, col);
    y += lineH + 3 * lay.scale;
  }
  y += 9 - 3 * lay.scale;
  const left = 14;
  ctx.fillStyle = col('#9d8fd6');
  drawText(ctx, 'TIME BONUS', left, y);
  const timeY = y;
  y += GLYPH_H + 5;
  drawText(ctx, 'CLEAR BONUS', left, y);
  return { canvas, w, h, frame: col('#ff3d9a'), corner: col('#3df2ff'), numX: w - 14, timeY, clearY: y };
}

/**
 * Draw a card centred at buffer row `cy` with its wipe. `elapsed` drives the
 * frame flickering on; `t` the glitch at the wipe's edge.
 */
export function drawCard(c: Ctx, art: CardArt, bw: number, top: number, wipe: Wipe, elapsed: number, t: number, reduced: boolean) {
  const x = Math.round((bw - art.w) / 2);
  const y0 = Math.floor(wipe.from * art.h), y1 = Math.ceil(wipe.to * art.h);
  if (y1 <= y0) return;
  c.drawImage(art.canvas, 0, y0, art.w, y1 - y0, x, top + y0, art.w, y1 - y0);
  const wiping = !reduced && (wipe.from > 0 || wipe.to < 1);
  if (wiping) {
    // the rows at the moving edge jitter sideways, behind a bright scanline
    for (let e = 0; e < 2; e++) {
      const edge = e === 0 ? y1 : y0;
      if ((e === 0 && wipe.to >= 1) || (e === 1 && wipe.from <= 0)) continue;
      const band = Math.min(3, y1 - y0);
      const by = e === 0 ? edge - band : edge;
      const off = Math.round((hash2(Math.floor(t * 40), edge) - 0.5) * 8);
      c.drawImage(art.canvas, 0, by, art.w, band, x + off, top + by, art.w, band);
      c.globalAlpha = 0.85;
      c.fillStyle = art.frame;
      c.fillRect(x - 2, top + edge - (e === 0 ? 1 : 0), art.w + 4, 1);
      c.globalAlpha = 1;
    }
  }
  // the neon frame flickers on over the first moments
  const on = reduced || elapsed > 0.5 || hash2(Math.floor(elapsed * 30), 7) < 0.25 + elapsed * 1.4;
  if (!on) return;
  c.fillStyle = art.frame;
  if (wipe.from <= 0) c.fillRect(x, top, art.w, 1);
  if (wipe.to >= 1) c.fillRect(x, top + art.h - 1, art.w, 1);
  c.fillRect(x, top + y0, 1, y1 - y0);
  c.fillRect(x + art.w - 1, top + y0, 1, y1 - y0);
  if (wipe.from <= 0 && wipe.to >= 1) {
    c.fillStyle = art.corner;
    c.fillRect(x - 1, top - 1, 4, 1); c.fillRect(x - 1, top - 1, 1, 4);
    c.fillRect(x + art.w - 3, top - 1, 4, 1); c.fillRect(x + art.w, top - 1, 1, 4);
    c.fillRect(x - 1, top + art.h, 4, 1); c.fillRect(x - 1, top + art.h - 3, 1, 4);
    c.fillRect(x + art.w - 3, top + art.h, 4, 1); c.fillRect(x + art.w, top + art.h - 3, 1, 4);
    // a soft neon bloom around the frame
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.14;
    c.drawImage(lightSprite(art.frame), x - 18, top - 14, art.w + 36, art.h + 28);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
}

/** The tally's two numbers, right aligned, drawn live. */
export function drawTallyNumbers(c: Ctx, art: CardArt, bw: number, top: number, time: number, clearDone: boolean, mono: boolean) {
  const x = Math.round((bw - art.w) / 2);
  c.fillStyle = mono ? '#ffffff' : '#ffd23f';
  drawNumber(c, time, x + art.numX - numberWidth(time), top + art.timeY);
  const w = numberWidth(1000);
  drawNumber(c, 1000, x + art.numX - w, top + art.clearY);
  if (clearDone) drawText(c, '+', x + art.numX - w - 7, top + art.clearY);
}
