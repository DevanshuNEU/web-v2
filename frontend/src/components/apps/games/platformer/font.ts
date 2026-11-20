/**
 * A 5 by 5 pixel font, A to Z and space, used to lay coins out as letters in
 * the secret level. Each glyph is five rows of five cells; '#' is a coin.
 */

export const GLYPH_SIZE = 5;
/** Columns from one letter to the next (one empty column between letters). */
export const LETTER_PITCH = 6;
/** A space advances less than a letter. */
export const SPACE_PITCH = 4;
/** Longest name the secret level spells. */
export const MAX_NAME = 10;

export const FONT: Record<string, readonly string[]> = {
  A: ['.###.', '#...#', '#####', '#...#', '#...#'],
  B: ['####.', '#...#', '####.', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '####.', '#....', '#####'],
  F: ['#####', '#....', '####.', '#....', '#....'],
  G: ['.####', '#....', '#..##', '#...#', '.###.'],
  H: ['#...#', '#...#', '#####', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '....#', '....#', '#...#', '.###.'],
  K: ['#...#', '#..#.', '###..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '####.', '#....', '#....'],
  Q: ['.###.', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '####.', '#..#.', '#...#'],
  S: ['.####', '#....', '.###.', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  Y: ['#...#', '.#.#.', '..#..', '..#..', '..#..'],
  Z: ['#####', '...#.', '..#..', '.#...', '#####'],
  ' ': ['.....', '.....', '.....', '.....', '.....'],
};

/**
 * Uppercase, keep only A to Z and single spaces, trim, cap at MAX_NAME.
 * Returns '' when nothing usable is left (the caller falls back to "YOU").
 */
export function cleanName(raw: string): string {
  const up = raw.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const kept = up.replace(/[^A-Z ]+/g, ' ').replace(/ +/g, ' ').trim();
  return kept.slice(0, MAX_NAME).trim();
}

/** Width in columns of a cleaned name laid out in the font. */
export function textWidth(text: string): number {
  let w = 0;
  for (let i = 0; i < text.length; i++) w += text[i] === ' ' ? SPACE_PITCH : LETTER_PITCH;
  return Math.max(0, w - 1);
}

/** Cells (column, row) of every coin that spells `text`, starting at (x, y). */
export function textCells(text: string, x: number, y: number): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  let cx = x;
  for (const ch of text) {
    const glyph = FONT[ch] ?? FONT[' '];
    for (let r = 0; r < GLYPH_SIZE; r++) {
      for (let c = 0; c < GLYPH_SIZE; c++) if (glyph[r][c] === '#') cells.push({ x: cx + c, y: y + r });
    }
    cx += ch === ' ' ? SPACE_PITCH : LETTER_PITCH;
  }
  return cells;
}
