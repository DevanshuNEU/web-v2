'use client';

/**
 * ParallaxProvider — one pointer source for the whole desktop's depth drift.
 *
 * Owns a SINGLE passive `pointermove` listener and exposes two normalized
 * MotionValues — nx, ny in roughly [-0.5, 0.5] (clientX/innerWidth - 0.5). Depth
 * consumers (wallpaper, desktop icons) read these via `useParallaxDepth(depth)`
 * and scale them by PARALLAX_BASE * depth, so adding a new parallax plane never
 * adds another global listener.
 *
 * Gating: under reduced motion OR a coarse/touch pointer the listener is never
 * attached, so nx/ny stay at 0 and every downstream spring rests at 0. Both the
 * provider and the consumer hook therefore no-op without any per-component
 * branching.
 */

import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useMotionValue, useReducedMotion, type MotionValue } from 'framer-motion';

interface ParallaxContextValue {
  /** Normalized pointer X offset from viewport center, ~[-0.5, 0.5]. */
  nx: MotionValue<number>;
  /** Normalized pointer Y offset from viewport center, ~[-0.5, 0.5]. */
  ny: MotionValue<number>;
}

const ParallaxContext = createContext<ParallaxContextValue | null>(null);

export function ParallaxProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const nx = useMotionValue(0);
  const ny = useMotionValue(0);

  useEffect(() => {
    // No-op under reduced motion or coarse/touch pointers: sources stay 0, so
    // every useParallaxDepth spring rests at 0.
    if (reduced) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const onMove = (e: PointerEvent) => {
      nx.set(e.clientX / window.innerWidth - 0.5);
      ny.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduced, nx, ny]);

  const value = useMemo(() => ({ nx, ny }), [nx, ny]);

  return <ParallaxContext.Provider value={value}>{children}</ParallaxContext.Provider>;
}

/** Read the shared normalized pointer MotionValues. Returns null outside a provider. */
export function useParallaxContext(): ParallaxContextValue | null {
  return useContext(ParallaxContext);
}
