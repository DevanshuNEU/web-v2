import { describe, it, expect } from 'vitest';
import { FONT, GLYPH_SIZE, LETTER_PITCH, MAX_NAME, SPACE_PITCH, cleanName, textCells, textWidth } from '@/components/apps/games/platformer/sim/font';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

describe('platformer pixel font', () => {
  it('has every letter A to Z and a space, each 5 rows of 5 cells', () => {
    for (const ch of [...LETTERS, ' ']) {
      const g = FONT[ch];
      expect(g, ch).toBeDefined();
      expect(g).toHaveLength(GLYPH_SIZE);
      for (const row of g) expect(row).toMatch(/^[#.]{5}$/);
    }
  });

  it('draws something for every letter and nothing for a space', () => {
    for (const ch of LETTERS) expect(FONT[ch].join('')).toContain('#');
    expect(FONT[' '].join('')).not.toContain('#');
  });

  it('gives every letter its own shape', () => {
    const shapes = new Set(LETTERS.map(ch => FONT[ch].join('')));
    expect(shapes.size).toBe(LETTERS.length);
  });

  it('lays cells out left to right with one empty column between letters', () => {
    const cells = textCells('IL', 10, 3);
    const iCells = cells.filter(c => c.x < 10 + LETTER_PITCH);
    const lCells = cells.filter(c => c.x >= 10 + LETTER_PITCH);
    expect(iCells).toHaveLength(13);
    expect(lCells).toHaveLength(9);
    expect(Math.min(...lCells.map(c => c.x))).toBe(10 + LETTER_PITCH);
    expect(Math.min(...cells.map(c => c.y))).toBe(3);
    expect(Math.max(...cells.map(c => c.y))).toBe(3 + GLYPH_SIZE - 1);
  });

  it('measures text width, with a narrower space', () => {
    expect(textWidth('A')).toBe(5);
    expect(textWidth('AB')).toBe(11);
    expect(textWidth('A B')).toBe(LETTER_PITCH + SPACE_PITCH + LETTER_PITCH - 1);
    expect(textWidth('')).toBe(0);
  });

  it('cleans names to uppercase letters and single spaces, at most 10 long', () => {
    expect(cleanName('maya')).toBe('MAYA');
    expect(cleanName('  Mary   Jane ')).toBe('MARY JANE');
    expect(cleanName('Ana-Lu')).toBe('ANA LU');
    expect(cleanName('Renée')).toBe('RENEE');
    expect(cleanName('x1y2')).toBe('X Y');
    expect(cleanName('ABCDEFGHIJKLMNOP')).toHaveLength(MAX_NAME);
    expect(cleanName('ABCDEFGHI JK')).toBe('ABCDEFGHI');
    expect(cleanName('!!!')).toBe('');
  });
});
