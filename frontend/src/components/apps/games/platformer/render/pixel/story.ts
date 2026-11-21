/**
 * Story mode in the pixel buffer: memories as small glowing polaroids that
 * bob (and fly to the corner when found), shrines, the unlock moment, the
 * title logo, typed story cards, one-line notices (a power's first pickup)
 * and the beginner prompts anchored in the world. Everything is drawn in the
 * 5x7 font on the art pixel grid; pools are fixed and reused.
 */

import { toMono } from '../bake';
import type { Ctx } from './canvas';
import { drawText, textWidth, wrap, GLYPH_H } from './font';
import { lightSprite } from './lights';
import { POWERUPS } from '../sprites';
import { atlas, drawFrame } from './sprites';
import { hash2 } from './skyline';

export interface Memory { id: string; x: number; y: number; taken: boolean }
export interface Shrine { x: number; y: number; ability: string; taken: boolean }
export interface Prompt { x: number; y: number; text: string }

const FLIGHT_LIFE = 0.7;
const UNLOCK_LIFE = 2.6;

const UNLOCK_TEXT = ['YOU LEARNED TO CLIMB', 'YOU LEARNED TO DASH', 'YOU FOUND A BLADE'];

export class StoryFx {
  /** Memory flights to the corner: world art position at pickup, start time (-1 free). */
  readonly flights = Array.from({ length: 3 }, () => ({ x: 0, y: 0, t0: -1, pending: false }));
  unlockAt = -9;
  unlockText = '';
  private pendingUnlock = false;

  memory(x: number, y: number) {
    const f = this.flights.find(q => q.t0 < 0 && !q.pending) ?? this.flights[0];
    f.x = x; f.y = y; f.pending = true; f.t0 = 0;
  }

  unlock(n: number) {
    this.unlockText = UNLOCK_TEXT[n] ?? 'YOU LEARNED SOMETHING NEW';
    this.pendingUnlock = true;
  }

  /** Seconds since the unlock moment began, or -1. Starts it on the first frame after the event. */
  unlockAge(t: number): number {
    if (this.pendingUnlock) { this.unlockAt = t; this.pendingUnlock = false; }
    const a = t - this.unlockAt;
    return a >= 0 && a < UNLOCK_LIFE ? a : -1;
  }
}

/** A memory polaroid (the sprite, 12 by 12, anchored at its centre). */
function polaroid(c: Ctx, x: number, y: number, mono: boolean, t: number, a = 1) {
  c.globalAlpha = a;
  drawFrame(c, atlas(POWERUPS.memory, mono), 'idle', t * 6, x + 6, y + 6, 1);
  c.globalAlpha = 1;
}

/** Memories still to find: a slow bob and tilt, a warm glow. */
export function drawMemories(c: Ctx, list: readonly Memory[], ox: number, oy: number, bw: number, t: number, reduced: boolean, mono: boolean, light: (x: number, y: number) => void) {
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (m.taken) continue;
    const x = Math.round(m.x * 16 + 3.5) - ox;
    const y = Math.round(m.y * 16 + 2 + (reduced ? 0 : Math.sin(t * 2.2 + i * 1.7) * 2)) - oy;
    if (x < -12 || x > bw + 12) continue;
    light(x + 4, y + 5);
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.35 + (reduced ? 0 : 0.15 * Math.sin(t * 3 + i));
    c.drawImage(lightSprite(mono ? '#ffffff' : '#ffcf9a'), x - 8, y - 7, 25, 25);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    polaroid(c, x, y, mono, t);
    // a glint crossing the frame now and then
    if (!reduced && hash2(Math.floor(t * 2), i) < 0.3) {
      const g = Math.floor((t * 2 % 1) * 14) - 2;
      c.fillStyle = '#ffffff';
      c.globalAlpha = 0.8;
      if (g >= 0 && g < 9) c.fillRect(x + g, y, 1, 1);
      c.globalAlpha = 1;
    }
  }
}

/** Found memories flying to the top right corner of the view. Returns how many are flying. */
export function drawFlights(c: Ctx, fx: StoryFx, ox: number, oy: number, bw: number, t: number, mono: boolean): number {
  let n = 0;
  for (const f of fx.flights) {
    if (f.pending) { f.t0 = t; f.pending = false; }
    if (f.t0 < 0) continue;
    const k = (t - f.t0) / FLIGHT_LIFE;
    if (k > 1 || k < 0) { f.t0 = -1; continue; }
    n++;
    const e = 1 - (1 - k) * (1 - k);
    const sx = f.x - ox, sy = f.y - oy;
    const tx = bw - 18, ty = 30;
    const x = sx + (tx - sx) * e, y = sy + (ty - sy) * e - Math.sin(k * Math.PI) * 24;
    polaroid(c, Math.round(x), Math.round(y), mono, t, 1 - Math.max(0, k - 0.8) * 5);
  }
  return n;
}

