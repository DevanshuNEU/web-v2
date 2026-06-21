/**
 * plotter — deterministic pen-plotter path generators.
 *
 * Pure logic, no DOM. These produce SVG path strings ("d" attributes) that read
 * like a single-color pen plotter drew them: hatch fills and stroke sets. All
 * randomness is seeded via a small mulberry32 PRNG so the same seed always
 * yields identical paths, which keeps SSR and client renders in lockstep and
 * makes the output unit-testable. The React wrapper renders these as <path>
 * elements stroked in the active ink color.
 */

export interface PlotterPath {
  /** SVG path data for the `d` attribute. */
  d: string;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * mulberry32 — tiny, fast, deterministic PRNG.
 *
 * Returns a function producing floats in [0, 1) seeded by `seed`. Identical
 * seeds yield identical sequences across runs and machines.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * hatchFill — seeded diagonal hatch lines filling `bounds`.
 *
 * `density` (0..1) controls line spacing: higher = more lines. Each line gets a
 * small seeded jitter on its endpoints so the fill reads hand-plotted rather
 * than mechanical. Returns one PlotterPath per line. Deterministic per seed.
 */
export function hatchFill(seed: number, bounds: Bounds, density = 0.5): PlotterPath[] {
  const rand = mulberry32(seed);
  const d = Math.max(0.02, Math.min(1, density));
  const { x, y, width, height } = bounds;
  // Spacing shrinks as density grows; span the diagonal sweep across w + h.
  const span = width + height;
  const spacing = Math.max(2, (1 - d) * 40 + 4);
  const lines = Math.max(1, Math.floor(span / spacing));
  const paths: PlotterPath[] = [];
  for (let i = 0; i < lines; i++) {
    const offset = (i + 1) * spacing;
    const jitter = (rand() - 0.5) * spacing * 0.4;
    // 45° hatch: a line of constant (x+y) = offset, clipped to the box.
    const o = offset + jitter;
    // Intersections of x + y = o with the box edges.
    const p1x = Math.max(x, x + o - height);
    const p1y = p1x === x ? y + o : y + height;
    const p2y = Math.max(y, y + o - width);
    const p2x = p2y === y ? x + o : x + width;
    const ax = Math.max(x, Math.min(x + width, p1x));
    const ay = Math.max(y, Math.min(y + height, p1y));
    const bx = Math.max(x, Math.min(x + width, p2x));
    const by = Math.max(y, Math.min(y + height, p2y));
    paths.push({ d: `M ${round(ax)} ${round(ay)} L ${round(bx)} ${round(by)}` });
  }
  return paths;
}

/**
 * strokeSet — `count` seeded freeform polyline strokes in a unit-ish space.
 *
 * Each stroke is a short multi-segment path within a 0..100 viewBox, useful as
 * an abstract plotter "signature" mark. Deterministic per seed.
 */
export function strokeSet(seed: number, count = 6): PlotterPath[] {
  const rand = mulberry32(seed);
  const n = Math.max(0, Math.floor(count));
  const paths: PlotterPath[] = [];
  for (let i = 0; i < n; i++) {
    const segments = 3 + Math.floor(rand() * 4);
    let px = rand() * 100;
    let py = rand() * 100;
    let d = `M ${round(px)} ${round(py)}`;
    for (let s = 0; s < segments; s++) {
      px = Math.max(0, Math.min(100, px + (rand() - 0.5) * 40));
      py = Math.max(0, Math.min(100, py + (rand() - 0.5) * 40));
      d += ` L ${round(px)} ${round(py)}`;
    }
    paths.push({ d });
  }
  return paths;
}
