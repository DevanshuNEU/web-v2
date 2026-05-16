'use client';

import { useRef, useState, useCallback } from 'react';

interface PullToDismissOptions {
  onDismiss: () => void;
  /** Pixels of drag needed to commit the dismiss */
  threshold?: number;
  /** Rubber-banding ratio applied above the threshold (0 = none, 1 = linear) */
  rubberBand?: number;
}

/**
 * Drag-down-to-close gesture for fullscreen mobile app views.
 * Returns pointer handlers + the current drag offset (use for transform).
 *
 * Direction: positive Y only (down). Negative drags are ignored.
 */
export function usePullToDismiss({
  onDismiss,
  threshold = 140,
  rubberBand = 0.5,
}: PullToDismissOptions) {
  const start = useRef<{ y: number } | null>(null);
  const [offsetY, setOffsetY] = useState(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    start.current = { y: e.clientY };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    if (dy <= 0) {
      setOffsetY(0);
      return;
    }
    // Rubber-band beyond threshold so it never feels infinite
    const adjusted =
      dy <= threshold ? dy : threshold + (dy - threshold) * rubberBand;
    setOffsetY(adjusted);
  }, [threshold, rubberBand]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    start.current = null;
    if (dy >= threshold) {
      onDismiss();
    }
    setOffsetY(0);
  }, [onDismiss, threshold]);

  const onPointerCancel = useCallback(() => {
    start.current = null;
    setOffsetY(0);
  }, []);

  return {
    offsetY,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
