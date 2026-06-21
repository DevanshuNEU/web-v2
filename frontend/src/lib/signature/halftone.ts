/**
 * halftone — newsprint-style dot geometry.
 *
 * Pure logic, deterministic, no DOM. A halftone reproduces tone by varying dot
 * size on a fixed grid: dark regions get big ink dots, light regions get tiny
 * ones (dark-on-light). `halftoneRadius` maps a cell's luminance to a dot
 * radius; `gridDims` reports how many cells tile a w×h area at a given cell
 * size. The React wrapper feeds these into a canvas.
 */

/**
 * halftoneRadius — dot radius for a cell of the given luminance.
 *
 * Dark-on-light: luminance 0 (black) → full `maxRadius`, luminance 1 (white) →
 * 0. Monotonically decreasing in luminance and bounded to [0, maxRadius]. The
 * area (not the radius) scales with darkness via a sqrt curve so perceived tone
 * tracks coverage, which reads more evenly to the eye.
 *
 * `cell` is accepted so callers can default maxRadius to cell/2 upstream; it is
 * not used directly here beyond clamping maxRadius to a sane ceiling.
 */
export function halftoneRadius(lum: number, cell: number, maxRadius: number): number {
  const clamped = Math.max(0, Math.min(1, lum));
  const ceiling = Math.max(0, Math.min(maxRadius, cell));
  // Ink coverage ∝ darkness; radius ∝ sqrt(coverage) so area is linear in tone.
  const darkness = 1 - clamped;
  const r = Math.sqrt(darkness) * ceiling;
  return Math.max(0, Math.min(ceiling, r));
}

export interface GridDims {
  cols: number;
  rows: number;
  /** cols * rows convenience total. */
  count: number;
}

/**
 * gridDims — number of cells covering a w×h area at `cell` px spacing.
 *
 * cols = ceil(w / cell), rows = ceil(h / cell). Guards against non-positive
 * cell sizes by treating them as 1.
 */
export function gridDims(w: number, h: number, cell: number): GridDims {
  const c = cell > 0 ? cell : 1;
  const cols = Math.max(0, Math.ceil(Math.max(0, w) / c));
  const rows = Math.max(0, Math.ceil(Math.max(0, h) / c));
  return { cols, rows, count: cols * rows };
}
