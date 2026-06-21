import { describe, it, expect } from 'vitest';
import { halftoneRadius, gridDims } from '@/lib/signature/halftone';

describe('halftoneRadius', () => {
  it('is monotonically non-increasing in luminance (dark-on-light)', () => {
    let prev = Infinity;
    for (let l = 0; l <= 1.0001; l += 0.05) {
      const r = halftoneRadius(Math.min(1, l), 6, 3);
      expect(r).toBeLessThanOrEqual(prev + 1e-9);
      prev = r;
    }
  });

  it('is full radius at black and zero at white', () => {
    expect(halftoneRadius(0, 6, 3)).toBeCloseTo(3, 5);
    expect(halftoneRadius(1, 6, 3)).toBe(0);
  });

  it('is bounded by maxRadius (and never negative)', () => {
    for (let l = -0.5; l <= 1.5; l += 0.1) {
      const r = halftoneRadius(l, 8, 4);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(4);
    }
  });

  it('clamps maxRadius to the cell size', () => {
    // maxRadius larger than cell is capped at cell.
    expect(halftoneRadius(0, 5, 50)).toBeCloseTo(5, 5);
  });
});

describe('gridDims', () => {
  it('cols = ceil(w/cell), rows = ceil(h/cell)', () => {
    const d = gridDims(100, 50, 6);
    expect(d.cols).toBe(Math.ceil(100 / 6));
    expect(d.rows).toBe(Math.ceil(50 / 6));
    expect(d.count).toBe(d.cols * d.rows);
  });

  it('handles exact divisions', () => {
    const d = gridDims(60, 30, 6);
    expect(d.cols).toBe(10);
    expect(d.rows).toBe(5);
    expect(d.count).toBe(50);
  });

  it('guards against non-positive cell sizes', () => {
    const d = gridDims(10, 10, 0);
    expect(d.cols).toBe(10);
    expect(d.rows).toBe(10);
  });
});
