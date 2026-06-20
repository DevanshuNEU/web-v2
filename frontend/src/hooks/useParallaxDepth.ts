'use client';

/**
 * useParallaxDepth — turn the shared normalized pointer offset into a
 * spring-smoothed {x, y} drift for one depth plane.
 *
 * Reads nx/ny from ParallaxProvider, multiplies by PARALLAX_BASE * depth (lower
 * depth = closer to the viewer = less drift), and springs via spring.parallax.
 * Because the source values rest at 0 under reduced motion / coarse pointer (the
 * provider never attaches its listener there), the returned springs also rest at
 * 0 with no extra gating here. Transform-only output, safe on any element.
 */

import { useTransform, useSpring, useMotionValue, type MotionValue } from 'framer-motion';
import { PARALLAX_BASE, spring } from '@/lib/motion';
import { useParallaxContext } from '@/components/os/ParallaxProvider';

interface ParallaxDrift {
  x: MotionValue<number>;
  y: MotionValue<number>;
}

export function useParallaxDepth(depth: number): ParallaxDrift {
  const ctx = useParallaxContext();
  // Fallback statics so the hook is safe outside a provider (springs rest at 0).
  const fallbackX = useMotionValue(0);
  const fallbackY = useMotionValue(0);
  const nx = ctx?.nx ?? fallbackX;
  const ny = ctx?.ny ?? fallbackY;

  const drift = PARALLAX_BASE * depth;
  const targetX = useTransform(nx, (v) => v * drift);
  const targetY = useTransform(ny, (v) => v * drift);

  const x = useSpring(targetX, spring.parallax);
  const y = useSpring(targetY, spring.parallax);

  return { x, y };
}
