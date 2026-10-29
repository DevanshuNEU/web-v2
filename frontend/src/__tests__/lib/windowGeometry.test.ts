import { describe, it, expect } from 'vitest';
import { fitWindow, resizeBounds, DEFAULT_MIN_SIZE } from '@/lib/windowGeometry';

// Reference viewport: 1440x900 → desktop band top=28, bottom=840, bandH=812.
const VW = 1440;
const VH = 900;

describe('fitWindow', () => {
  it('keeps a size that fits and centers it in the desktop band', () => {
    expect(fitWindow({ width: 1040, height: 720 }, 'center', VW, VH)).toEqual({
      x: 200, y: 74, width: 1040, height: 720,
    });
  });

  it('shrinks a large window to the viewport minus the margin on a small screen', () => {
    // 1280x720: width cap 1280 - 48 = 1232, height cap 720 - 88 - 24 = 608.
    expect(fitWindow({ width: 1300, height: 720 }, 'center', 1280, 720)).toEqual({
      x: 24, y: 40, width: 1232, height: 608,
    });
  });

  it('pushes a fixed position back inside the band', () => {
    expect(fitWindow({ width: 800, height: 600 }, { x: 900, y: 400 }, VW, VH)).toEqual({
      x: 640, y: 240, width: 800, height: 600,
    });
    expect(fitWindow({ width: 800, height: 600 }, { x: -50, y: 0 }, VW, VH)).toMatchObject({ x: 0, y: 28 });
  });

  it('never opens below the minimum size', () => {
    expect(fitWindow({ width: 200, height: 100 }, { x: 0, y: 28 }, VW, VH)).toMatchObject({
      width: DEFAULT_MIN_SIZE.width, height: DEFAULT_MIN_SIZE.height,
    });
  });
});

describe('resizeBounds', () => {
  const start = { x: 200, y: 100, width: 800, height: 600 };

  it('grows from the bottom-right corner without moving the origin', () => {
    expect(resizeBounds(start, 'se', 100, 50, VW, VH)).toEqual({ x: 200, y: 100, width: 900, height: 650 });
  });

  it('moves the origin when dragging the left or top edge', () => {
    expect(resizeBounds(start, 'w', -100, 0, VW, VH)).toEqual({ x: 100, y: 100, width: 900, height: 600 });
    expect(resizeBounds(start, 'n', 0, 40, VW, VH)).toEqual({ x: 200, y: 140, width: 800, height: 560 });
  });

  it('stops at the minimum size and keeps the opposite edge fixed', () => {
    expect(resizeBounds(start, 'e', -2000, 0, VW, VH).width).toBe(DEFAULT_MIN_SIZE.width);
    const nw = resizeBounds(start, 'nw', 2000, 2000, VW, VH);
    expect(nw.width).toBe(DEFAULT_MIN_SIZE.width);
    expect(nw.height).toBe(DEFAULT_MIN_SIZE.height);
    expect(nw.x + nw.width).toBe(1000);
    expect(nw.y + nw.height).toBe(700);
  });

  it('honors a per-app minimum size', () => {
    expect(resizeBounds(start, 's', 0, -2000, VW, VH, { width: 420, height: 460 }).height).toBe(460);
  });

  it('clamps to the viewport edges, the menu bar and the dock', () => {
    expect(resizeBounds(start, 'e', 5000, 0, VW, VH).width).toBe(VW - 200);
    expect(resizeBounds(start, 'w', -5000, 0, VW, VH)).toMatchObject({ x: 0, width: 1000 });
    expect(resizeBounds(start, 'n', 0, -5000, VW, VH)).toMatchObject({ y: 28, height: 672 });
    expect(resizeBounds(start, 's', 0, 5000, VW, VH).height).toBe(VH - 60 - 100);
  });
});
