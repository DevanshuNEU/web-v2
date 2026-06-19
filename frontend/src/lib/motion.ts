/**
 * Central motion tokens for the OS shell.
 *
 * One source of truth for the spring/easing values that were previously
 * inlined across Window, Taskbar, and DesktopIcons. Keeping them here means
 * the whole shell shares a consistent physical feel and the reduced-motion
 * fallback is defined once.
 *
 * Components read `useReducedMotion()` from framer-motion directly and swap to
 * `INSTANT` (or skip the effect entirely, e.g. canvas rAF loops) when the user
 * has "Reduce Motion" enabled at the OS level.
 */

import type { Transition } from 'framer-motion';

/** Spring presets, reused verbatim from the original inlined values. */
export const spring = {
  /** Window open / position / focus motion. */
  window: { type: 'spring', damping: 20, stiffness: 120, mass: 0.8 },
  /** Window layout (resize / maximize) motion. */
  windowLayout: { type: 'spring', damping: 22, stiffness: 140, mass: 0.9 },
  /** Dock magnification smoothing. */
  dock: { damping: 18, stiffness: 220, mass: 0.6 },
  /** Desktop-icon 3D tilt smoothing. */
  tilt: { stiffness: 300, damping: 25, mass: 0.5 },
  /** Genie minimize / restore toward the dock icon. */
  genie: { type: 'spring', damping: 26, stiffness: 210, mass: 0.9 },
  /** Custom cursor follow. */
  cursor: { damping: 28, stiffness: 420, mass: 0.4 },
} satisfies Record<string, Transition>;

/** Collapses any animation to no perceptible motion (reduced-motion path). */
export const INSTANT: Transition = { duration: 0 };

/** Pick a transition based on the reduced-motion flag. */
export function withReduced(t: Transition, reduced: boolean | null): Transition {
  return reduced ? INSTANT : t;
}
