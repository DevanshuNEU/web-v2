/**
 * An on-device speed meter, off unless the address has `?perf`. It records
 * every rendered frame (the gap since the last one and how long drawing
 * took) in fixed ring buffers, and writes a one-line summary into a small
 * corner label twice a second, outside React, so measuring does not change
 * what it measures. `oc=1` brings back the old OffscreenCanvas sprite bake,
 * so the two can be compared on a real phone, and `q=1|2|3` forces the
 * camera's sub-pixels per art pixel (see render/pixel/camera.ts).
 */

export interface PerfFlags { meter: boolean; offscreen: boolean; /** Forced camera sub-pixels per art pixel (1 to 3), or null for the default. */ q: number | null }

export function perfFlags(search: string): PerfFlags {
  const q = new URLSearchParams(search);
  const sub = Number(q.get('q'));
  return { meter: q.has('perf'), offscreen: q.get('oc') === '1', q: sub === 1 || sub === 2 || sub === 3 ? sub : null };
}

let cached: PerfFlags | null = null;
/** The flags for this page load (all off on the server). */
export function pagePerf(): PerfFlags {
  if (!cached) cached = typeof location === 'undefined' ? { meter: false, offscreen: false, q: null } : perfFlags(location.search);
  return cached;
}

export interface FrameSummary {
  /** Frames per second over the window. */
  fps: number;
  /** 95th percentile gap between frames, ms. */
  p95: number;
  /** Frames that took longer than 20 ms. */
  slow: number;
  /** 95th percentile draw time, ms. */
  drawP95: number;
}

export class FrameMeter {
  private gaps: Float64Array;
  private draws: Float64Array;
  private sortA: Float64Array;
  private sortB: Float64Array;
  private n = 0;
  private i = 0;
  private last = -1;

  constructor(size = 120) {
    this.gaps = new Float64Array(size);
    this.draws = new Float64Array(size);
    this.sortA = new Float64Array(size);
    this.sortB = new Float64Array(size);
  }

  /** A frame rendered at `now` (ms) whose drawing took `drawMs`. */
  frame(now: number, drawMs: number) {
    if (this.last >= 0) {
      this.gaps[this.i] = now - this.last;
      this.draws[this.i] = drawMs;
      this.i = (this.i + 1) % this.gaps.length;
      if (this.n < this.gaps.length) this.n++;
    }
    this.last = now;
  }

  summary(): FrameSummary {
    const n = this.n;
    if (!n) return { fps: 0, p95: 0, slow: 0, drawP95: 0 };
    let sum = 0, slow = 0;
    for (let k = 0; k < n; k++) {
      const g = this.gaps[k];
      sum += g;
      if (g > 20) slow++;
      this.sortA[k] = g;
      this.sortB[k] = this.draws[k];
    }
    const a = this.sortA.subarray(0, n).sort();
    const b = this.sortB.subarray(0, n).sort();
    const at = Math.min(n - 1, Math.floor(n * 0.95));
    return { fps: (n * 1000) / sum, p95: a[at], slow, drawP95: b[at] };
  }
}

/** A corner label that shows the meter; returns a function to call each frame and one to remove it. */
export function mountMeter(host: HTMLElement, extra: () => string) {
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = 'position:absolute;left:4px;top:4px;z-index:60;pointer-events:none;font:10px/1.3 ui-monospace,monospace;color:#9ff;background:rgba(0,0,0,.7);padding:2px 4px;white-space:pre';
  host.appendChild(el);
  const meter = new FrameMeter(120);
  let lastWrite = 0;
  return {
    frame(now: number, drawMs: number) {
      meter.frame(now, drawMs);
      if (now - lastWrite < 500) return;
      lastWrite = now;
      const s = meter.summary();
      el.textContent = `${s.fps.toFixed(0)} fps  gap p95 ${s.p95.toFixed(1)}ms  slow ${s.slow}/120\ndraw p95 ${s.drawP95.toFixed(1)}ms  ${extra()}`;
    },
    remove() { el.remove(); },
  };
}
