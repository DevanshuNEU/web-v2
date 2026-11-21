'use client';

import { useEffect, useRef } from 'react';

export const FIXED_DT = 1 / 120;

/**
 * Run `update(dt)` at a fixed 120 Hz and `render(alpha)` once per animation
 * frame, where alpha is how far the clock sits between two updates.
 *
 * Fixed steps keep physics identical at 60, 90 and 120 Hz screens. Frames
 * longer than 100ms (a tab coming back, a GC pause) are clamped so the game
 * never fast-forwards through a wall. The loop stops when `running` is false.
 * `onHidden` fires when the page is hidden, so a game can pause itself.
 */
export function useGameLoop({
  running,
  update,
  render,
  onHidden,
}: {
  running: boolean;
  update: (dt: number) => void;
  render: (alpha: number) => void;
  onHidden?: () => void;
}) {
  const cb = useRef({ update, render, onHidden });
  cb.current = { update, render, onHidden };

  useEffect(() => {
    if (!running || typeof window === 'undefined' || !window.requestAnimationFrame) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const frame = (now: number) => {
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      let steps = 0;
      while (acc >= FIXED_DT && steps < 24) {
        cb.current.update(FIXED_DT);
        acc -= FIXED_DT;
        steps++;
      }
      cb.current.render(acc / FIXED_DT);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  useEffect(() => {
    const onVis = () => { if (document.hidden) cb.current.onHidden?.(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
}
