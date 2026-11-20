/**
 * Which shell a visitor gets: the iOS-style phone shell or the macOS desktop.
 *
 * Narrow windows (under 768px, Tailwind's `md`) get the phone shell, as
 * before. A touch-first device whose short side is under 500px is a phone
 * whatever way it is held, so a phone turned sideways (844 by 390) keeps the
 * phone shell instead of swapping to the desktop and losing every open app.
 * Tablets and laptops, touch screens included, keep the desktop.
 */
export const MOBILE_BREAKPOINT = 768;
export const PHONE_SHORT_SIDE = 500;

export function prefersPhoneShell({ width, height, coarse }: { width: number; height: number; coarse: boolean }): boolean {
  if (width < MOBILE_BREAKPOINT) return true;
  return coarse && Math.min(width, height) < PHONE_SHORT_SIDE;
}

/** Read the live viewport. Primary pointer coarse = a finger, not a mouse. */
export function currentPrefersPhoneShell(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return prefersPhoneShell({ width: window.innerWidth, height: window.innerHeight, coarse });
}
