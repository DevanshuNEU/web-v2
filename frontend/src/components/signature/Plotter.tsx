'use client';

/**
 * Plotter — SVG pen-plotter line art in the active ink color.
 *
 * Renders deterministic single-color line work: either explicit `paths`, or a
 * seeded `generator(seed)` (e.g. hatchFill / strokeSet from the signature lib).
 * Strokes use `rgb(var(--color-text))` so they track the theme ink with zero
 * JS, fill is none, and rendering is geometricPrecision for crisp lines.
 *
 * Mono hard-gate: in the 'color' (Fun) palette this renders nothing (null) —
 * the plotter aesthetic is reserved for the mono brand register.
 * Reduced motion: the draw-on (stroke-dashoffset) animation is gated on
 * `prefers-reduced-motion`; when reduced (or `animate` is false, the default),
 * paths render as their final static frame immediately with no animation.
 */

import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useIsMono } from '@/hooks/usePalette';
import { cn } from '@/lib/utils';
import type { PlotterPath } from '@/lib/signature/plotter';

export interface PlotterProps {
  /** Explicit paths. Ignored if `generator` is provided. */
  paths?: PlotterPath[];
  /** Seeded path generator; takes precedence over `paths`. */
  generator?: (seed: number) => PlotterPath[];
  seed?: number;
  strokeWidth?: number;
  /** Animate a draw-on stroke. Off by default; disabled under reduced motion. */
  animate?: boolean;
  /** SVG viewBox; defaults to a 0 0 100 100 unit space (matches strokeSet). */
  viewBox?: string;
  className?: string;
}

export default function Plotter({
  paths,
  generator,
  seed = 1,
  strokeWidth = 1,
  animate = false,
  viewBox = '0 0 100 100',
  className,
}: PlotterProps) {
  const mono = useIsMono();
  const reduced = !!useReducedMotion();

  // Deterministic per (generator, seed, paths) — memoized so re-renders are free.
  const resolved = useMemo<PlotterPath[]>(() => {
    if (generator) return generator(seed);
    return paths ?? [];
  }, [generator, seed, paths]);

  if (!mono) return null;

  const animated = animate && !reduced;

  return (
    <svg
      aria-hidden
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="geometricPrecision"
      className={cn('block h-full w-full', className)}
      style={{ stroke: 'rgb(var(--color-text))', fill: 'none' }}
    >
      {resolved.map((p, i) => (
        <path
          key={i}
          d={p.d}
          strokeWidth={strokeWidth}
          fill="none"
          // Draw-on uses pathLength=1 so dash math is unit-normalized; when not
          // animating we leave the path fully drawn (static final frame).
          pathLength={animated ? 1 : undefined}
          style={
            animated
              ? {
                  strokeDasharray: 1,
                  strokeDashoffset: 1,
                  animation: `signature-draw 1.2s ease-out ${i * 0.08}s forwards`,
                }
              : undefined
          }
        />
      ))}
      {animated && (
        <style>{`@keyframes signature-draw { to { stroke-dashoffset: 0; } }`}</style>
      )}
    </svg>
  );
}
