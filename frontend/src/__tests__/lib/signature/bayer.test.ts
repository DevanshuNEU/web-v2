import { describe, it, expect } from 'vitest';
import { bayerMatrix, normalizedThreshold, ditherLuminance } from '@/lib/signature/bayer';

describe('bayerMatrix', () => {
  for (const order of [2, 4, 8] as const) {
    it(`order ${order} is ${order}x${order}`, () => {
      const m = bayerMatrix(order);
      expect(m.length).toBe(order);
      for (const row of m) expect(row.length).toBe(order);
    });

    it(`order ${order} values are a permutation of 0..${order * order - 1}`, () => {
      const m = bayerMatrix(order);
      const flat = m.flat().sort((a, b) => a - b);
      const expected = Array.from({ length: order * order }, (_, i) => i);
      expect(flat).toEqual(expected);
    });
  }

  it('is deterministic across calls', () => {
    expect(bayerMatrix(4)).toEqual(bayerMatrix(4));
  });
});

describe('normalizedThreshold', () => {
  it('returns values strictly inside (0, 1)', () => {
    const m = bayerMatrix(4);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const t = normalizedThreshold(m, x, y);
        expect(t).toBeGreaterThan(0);
        expect(t).toBeLessThan(1);
      }
    }
  });

  it('tiles by wrapping coordinates', () => {
    const m = bayerMatrix(2);
    expect(normalizedThreshold(m, 0, 0)).toBe(normalizedThreshold(m, 2, 2));
    expect(normalizedThreshold(m, 1, 0)).toBe(normalizedThreshold(m, 3, 2));
  });
});

describe('ditherLuminance', () => {
  const m = bayerMatrix(4);

  it('is deterministic for the same inputs', () => {
    expect(ditherLuminance(0.5, 1, 2, m, 2)).toBe(ditherLuminance(0.5, 1, 2, m, 2));
  });

  it('returns pure paper (0) for black and pure ink (1) for white at levels=2', () => {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(ditherLuminance(0, x, y, m, 2)).toBe(0);
        expect(ditherLuminance(1, x, y, m, 2)).toBe(1);
      }
    }
  });

  it('is monotonic non-decreasing in luminance at a fixed cell', () => {
    let prev = -Infinity;
    for (let l = 0; l <= 1.0001; l += 0.05) {
      const out = ditherLuminance(Math.min(1, l), 2, 3, m, 2);
      expect(out).toBeGreaterThanOrEqual(prev);
      prev = out;
    }
  });

  it('produces intermediate steps when levels > 2', () => {
    const seen = new Set<number>();
    for (let l = 0; l <= 1.0001; l += 0.02) {
      for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
          seen.add(ditherLuminance(Math.min(1, l), x, y, m, 4));
        }
      }
    }
    // 4 levels → values from {0, 1/3, 2/3, 1}.
    expect(seen.size).toBeGreaterThan(2);
    for (const v of seen) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
