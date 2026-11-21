import { describe, it, expect } from 'vitest';
import { blitOrigin, pixelScale, renderCam, viewMetrics } from '@/components/apps/games/platformer/render/pixel/camera';

/**
 * The world is drawn into a low-res buffer at 16 px per tile with the camera
 * snapped to whole buffer pixels; the fraction left over is applied when the
 * buffer is blitted, in whole device pixels. These tests pin that maths.
 */
describe('pixel camera: integer scale', () => {
  it('a portrait phone at DPR 3 gets about 13 columns', () => {
    const m = viewMetrics(390, 520, 3);
    expect(Number.isInteger(m.k)).toBe(true);
    expect(m.cols).toBeGreaterThan(11.5);
    expect(m.cols).toBeLessThan(15);
  });

  it('a landscape phone at DPR 3 gets about 13 rows', () => {
    const m = viewMetrics(844, 390, 3);
    expect(m.rows).toBeGreaterThan(11.5);
    expect(m.rows).toBeLessThan(15);
    expect(m.cols).toBeGreaterThan(24);
  });

  it('the scale is a whole number of device pixels, never below 1', () => {
    for (const [w, h, d] of [[390, 520, 3], [844, 390, 3], [1280, 800, 1], [100, 60, 1], [390, 844, 2.625]] as const) {
      const k = pixelScale(w, h, d);
      expect(Number.isInteger(k)).toBe(true);
      expect(k).toBeGreaterThanOrEqual(1);
    }
  });

  it('a tile in CSS pixels is 16 art pixels times the scale over the DPR', () => {
    const m = viewMetrics(390, 520, 3);
    expect(m.tileCss).toBeCloseTo((16 * m.k) / 3);
    expect(m.cols).toBeCloseTo(390 / m.tileCss);
    expect(m.rows).toBeCloseTo(520 / m.tileCss);
  });

  it('the buffer covers the screen plus one pixel for the sub-pixel shift', () => {
    const m = viewMetrics(390, 520, 3);
    expect(m.bw * m.k).toBeGreaterThanOrEqual(390 * 3 + m.k);
    expect(m.bh * m.k).toBeGreaterThanOrEqual(520 * 3 + m.k);
    expect((m.bw - 2) * m.k).toBeLessThan(390 * 3);
  });
});

describe('pixel camera: snap and sub-pixel offset', () => {
  it('splits a camera position into a whole buffer origin and a device pixel offset', () => {
    const o = { origin: 0, offset: 0 };
    blitOrigin(o, 100.4, 5);
    expect(o.origin).toBe(100);
    expect(o.offset).toBe(-2);
    blitOrigin(o, -3.25, 4);
    expect(o.origin).toBe(-4);
    expect(o.offset).toBe(-3);
  });

  it('a slow pan moves the world one device pixel at a time, never backwards', () => {
    // A fixed world pixel at x = 50, camera panning right by 0.03 art px per frame.
    const k = 5;
    const o = { origin: 0, offset: 0 };
    let prev = Infinity;
    for (let i = 0; i < 200; i++) {
      const cam = 10 + i * 0.03;
      blitOrigin(o, renderCam(cam, 30, 0), k);
      const screen = (50 - o.origin) * k + o.offset;
      expect(screen).toBeLessThanOrEqual(prev);
      expect(prev - screen === Infinity || prev - screen <= 1).toBe(true);
      // and it is where the exact maths puts it, within one device pixel
      expect(Math.abs(screen - (50 - cam) * k)).toBeLessThanOrEqual(0.5 + 1e-9);
      prev = screen;
    }
  });

  it('locked to a moving hero, the hero holds still on screen though it is drawn at whole pixels', () => {
    const k = 5;
    const o = { origin: 0, offset: 0 };
    const seen = new Set<number>();
    for (let i = 0; i < 300; i++) {
      const hero = 100 + i * 2.27; // art px, running
      const cam = hero - 61.37; // camera following at a fixed distance
      blitOrigin(o, renderCam(cam, hero, 1), k);
      const drawnAt = Math.round(hero) - o.origin; // whole buffer pixel
      seen.add(drawnAt * k + o.offset);
    }
    expect(seen.size).toBe(1);
  });

  it('the lock never moves the camera more than half an art pixel', () => {
    for (let i = 0; i < 100; i++) {
      const cam = i * 0.77, hero = cam + 40 + i * 0.13;
      for (const lock of [0, 0.5, 1]) expect(Math.abs(renderCam(cam, hero, lock) - cam)).toBeLessThanOrEqual(0.5 * lock + 1e-9);
    }
  });
});
