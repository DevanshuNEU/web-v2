'use client';

import { useRef, useCallback } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

interface SwipeOptions {
  onSwipe?: (dir: SwipeDirection, info: { dx: number; dy: number; vx: number; vy: number }) => void;
  threshold?: number;       // min pixels to count as swipe
  velocityThreshold?: number; // px/ms
  /**
   * Fire as soon as the finger has travelled `threshold` px, then re-anchor
   * at that point so one continuous drag can chain several turns. Games use
   * this: waiting for the finger to lift costs a tick or two of reaction time.
   */
  fireOnMove?: boolean;
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
  fireOnMove = false,
}: SwipeOptions = {}) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const firedDuringDrag = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    firedDuringDrag.current = false;
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!fireOnMove || !start.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (Math.max(absX, absY) < threshold) return;
      const dt = Math.max(1, Date.now() - start.current.t);
      const info = { dx, dy, vx: absX / dt, vy: absY / dt };
      onSwipe?.(absX > absY ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'), info);
      start.current = { x: e.clientX, y: e.clientY, t: Date.now() };
      firedDuringDrag.current = true;
    },
    [fireOnMove, onSwipe, threshold]
  );

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
      // In move mode a tap at the end of a drag that already turned is not
      // a new swipe; only a short flick that never crossed the threshold is.
      if (fireOnMove && firedDuringDrag.current) return;
      if (fireOnMove && absX < 8 && absY < 8) return;

      // Horizontal swipe dominates if |dx| > |dy|
      if (absX > absY && (absX > threshold || vx > velocityThreshold)) {
        onSwipe?.(dx < 0 ? 'left' : 'right', { dx, dy, vx, vy });
      } else if (absY > threshold || vy > velocityThreshold) {
        onSwipe?.(dy < 0 ? 'up' : 'down', { dx, dy, vx, vy });
      }
    },
    [onSwipe, threshold, velocityThreshold, fireOnMove]
  );

  const onPointerCancel = useCallback(() => {
    start.current = null;
  }, []);

  return fireOnMove
    ? { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
    : { onPointerDown, onPointerUp, onPointerCancel };
}
