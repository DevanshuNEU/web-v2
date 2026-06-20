'use client';

/**
 * useMagneticField — one global driver for "magnetic" flat buttons.
 *
 * Mount once (in Desktop). It attaches a single set of passive pointer listeners
 * and, while the cursor is over an element matching `[data-magnetic="button"]`,
 * nudges that element toward the cursor: offset = (cursor - center) * MAGNETIC_PULL,
 * clamped to ±MAGNETIC_MAX. The offset is written as CSS vars --mag-x / --mag-y on
 * the element; the actual translate + settle is done by the CSS rule in globals.css
 * (transform + transition), which approximates spring.magnetic's feel without a
 * per-element React spring.
 *
 * Scope note: the selector is `[data-magnetic="button"]`, NOT bare `[data-magnetic]`.
 * Dock app icons carry bare `data-magnetic` purely for the cursor-ring snap and run
 * their own magnification scale transform — translating them here would fight that.
 * Flat buttons opt in explicitly with the ="button" value.
 *
 * Gating: no-op entirely under reduced motion OR a coarse/touch pointer (listeners
 * never attach), so the CSS vars stay unset and the transform resolves to the
 * `translate(0px, 0px)` fallback.
 */

import { useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { MAGNETIC_MAX, MAGNETIC_PULL } from '@/lib/motion';

const MAGNETIC_SELECTOR = '[data-magnetic="button"]';

function clamp(v: number, max: number): number {
  return Math.max(-max, Math.min(max, v));
}

export function useMagneticField() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    let active: HTMLElement | null = null;

    const reset = (el: HTMLElement | null) => {
      if (!el) return;
      el.style.setProperty('--mag-x', '0px');
      el.style.setProperty('--mag-y', '0px');
    };

    const move = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest(
        MAGNETIC_SELECTOR
      ) as HTMLElement | null;

      // Left the previously magnetized element — settle it back to rest.
      if (active && active !== target) {
        reset(active);
        active = null;
      }
      if (!target) return;

      const r = target.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = clamp((e.clientX - cx) * MAGNETIC_PULL, MAGNETIC_MAX);
      const dy = clamp((e.clientY - cy) * MAGNETIC_PULL, MAGNETIC_MAX);

      target.style.setProperty('--mag-x', `${dx.toFixed(2)}px`);
      target.style.setProperty('--mag-y', `${dy.toFixed(2)}px`);
      active = target;
    };

    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      reset(active);
    };
  }, [reduced]);
}
