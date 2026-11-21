/**
 * A 5 by 7 pixel font for the renderer's own words (title cards, the level
 * clear tally): A to Z, 0 to 9 and a little punctuation. Text is drawn as
 * filled pixels at a whole-number scale, so it sits on the art pixel grid.
 * Lower case draws as upper case; unknown characters draw as a space.
 */

import type { Ctx } from './canvas';

export const GLYPH_W = 5;
export const GLYPH_H = 7;
/** Columns from one letter to the next. */
export const PITCH = 6;

const G: Record<string, string> = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
  B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.',
  D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####',
  F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.####',
  H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '.###.|..#..|..#..|..#..|..#..|..#..|.###.',
  J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
  L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
  N: '#...#|#...#|##..#|#.#.#|#..##|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
  R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.',
  T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.',
  X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
  Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
  1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
  2: '.###.|#...#|....#|...#.|..#..|.#...|#####',
  3: '####.|....#|....#|.###.|....#|....#|####.',
  4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
  5: '#####|#....|####.|....#|....#|#...#|.###.',
  6: '..##.|.#...|#....|####.|#...#|#...#|.###.',
  7: '#####|....#|...#.|..#..|.#...|.#...|.#...',
  8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  9: '.###.|#...#|#...#|.####|....#|...#.|.##..',
  ' ': '.....|.....|.....|.....|.....|.....|.....',
  '.': '.....|.....|.....|.....|.....|.....|..#..',
  ',': '.....|.....|.....|.....|.....|..#..|.#...',
  '!': '..#..|..#..|..#..|..#..|..#..|.....|..#..',
  '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
  "'": '..#..|..#..|.....|.....|.....|.....|.....',
  '+': '.....|..#..|..#..|#####|..#..|..#..|.....',
  '-': '.....|.....|.....|.###.|.....|.....|.....',
  ':': '.....|..#..|.....|.....|.....|..#..|.....',
  '/': '....#|...#.|...#.|..#..|.#...|.#...|#....',
  '%': '##..#|##.#.|...#.|..#..|.#...|.#.##|#..##',
};

/** Per glyph, the lit pixels as (x, y) pairs, flat. */
const PIX = new Map<string, Int8Array>();
for (const [ch, rows] of Object.entries(G)) {
  const pts: number[] = [];
  rows.split('|').forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '#') pts.push(x, y); });
  PIX.set(ch, Int8Array.from(pts));
}
const SPACE = PIX.get(' ') as Int8Array;
const DIGITS: Int8Array[] = Array.from({ length: 10 }, (_, d) => PIX.get(String(d)) as Int8Array);

export function hasGlyph(ch: string): boolean { return PIX.has(ch.toUpperCase()); }

function glyph(ch: string): Int8Array { return PIX.get(ch) ?? PIX.get(ch.toUpperCase()) ?? SPACE; }

/** Width in pixels of text at a scale, with `track` extra pixels between letters. */
export function textWidth(text: string, scale = 1, track = 0): number {
  if (!text.length) return 0;
  return (text.length * (PITCH + track) - 1 - track) * scale;
}

/** Draw text with its top left at (x, y). Uses the current fillStyle. */
export function drawText(c: Ctx, text: string, x: number, y: number, scale = 1, track = 0) {
  let cx = Math.round(x);
  const cy = Math.round(y);
  for (let i = 0; i < text.length; i++) {
    const p = glyph(text[i]);
    for (let j = 0; j < p.length; j += 2) c.fillRect(cx + p[j] * scale, cy + p[j + 1] * scale, scale, scale);
    cx += (PITCH + track) * scale;
  }
}

/** Width of a whole number in pixels. */
export function numberWidth(n: number, scale = 1): number {
  let digits = 1;
  for (let t = Math.max(0, Math.floor(n)); t >= 10; t = Math.floor(t / 10)) digits++;
  return digits * PITCH * scale - scale;
}

/** Draw a whole number without making a string (the tally counts every frame). */
export function drawNumber(c: Ctx, n: number, x: number, y: number, scale = 1): number {
  let v = Math.max(0, Math.floor(n));
  let digits = 1;
  for (let t = v; t >= 10; t = Math.floor(t / 10)) digits++;
  const w = digits * PITCH * scale - scale;
  let cx = Math.round(x) + w - (GLYPH_W * scale);
  for (let d = 0; d < digits; d++) {
    const p = DIGITS[v % 10];
    for (let j = 0; j < p.length; j += 2) c.fillRect(cx + p[j] * scale, Math.round(y) + p[j + 1] * scale, scale, scale);
    v = Math.floor(v / 10);
    cx -= PITCH * scale;
  }
  return w;
}

/** Split words into lines no wider than maxW at a scale. */
export function wrap(text: string, maxW: number, scale: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && textWidth(next, scale) > maxW) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
