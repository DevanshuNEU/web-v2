/**
 * ascii — luminance-to-character mapping for ASCII-art rendering.
 *
 * Pure logic, deterministic, no DOM. A ramp is a string ordered from "lightest"
 * glyph to "darkest" (e.g. ' .:-=+*#%@'). Brighter luminance maps to characters
 * earlier in the ramp; darker luminance maps to later, denser glyphs. The React
 * wrapper downsamples an image/grid to a luminance grid and renders the result
 * as selectable monospace text.
 */

/** Default light→dark glyph ramp. Leading space is "paper", '@' is "full ink". */
export const DEFAULT_RAMP = ' .:-=+*#%@';

/**
 * lumToChar — map a 0..1 luminance to a ramp glyph.
 *
 * Monotonic: higher luminance never yields a denser glyph. Clamps at both ends
 * so out-of-range input lands on the first/last ramp character. An empty ramp
 * returns a space.
 */
export function lumToChar(lum: number, ramp: string = DEFAULT_RAMP): string {
  if (!ramp || ramp.length === 0) return ' ';
  const clamped = Math.max(0, Math.min(1, lum));
  const last = ramp.length - 1;
  // luminance 1 (bright) → index 0 (lightest glyph); 0 (dark) → last (densest).
  const idx = Math.round((1 - clamped) * last);
  const bounded = Math.max(0, Math.min(last, idx));
  return ramp.charAt(bounded);
}

/**
 * asciiFromGrid — convert a row-major luminance grid to ASCII rows.
 *
 * Returns one string per input row, each the same length as that row. Ramp is
 * configurable; defaults to DEFAULT_RAMP.
 */
export function asciiFromGrid(lumGrid: number[][], ramp: string = DEFAULT_RAMP): string[] {
  return lumGrid.map((row) => row.map((lum) => lumToChar(lum, ramp)).join(''));
}
