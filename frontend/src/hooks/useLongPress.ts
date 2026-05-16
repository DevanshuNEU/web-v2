'use client';

import { useRef, useCallback } from 'react';

interface LongPressOptions {
  onLongPress: () => void;
  delay?: number; // ms, default 500
}

/**
 * Long-press detector for touch and mouse. Used by AppIcon to enter wiggle mode.
 * Returns pointer handlers to spread onto the target.
 */
export function useLongPress({ onLongPress, delay = 500 }: LongPressOptions) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const onPointerDown = useCallback(() => {
    fired.current = false;
    clear();
    timer.current = setTimeout(() => {
      fired.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay, clear]);

  const onPointerUp = useCallback(() => {
    clear();
  }, [clear]);

  const onPointerLeave = useCallback(() => {
    clear();
  }, [clear]);

  const onPointerCancel = useCallback(() => {
    clear();
  }, [clear]);

  return {
    handlers: { onPointerDown, onPointerUp, onPointerLeave, onPointerCancel },
    /** True if the most recent gesture fired the long-press callback */
    didFire: () => fired.current,
  };
}
