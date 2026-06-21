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

import type { Transition, Variants } from 'framer-motion';

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
  /** Magnetic hover pull + settle on flat buttons. */
  magnetic: { type: 'spring', damping: 15, stiffness: 260, mass: 0.3 },
  /** Shared pointer-parallax depth drift (calmer than cursor). */
  parallax: { damping: 30, stiffness: 350, mass: 0.5 },
  /** Assistant orb / panel entrance. */
  bubble: { type: 'spring', damping: 18, stiffness: 240, mass: 0.7 },
} satisfies Record<string, Transition>;

/** Collapses any animation to no perceptible motion (reduced-motion path). */
export const INSTANT: Transition = { duration: 0 };

/** Pick a transition based on the reduced-motion flag. */
export function withReduced(t: Transition, reduced: boolean | null): Transition {
  return reduced ? INSTANT : t;
}

// ---------------------------------------------------------------------------
// Premium-restrained interaction tokens (Linear/Kowalski register).
// All consumers gate on useReducedMotion() AND a fine pointer.
// ---------------------------------------------------------------------------

/** Max px a magnetic element translates toward the cursor. Deliberately small. */
export const MAGNETIC_MAX = 6;
/** Fraction of the cursor offset applied (mirrors the cursor ring's 0.35). */
export const MAGNETIC_PULL = 0.3;

/** Base px drift of the deepest parallax layer (wallpaper). */
export const PARALLAX_BASE = 20;
/**
 * Parallax depth factors. Lower = closer to the viewer = drifts LESS, giving
 * a subtle sense of 3D depth on pointer move. Wallpaper drifts most.
 */
export const PARALLAX_DEPTH = {
  wallpaper: 1.0,
  mid: 0.35,
  foreground: 0.12,
} as const;

/**
 * Shared staggered-reveal variants. The container orchestrates; each item
 * fades/rises in. Pass the reduced-motion flag so both collapse to instant.
 */
export const reveal = {
  container: (reduced: boolean | null): Variants => ({
    hidden: {},
    show: {
      transition: reduced
        ? { staggerChildren: 0 }
        : { staggerChildren: 0.04, delayChildren: 0.04 },
    },
  }),
  item: (reduced: boolean | null): Variants =>
    reduced
      ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
      : {
          // Full `transform` strings (not framer's y/scale shorthands) so the
          // shell-wide mount reveal composites on the GPU and stays smooth even
          // when the window is mid-mount and the main thread is busy.
          hidden: { opacity: 0, transform: 'translateY(8px) scale(0.97)' },
          show: {
            opacity: 1,
            transform: 'translateY(0px) scale(1)',
            transition: spring.window,
          },
        },
};
