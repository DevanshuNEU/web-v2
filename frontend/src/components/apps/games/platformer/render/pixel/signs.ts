/**
 * Neon signs that say something different every run. The sign sprite's frame
 * and tubes are kept; its "NO CAP" lettering is replaced by a word from the
 * arcade's slang bank, set in the sim's 5 by 5 pixel font, picked by seed.
 * Each word becomes its own sprite set once (memoised), then bakes like any
 * other sprite.
 */

import { HYPE } from '../../../shared/slang';
import { FONT, GLYPH_SIZE, LETTER_PITCH, SPACE_PITCH } from '../../sim/font';
import { ROOFTOP_TILES, type SpriteSet } from '../sprites';
import { hash2 } from './skyline';

type SignSet = SpriteSet<'idle'>;

/** Inside the tube border: columns 5..42, glyph rows 5..9 (halo one pixel around). */
const IN_X0 = 5, IN_X1 = 42, ROW0 = 5;
const INNER = IN_X1 - IN_X0 + 1;

function clean(word: string): string {
  return word.toUpperCase().replace(/[^A-Z ]+/g, '').replace(/ +/g, ' ').trim();
}

export function textWidth(text: string): number {
  let w = 0;
  for (let i = 0; i < text.length; i++) w += text[i] === ' ' ? SPACE_PITCH : LETTER_PITCH;
  return Math.max(0, w - 1);
}

/** Words from the slang bank that fit on a sign. */
export const SIGN_WORDS: readonly string[] = (() => {
  const out: string[] = [];
  for (const tier of Object.values(HYPE)) {
    for (const raw of tier) {
      const w = clean(raw);
      if (w.length >= 2 && textWidth(w) <= INNER && !out.includes(w)) out.push(w);
    }
  }
  return out.length ? out : ['NO CAP'];
})();

/** The word for a sign: by seed, level and which sign it is. */
export function signWord(seed: number, level: number, index: number): string {
  const r = hash2(Math.floor(seed) * 31 + level, index * 7 + 3);
  return SIGN_WORDS[Math.floor(r * SIGN_WORDS.length) % SIGN_WORDS.length];
}

/** Lit pixels of the text laid out in the sign's inner area. */
function textMask(text: string): boolean[][] {
  const mask = Array.from({ length: 16 }, () => Array<boolean>(48).fill(false));
  let x = IN_X0 + Math.floor((INNER - textWidth(text)) / 2);
  for (const ch of text) {
    if (ch === ' ') { x += SPACE_PITCH; continue; }
    const g = FONT[ch];
    if (g) for (let gy = 0; gy < GLYPH_SIZE; gy++) for (let gx = 0; gx < GLYPH_SIZE; gx++) if (g[gy][gx] === '#') mask[ROW0 + gy][x + gx] = true;
    x += LETTER_PITCH;
  }
  return mask;
}

const sets = new Map<string, SignSet>();

export function signSet(text: string): SignSet {
  const hit = sets.get(text);
  if (hit) return hit;
  const base = ROOFTOP_TILES.decor.neonSign;
  const [on, off] = base.anims.idle.frames;
  const mask = textMask(text);
  const near = (y: number, x: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (mask[y + dy]?.[x + dx]) return true;
    return false;
  };
  // A dead letter on the off frame: one glyph column range sputters dimmer.
  const deadFrom = IN_X0 + Math.floor((INNER - textWidth(text)) / 2) + LETTER_PITCH * Math.min(2, Math.max(0, text.replace(/ /g, '').length - 1));
  const lit = (row: string, y: number, frame: 'on' | 'off') => {
    let out = '';
    for (let x = 0; x < row.length; x++) {
      const inside = x >= IN_X0 && x <= IN_X1 && y >= ROW0 - 1 && y <= ROW0 + GLYPH_SIZE;
      if (!inside) { out += row[x]; continue; }
      // the row under the top tube carries the tube's cyan glow
      if (frame === 'on') out += mask[y][x] ? 'N' : near(y, x) ? 'G' : y === ROW0 - 1 ? 'H' : '1';
      else out += mask[y][x] ? (x >= deadFrom && x < deadFrom + GLYPH_SIZE ? 'O' : 'M') : '1';
    }
    return out;
  };
  const set: SignSet = {
    ...base,
    anims: { idle: { ...base.anims.idle, frames: [on.map((r, y) => lit(r, y, 'on')), off.map((r, y) => lit(r, y, 'off'))] } },
  };
  sets.set(text, set);
  return set;
}
