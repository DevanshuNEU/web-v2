/**
 * bayer — ordered-dithering matrices and luminance quantization.
 *
 * Pure logic, deterministic, no DOM. A Bayer matrix of order n is an n×n grid
 * whose values are a permutation of 0..n²-1; comparing a pixel's luminance
 * against the matrix value at its (x, y) position (tiled) produces the classic
 * crosshatch ordered-dither used by the Dither signature. We build higher
 * orders recursively from the canonical order-2 seed.
 */

/** The canonical order-2 Bayer seed. */
const BAYER_2: number[][] = [
  [0, 2],
  [3, 1],
];

/**
 * bayerMatrix — n×n ordered-dither matrix (n ∈ {2,4,8}).
 *
 * Built recursively: each level quadruples the previous matrix and offsets the
 * quadrants by 4·base so the result is a permutation of 0..n²-1. Deterministic.
 */
export function bayerMatrix(order: 2 | 4 | 8): number[][] {
  if (order === 2) return BAYER_2.map((row) => [...row]);
  const half = (order / 2) as 2 | 4;
  const base = bayerMatrix(half);
  const n = order;
  const out: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  // Quadrant multipliers, matching the standard recursive construction.
  const quad = [
    [0, 2],
    [3, 1],
  ];
  const h = half;
  for (let qy = 0; qy < 2; qy++) {
    for (let qx = 0; qx < 2; qx++) {
      const add = quad[qy][qx];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < h; x++) {
          out[qy * h + y][qx * h + x] = 4 * base[y][x] + add;
        }
      }
    }
  }
  return out;
}

/**
 * normalizedThreshold — matrix value at (x, y) mapped to the (0, 1) interval.
 *
 * Returns (value + 0.5) / n² so thresholds sit at cell centers and never hit
 * exactly 0 or 1, which keeps pure-black and pure-white pixels stable.
 */
export function normalizedThreshold(matrix: number[][], x: number, y: number): number {
  const n = matrix.length;
  const v = matrix[((y % n) + n) % n][((x % n) + n) % n];
  return (v + 0.5) / (n * n);
}

/**
 * ditherLuminance — quantize a 0..1 luminance to `levels` steps using ordered
 * dithering at (x, y). With levels=2 this is a pure black/white threshold;
 * higher levels give intermediate gray steps.
 *
 * Monotonic in `lum` (brighter input never produces a darker output) and fully
 * deterministic. Returns a value in 0..1.
 */
export function ditherLuminance(
  lum: number,
  x: number,
  y: number,
  matrix: number[][],
  levels = 2,
): number {
  const L = Math.max(2, Math.floor(levels));
  const clamped = Math.max(0, Math.min(1, lum));
  const t = normalizedThreshold(matrix, x, y);
  // Scale into (L-1) bands, add the dither threshold, then floor to a step.
  const scaled = clamped * (L - 1);
  const step = Math.floor(scaled + t);
  const bounded = Math.max(0, Math.min(L - 1, step));
  return bounded / (L - 1);
}
