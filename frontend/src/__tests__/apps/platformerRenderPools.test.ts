import { describe, it, expect } from 'vitest';
import { Rain, RAIN_CAP, SPLASH_CAP, Sparks, SPARK_CAP } from '@/components/apps/games/platformer/render/pixel/weather';

const seq = () => { let s = 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };

/** Weather and sparks are pooled: fixed arrays, filled once, never grown. */
describe('rain pool', () => {
  it('fills a big view only up to its cap', () => {
    const r = new Rain(seq());
    for (let i = 0; i < 200; i++) r.update(1 / 60, 2000, 1200, 0, 0, false, () => -1);
    expect(r.active).toBeLessThanOrEqual(RAIN_CAP);
    expect(r.streaks.length).toBe(RAIN_CAP);
  });

  it('a phone view gets a sensible amount of rain', () => {
    const r = new Rain(seq());
    r.update(1 / 60, 200, 260, 0, 0, false, () => -1);
    expect(r.active).toBeGreaterThan(30);
    expect(r.active).toBeLessThan(RAIN_CAP);
  });

  it('splashes on roofs, but never more than its cap', () => {
    const r = new Rain(seq());
    // a roof across the whole view at y = 100
    for (let i = 0; i < 600; i++) r.update(1 / 60, 400, 200, 0, 0, false, (_x, y) => (y >= 100 ? 100 : -1));
    expect(r.splashCount).toBeGreaterThan(0);
    expect(r.splashCount).toBeLessThanOrEqual(SPLASH_CAP);
    expect(r.splashes.length).toBe(SPLASH_CAP);
  });

  it('reduced motion: sparser and slower', () => {
    const a = new Rain(seq()), b = new Rain(seq());
    a.update(1 / 60, 300, 260, 0, 0, false, () => -1);
    b.update(1 / 60, 300, 260, 0, 0, true, () => -1);
    expect(b.active).toBeLessThan(a.active * 0.6);
    const speed = (r: Rain) => { let s = 0; for (let i = 0; i < r.active; i++) s += r.streaks[i].speed; return s / r.active; };
    expect(speed(b)).toBeLessThan(speed(a) * 0.7);
  });

  it('keeps the same streak objects frame to frame', () => {
    const r = new Rain(seq());
    r.update(1 / 60, 300, 260, 0, 0, false, () => -1);
    const first = r.streaks[0];
    for (let i = 0; i < 300; i++) r.update(1 / 60, 300, 260, 3, 0, false, (_x, y) => (y > 200 ? 200 : -1));
    expect(r.streaks[0]).toBe(first);
  });
});

describe('spark pool', () => {
  it('drops new sparks once full instead of growing', () => {
    const s = new Sparks(seq());
    for (let i = 0; i < 500; i++) s.emit(10, 10, 1, 1);
    expect(s.count).toBeLessThanOrEqual(SPARK_CAP);
    expect(s.items.length).toBe(SPARK_CAP);
  });

  it('sparks die out', () => {
    const s = new Sparks(seq());
    s.emit(10, 10, 1, 6);
    for (let i = 0; i < 120; i++) s.update(1 / 60);
    expect(s.count).toBe(0);
  });
});
