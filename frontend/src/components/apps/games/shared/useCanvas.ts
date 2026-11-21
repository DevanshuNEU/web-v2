'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface CanvasSize {
  /** CSS pixels. */
  w: number;
  h: number;
  dpr: number;
}

/**
 * Size a canvas to its container at device pixel density.
 *
 * - `aspect` (width / height) letterboxes the canvas inside the container;
 *   omit it to fill the container.
 * - `maxW` caps the CSS width (a board that gets too wide on desktop reads
 *   worse, not better).
 *
 * `getCtx()` returns the 2D context with the DPR transform applied, so game
 * code draws in CSS pixels. Returns null in environments with no canvas.
 */
export function useCanvas({ aspect, maxW }: { aspect?: number; maxW?: number } = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<CanvasSize>({ w: 320, h: 480, dpr: 1 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const cw = Math.max(1, el.clientWidth);
      const ch = Math.max(1, el.clientHeight);
      let w = cw; let h = ch;
      if (aspect) {
        if (cw / ch > aspect) { h = ch; w = ch * aspect; } else { w = cw; h = cw / aspect; }
      }
      if (maxW && w > maxW) { w = maxW; if (aspect) h = maxW / aspect; }
      const dpr = Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 3);
      setSize(s => (s.w === Math.floor(w) && s.h === Math.floor(h) && s.dpr === dpr ? s : { w: Math.floor(w), h: Math.floor(h), dpr }));
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, [aspect, maxW]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = Math.round(size.w * size.dpr);
    c.height = Math.round(size.h * size.dpr);
  }, [size]);

  const getCtx = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d') ?? null;
    if (!ctx) return null;
    ctx.setTransform?.(size.dpr, 0, 0, size.dpr, 0, 0);
    return ctx;
  }, [size.dpr]);

  const style = { width: size.w, height: size.h } as const;
  return { containerRef, canvasRef, size, getCtx, style };
}
