import { describe, it, expect } from 'vitest';
import { computeSnap } from '@/lib/windowSnap';

// Reference viewport: 1000x800 → usable band top=28, bottom=740, usableH=712,
// halfW=500, halfH=356.
const VW = 1000;
const VH = 800;

describe('computeSnap', () => {
  it('returns null in the center (no snap)', () => {
    expect(computeSnap(500, 400, VW, VH)).toBeNull();
  });

  it('snaps to the left half at the left edge', () => {
    expect(computeSnap(4, 400, VW, VH)).toEqual({ x: 0, y: 28, width: 500, height: 712 });
  });

  it('snaps to the right half at the right edge', () => {
    expect(computeSnap(998, 400, VW, VH)).toEqual({ x: 500, y: 28, width: 500, height: 712 });
  });

  it('fills the usable band at the top edge', () => {
    expect(computeSnap(500, 30, VW, VH)).toEqual({ x: 0, y: 28, width: 1000, height: 712 });
  });

  it('snaps to the top-left quarter in the top-left corner', () => {
    expect(computeSnap(4, 30, VW, VH)).toEqual({ x: 0, y: 28, width: 500, height: 356 });
  });

  it('snaps to the bottom-right quarter in the bottom-right corner', () => {
    expect(computeSnap(998, 730, VW, VH)).toEqual({ x: 500, y: 384, width: 500, height: 356 });
  });
});