/** Shrines: a small stone plinth with a floating glyph; dim once taken. */
export function drawShrines(c: Ctx, list: readonly Shrine[], ox: number, oy: number, bw: number, t: number, reduced: boolean, mono: boolean, light: (x: number, y: number, k: number) => void) {
  const col = (s: string) => (mono ? toMono(s) : s);
  for (let i = 0; i < list.length; i++) {
    const q = list[i];
    const x = Math.round(q.x * 16) - ox, base = Math.round(q.y * 16 + 16) - oy;
    if (x < -20 || x > bw + 20) continue;
    c.fillStyle = col('#2a2548'); c.fillRect(x + 2, base - 10, 12, 10);
    c.fillStyle = col('#544c7e'); c.fillRect(x + 2, base - 10, 12, 1);
    c.fillStyle = col('#1e1a38'); c.fillRect(x + 1, base - 2, 14, 2);
    const bob = reduced ? 0 : Math.round(Math.sin(t * 2 + i) * 1.5);
    const gy = base - 20 + bob;
    const hue = q.ability === 'dash' ? '#ff3d9a' : q.ability === 'blade' ? '#ffcf7a' : '#3df2ff';
    c.globalAlpha = q.taken ? 0.35 : 1;
    c.fillStyle = col(hue);
    // a diamond glyph
    c.fillRect(x + 7, gy, 2, 1); c.fillRect(x + 6, gy + 1, 4, 1); c.fillRect(x + 5, gy + 2, 6, 2);
    c.fillRect(x + 6, gy + 4, 4, 1); c.fillRect(x + 7, gy + 5, 2, 1);
    c.fillStyle = '#ffffff';
    c.fillRect(x + 7, gy + 2, 1, 2);
    c.globalAlpha = 1;
    if (!q.taken) light(x + 8, gy + 3, 0.9);
  }
}

/** The unlock moment's words, centred, in a neon card that fades in and out. */
export function drawUnlockCard(c: Ctx, fx: StoryFx, age: number, bw: number, bh: number, mono: boolean) {
  const a = Math.min(1, age / 0.25, (UNLOCK_LIFE - age) / 0.4);
  const text = fx.unlockText;
  const w = textWidth(text, 1, 1) + 20, h = GLYPH_H + 12;
  const x = Math.round((bw - w) / 2), y = Math.round(bh * 0.32);
  c.globalAlpha = 0.85 * a;
  c.fillStyle = 'rgba(6,4,16,0.9)';
  c.fillRect(x, y, w, h);
  c.globalAlpha = a;
  c.fillStyle = mono ? '#ffffff' : '#3df2ff';
  c.fillRect(x, y, w, 1); c.fillRect(x, y + h - 1, w, 1);
  c.fillStyle = mono ? '#ffffff' : '#fff4e8';
  drawText(c, text, x + 10, y + 6, 1, 1);
  c.globalAlpha = 1;
}

/** The title logo over the live scene: MAIN CHARACTER large with a chromatic split and a neon underline. */
export function drawLogo(c: Ctx, bw: number, bh: number, t: number, reduced: boolean, mono: boolean) {
  const col = (s: string) => (mono ? toMono(s) : s);
  const words = bw >= 230 ? ['MAIN CHARACTER'] : ['MAIN', 'CHARACTER'];
  const scale = words.some(wd => textWidth(wd, 3) > bw - 16) ? 2 : 3;
  let y = Math.round(bh * (bw >= 230 ? 0.12 : 0.1));
  const flick = reduced ? 1 : hash2(Math.floor(t * 12), 3) < 0.03 ? 0.6 : 1;
  for (const wd of words) {
    const x = Math.round((bw - textWidth(wd, scale)) / 2);
    c.globalAlpha = 0.7 * flick;
    c.fillStyle = col('#ff3d9a'); drawText(c, wd, x - 1, y, scale);
    c.fillStyle = col('#3df2ff'); drawText(c, wd, x + 1, y, scale);
    c.globalAlpha = flick;
    c.fillStyle = col('#fff4e8'); drawText(c, wd, x, y, scale);
    y += GLYPH_H * scale + 4;
  }
  c.globalAlpha = 1;
  const sub = 'A NIGHT RUN ACROSS THE COUNTRY';
  const sw = textWidth(sub, 1, 1);
  if (sw < bw - 8) {
    c.fillStyle = col('#9d8fd6');
    drawText(c, sub, Math.round((bw - sw) / 2), y + 2, 1, 1);
  }
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = 0.18 * flick;
  c.drawImage(lightSprite(col('#ff3d9a')), bw / 2 - 90, y - 50, 180, 70);
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
}

export interface StoryCardView { lines: readonly string[]; chars: number; caption?: string; done: boolean }

