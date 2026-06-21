import { describe, it, expect } from 'vitest';
import { mulberry32, hatchFill, strokeSet, type Bounds } from '@/lib/signature/plotter';

const BOUNDS: Bounds = { x: 0, y: 0, width: 100, height: 100 };

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it('produces values in [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('diverges for different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('hatchFill', () => {
  it('is identical for the same seed', () => {
    expect(hatchFill(5, BOUNDS, 0.5)).toEqual(hatchFill(5, BOUNDS, 0.5));
  });

  it('differs for different seeds', () => {
    expect(hatchFill(5, BOUNDS, 0.5)).not.toEqual(hatchFill(6, BOUNDS, 0.5));
  });

  it('returns at least one path with a valid d string', () => {
    const paths = hatchFill(1, BOUNDS, 0.5);
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) expect(p.d).toMatch(/^M [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+$/);
  });

  it('produces more lines at higher density', () => {
    const sparse = hatchFill(1, BOUNDS, 0.1).length;
    const dense = hatchFill(1, BOUNDS, 0.9).length;
    expect(dense).toBeGreaterThan(sparse);
  });
});

describe('strokeSet', () => {
  it('is identical for the same seed', () => {
    expect(strokeSet(9, 6)).toEqual(strokeSet(9, 6));
  });

  it('differs for different seeds', () => {
    expect(strokeSet(9, 6)).not.toEqual(strokeSet(10, 6));
  });

  it('returns exactly `count` paths', () => {
    expect(strokeSet(3, 4)).toHaveLength(4);
    expect(strokeSet(3, 0)).toHaveLength(0);
  });

  it('each path begins with a moveto and contains linetos', () => {
    for (const p of strokeSet(2, 5)) {
      expect(p.d.startsWith('M ')).toBe(true);
      expect(p.d).toContain(' L ');
    }
  });
});
