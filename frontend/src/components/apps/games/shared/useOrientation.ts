'use client';

import { useEffect, useState, type RefObject } from 'react';

export type Orientation = 'portrait' | 'landscape';

/** Wider than tall is landscape. A square (or an unmeasured box) is portrait. */
export function orientationOf(w: number, h: number): Orientation {
  return w > h && h > 0 ? 'landscape' : 'portrait';
}

/**
 * The orientation of a game's own container, not the device: a desktop
 * window and the phone shell both size the game, so the box is the truth.
 * Updates on container resize, window resize and orientationchange (checked
 * again a frame later, since some phones report the old size during the
 * event).
 */
export function useOrientation(ref: RefObject<HTMLElement | null>): Orientation {
  const [o, setO] = useState<Orientation>('portrait');

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    let raf = 0;
    const read = () => setO(orientationOf(el.clientWidth, el.clientHeight));
    const onRotate = () => {
      read();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener('resize', read);
    window.addEventListener('orientationchange', onRotate);
    const obs = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(read);
    obs?.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', read);
      window.removeEventListener('orientationchange', onRotate);
      obs?.disconnect();
    };
  }, [ref]);

  return o;
}
