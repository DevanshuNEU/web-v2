import { describe, it, expect } from 'vitest';
import { lumToChar, asciiFromGrid, DEFAULT_RAMP } from '@/lib/signature/ascii';

describe('lumToChar', () => {
  it('maps brightest luminance to the first (lightest) ramp glyph', () => {
    expect(lumToChar(1, DEFAULT_RAMP)).toBe(DEFAULT_RAMP[0]);
  });

  it('maps darkest luminance to the last (densest) ramp glyph', () => {
    expect(lumToChar(0, DEFAULT_RAMP)).toBe(DEFAULT_RAMP[DEFAULT_RAMP.length - 1]);
  });

  it('clamps out-of-range input to the ramp ends', () => {
    expect(lumToChar(5, DEFAULT_RAMP)).toBe(DEFAULT_RAMP[0]);
    expect(lumToChar(-5, DEFAULT_RAMP)).toBe(DEFAULT_RAMP[DEFAULT_RAMP.length - 1]);
  });

  it('is monotonic: darker never yields a lighter glyph index', () => {
    let prevIdx = -1;
    for (let l = 1; l >= -0.0001; l -= 0.05) {
      const ch = lumToChar(Math.max(0, l), DEFAULT_RAMP);
      const idx = DEFAULT_RAMP.indexOf(ch);
      expect(idx).toBeGreaterThanOrEqual(prevIdx);
      prevIdx = idx;
    }
  });

  it('respects a custom ramp', () => {
    const ramp = 'ab';
    expect(lumToChar(1, ramp)).toBe('a');
    expect(lumToChar(0, ramp)).toBe('b');
  });

  it('returns a space for an empty ramp', () => {
    expect(lumToChar(0.5, '')).toBe(' ');
  });
});

describe('asciiFromGrid', () => {
  it('returns one string per row, each matching its row length', () => {
    const grid = [
      [0, 0.5, 1],
      [1, 0.25, 0],
    ];
    const rows = asciiFromGrid(grid, DEFAULT_RAMP);
    expect(rows.length).toBe(2);
    expect(rows[0].length).toBe(3);
    expect(rows[1].length).toBe(3);
  });

  it('uses the configured ramp', () => {
    const rows = asciiFromGrid([[0, 1]], 'ab');
    expect(rows[0]).toBe('ba');
  });

  it('handles an empty grid', () => {
    expect(asciiFromGrid([], DEFAULT_RAMP)).toEqual([]);
  });
});
