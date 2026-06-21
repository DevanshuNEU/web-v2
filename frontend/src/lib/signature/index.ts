/**
 * signature — barrel for the generative signature library (pure logic core).
 *
 * Re-exports the deterministic, DOM-free building blocks used by the React
 * wrappers in components/signature/. Keeping the logic here means it is
 * unit-testable in the node environment with no jsdom.
 */

export {
  getInk,
  parseRgbTriple,
  rgbString,
  type Ink,
  type RGB,
  type StyleSource,
} from './ink';

export { bayerMatrix, normalizedThreshold, ditherLuminance } from './bayer';

export { halftoneRadius, gridDims, type GridDims } from './halftone';

export { lumToChar, asciiFromGrid, DEFAULT_RAMP } from './ascii';

export {
  mulberry32,
  hatchFill,
  strokeSet,
  type PlotterPath,
  type Bounds,
} from './plotter';
