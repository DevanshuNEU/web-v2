// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from 'vitest';
import { stubCanvas } from '../setup/canvas';
import { FrameMeter, perfFlags } from '@/components/apps/games/platformer/ui/perf';
import { bakeGrid } from '@/components/apps/games/platformer/render/bake';

afterEach(() => { vi.unstubAllGlobals(); });

describe('perf flags from the address', () => {
  it('are all off by default', () => {
    expect(perfFlags('')).toEqual({ meter: false, offscreen: false, q: null });
  });
  it('turn on the meter with ?perf and the old OffscreenCanvas bake with oc=1', () => {
    expect(perfFlags('?perf')).toEqual({ meter: true, offscreen: false, q: null });
    expect(perfFlags('?perf&oc=1')).toEqual({ meter: true, offscreen: true, q: null });
  });
  it('q=1, 2 or 3 forces the camera sub-pixels (anything else is ignored)', () => {
    expect(perfFlags('?q=1').q).toBe(1);
    expect(perfFlags('?q=3').q).toBe(3);
    expect(perfFlags('?q=7').q).toBeNull();
  });
});

describe('FrameMeter', () => {
  it('reports fps, the slow frame tail and draw time from recorded frames', () => {
    const m = new FrameMeter(120);
    let t = 0;
    // 57 smooth frames and 3 long ones in about a second
    for (let i = 0; i < 60; i++) { t += i % 20 === 19 ? 50 : 16.7; m.frame(t, 2); }
    const s = m.summary();
    expect(s.fps).toBeGreaterThan(45);
    expect(s.fps).toBeLessThan(60);
    expect(s.slow).toBe(3);
    expect(s.p95).toBeGreaterThan(40);
    expect(s.drawP95).toBe(2);
  });
  it('allocates nothing per frame: the ring buffer wraps', () => {
    const m = new FrameMeter(8);
    for (let i = 1; i <= 100; i++) m.frame(i * 16.7, 1);
    expect(m.summary().fps).toBeCloseTo(60, 0);
  });
});

describe('sprite bake canvas', () => {
  it('bakes onto a detached <canvas> when there is a document, even where OffscreenCanvas exists', () => {
    stubCanvas();
    class FakeOffscreen { width: number; height: number; constructor(w: number, h: number) { this.width = w; this.height = h; } getContext() { return {}; } }
    vi.stubGlobal('OffscreenCanvas', FakeOffscreen);
    const c = bakeGrid(['ab', 'ba'], { a: '#ff0000', b: '#00ff00' });
    expect(c).toBeInstanceOf(HTMLCanvasElement);
  });
});
