'use client';

import { useRef, useCallback } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

interface SwipeOptions {
  onSwipe?: (dir: SwipeDirection, info: { dx: number; dy: number; vx: number; vy: number }) => void;
  threshold?: number;       // min pixels to count as swipe
  velocityThreshold?: number; // px/ms
}

/**
 * Pointer-event swipe detector. Works for touch and mouse — phone shell uses
 * pointer events so we get one API for both. Returns handlers to spread onto
 * the target element.
 */
export function useSwipe({
  onSwipe,
  threshold = 40,
  velocityThreshold = 0.3,
}: SwipeOptions = {}) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!start.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      const dt = Math.max(1, Date.now() - start.current.t);
      const vx = Math.abs(dx) / dt;
      const vy = Math.abs(dy) / dt;
      start.current = null;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      // Horizontal swipe dominates if |dx| > |dy|
      if (absX > absY && (absX > threshold || vx > velocityThreshold)) {
        onSwipe?.(dx < 0 ? 'left' : 'right', { dx, dy, vx, vy });
      } else if (absY > threshold || vy > velocityThreshold) {
        onSwipe?.(dy < 0 ? 'up' : 'down', { dx, dy, vx, vy });
      }
    },
    [onSwipe, threshold, velocityThreshold]
  );

  const onPointerCancel = useCallback(() => {
    start.current = null;
  }, []);

  return { onPointerDown, onPointerUp, onPointerCancel };
}