/** A story card: up to three typed lines, a caption in amber, and a blinking cue when done. */
export function drawStoryCard(c: Ctx, v: StoryCardView, bw: number, bh: number, t: number, reduced: boolean, mono: boolean) {
  const col = (s: string) => (mono ? toMono(s) : s);
  const maxW = bw - 28;
  const lines: string[] = [];
  for (const l of v.lines) for (const part of wrap(l.toUpperCase(), maxW, 1)) lines.push(part);
  const cap = v.caption ? wrap(v.caption.toUpperCase(), maxW, 1) : [];
  const textW = Math.max(60, ...lines.map(l => textWidth(l)), ...cap.map(l => textWidth(l)));
  const w = Math.min(bw - 8, textW + 24);
  const h = 12 + lines.length * (GLYPH_H + 5) + (cap.length ? 6 + cap.length * (GLYPH_H + 4) : 0) + 14;
  const x = Math.round((bw - w) / 2), y = Math.round(Math.max(26, bh * 0.42 - h / 2));
  c.fillStyle = 'rgba(6,4,16,0.9)';
  c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(0,0,0,0.28)';
  for (let r = y + 1; r < y + h; r += 2) c.fillRect(x + 1, r, w - 2, 1);
  c.fillStyle = col('#ff3d9a');
  c.fillRect(x, y, w, 1); c.fillRect(x, y + h - 1, w, 1); c.fillRect(x, y, 1, h); c.fillRect(x + w - 1, y, 1, h);
  // typed letter by letter across all lines
  let left = Math.floor(v.chars);
  let ly = y + 10;
  c.fillStyle = col('#fff4e8');
  for (const l of lines) {
    const shown = left >= l.length ? l : l.slice(0, Math.max(0, left));
    if (shown) drawText(c, shown, x + 12, ly);
    left -= l.length;
    ly += GLYPH_H + 5;
  }
  if (v.done && cap.length) {
    ly += 4;
    c.fillStyle = col('#ffcf7a');
    for (const l of cap) { drawText(c, l, x + 12, ly); ly += GLYPH_H + 4; }
  }
  if (v.done && (reduced || Math.floor(t * 2) % 2 === 0)) {
    c.fillStyle = col('#9d8fd6');
    c.fillRect(x + w - 12, y + h - 8, 5, 1); c.fillRect(x + w - 11, y + h - 7, 3, 1); c.fillRect(x + w - 10, y + h - 6, 1, 1);
  }
}

/** A one-line notice card (a power's first pickup): a name and what it does. */
export function drawNotice(c: Ctx, title: string, line: string, accent: string, bw: number, bh: number, mono: boolean) {
  const col = (s: string) => (mono ? toMono(s) : s);
  const lines = wrap(line.toUpperCase(), bw - 28, 1);
  const tw = textWidth(title.toUpperCase(), 2);
  const fitsBig = tw <= bw - 28;
  const w = Math.min(bw - 8, Math.max(fitsBig ? tw : textWidth(title.toUpperCase()), ...lines.map(l => textWidth(l))) + 24);
  const h = 10 + (fitsBig ? GLYPH_H * 2 : GLYPH_H) + 6 + lines.length * (GLYPH_H + 4) + 8;
  const x = Math.round((bw - w) / 2), y = Math.round(Math.max(26, bh * 0.34 - h / 2));
  c.fillStyle = 'rgba(6,4,16,0.9)'; c.fillRect(x, y, w, h);
  c.fillStyle = col(accent);
  c.fillRect(x, y, w, 1); c.fillRect(x, y + h - 1, w, 1); c.fillRect(x, y, 1, h); c.fillRect(x + w - 1, y, 1, h);
  const T = title.toUpperCase();
  drawText(c, T, Math.round(x + (w - (fitsBig ? tw : textWidth(T))) / 2), y + 10, fitsBig ? 2 : 1);
  c.fillStyle = col('#fff4e8');
  let ly = y + 10 + (fitsBig ? GLYPH_H * 2 : GLYPH_H) + 6;
  for (const l of lines) { drawText(c, l, Math.round(x + (w - textWidth(l)) / 2), ly); ly += GLYPH_H + 4; }
}

/** Beginner prompts anchored in the world (text already in capitals), fading in within about 6 tiles. */
export function drawPrompts(c: Ctx, list: readonly Prompt[], heroX: number, ox: number, oy: number, bw: number, mono: boolean) {
  const col = (s: string) => (mono ? toMono(s) : s);
  for (const p of list) {
    const d = p.x - heroX;
    const a = d > 6 ? 0 : d < -2 ? 0 : Math.min(1, (6 - d) / 2, (d + 2) / 1);
    if (a <= 0.01) continue;
    const text = p.text;
    const w = textWidth(text) + 10, h = GLYPH_H + 8;
    let x = Math.round(p.x * 16) - ox - Math.round(w / 2);
    x = Math.max(4, Math.min(bw - w - 4, x));
    const y = Math.round(p.y * 16) - oy - h - 30;
    c.globalAlpha = a;
    c.fillStyle = 'rgba(6,4,16,0.82)'; c.fillRect(x, y, w, h);
    c.fillStyle = col('#3df2ff'); c.fillRect(x, y + h - 1, w, 1);
    const ax = Math.max(x + 3, Math.min(x + w - 4, Math.round(p.x * 16) - ox));
    c.fillRect(ax - 1, y + h, 3, 1); c.fillRect(ax, y + h + 1, 1, 1);
    c.fillStyle = col('#fff4e8');
    drawText(c, text, x + 5, y + 4);
    c.globalAlpha = 1;
  }
}
