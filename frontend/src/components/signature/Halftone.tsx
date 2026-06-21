'use client';

/**
 * Halftone — newsprint-style canvas of ink dots whose size tracks luminance.
 *
 * A premium, strictly-monochrome generative primitive. Given a source (an
 * image, an ImageData buffer, or a pure (x,y)→luminance function) it renders a
 * grid of dots in the active ink color: dark cells get large dots, light cells
 * get tiny ones (dark-on-light). The dot color is read live from the theme
 * (`--color-text`), so it adapts to light/dark and to palette changes with no
 * recoloring logic here.
 *
 * Mono hard-gate: in the 'color' (Fun) palette this renders nothing generative
 * (returns null) — the signature look is reserved for the mono brand register.
 * Reduced motion: animation is off by default; even with `animate`, a reduced-
 * motion preference draws a single static frame and never starts a rAF loop.
 */

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useIsMono } from '@/hooks/usePalette';
import { cn } from '@/lib/utils';
import { getInk, rgbString } from '@/lib/signature/ink';
import { halftoneRadius } from '@/lib/signature/halftone';

type LumFn = (x: number, y: number) => number;

export interface HalftoneProps {
  /** Image, raw pixel buffer, or a pure luminance function over the grid. */
  source?: HTMLImageElement | LumFn | ImageData;
  /** Grid spacing in CSS px. */
  cell?: number;
  /** Largest dot radius; defaults to cell/2. */
  maxRadius?: number;
  /** Dot shape. */
  shape?: 'circle' | 'square';
  /** Invert tone (light-on-dark). */
  invert?: boolean;
  /** Animate a subtle re-stipple. Off by default; ignored under reduced motion. */
  animate?: boolean;
  /** Re-read ink when this changes (e.g. a palette key). */
  paletteKey?: string;
  className?: string;
}

const DPR_CAP = 2;

export default function Halftone({
  source,
  cell = 6,
  maxRadius,
  shape = 'circle',
  invert = false,
  animate = false,
  paletteKey,
  className,
}: HalftoneProps) {
  const mono = useIsMono();
  const reduced = !!useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Mono hard-gate: never draw a generative output in the color palette.
    if (!mono) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const host = canvas.parentElement ?? canvas;
    let raf = 0;
    let scheduled = false;
    let phase = 0;
    const animated = animate && !reduced;

    const sample = buildSampler(source);

    const draw = () => {
      const ink = getInk(host);
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      const rect = host.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = rgbString(ink.ink);
      const r0 = maxRadius ?? cell / 2;

      for (let cy = 0; cy < h; cy += cell) {
        for (let cx = 0; cx < w; cx += cell) {
          // Normalize cell center to 0..1 for functional sources.
          const nx = (cx + cell / 2) / w;
          const ny = (cy + cell / 2) / h;
          let lum = sample(nx, ny, animated ? phase : 0);
          if (invert) lum = 1 - lum;
          const r = halftoneRadius(lum, cell, r0);
          if (r <= 0.01) continue;
          const px = cx + cell / 2;
          const py = cy + cell / 2;
          if (shape === 'square') {
            ctx.fillRect(px - r, py - r, r * 2, r * 2);
          } else {
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      if (animated) {
        phase += 0.01;
        raf = requestAnimationFrame(draw);
      }
    };

    // Debounce resize/observe redraws to a single rAF.
    const schedule = () => {
      if (scheduled || animated) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        draw();
      });
    };

    draw();

    const ro = new ResizeObserver(schedule);
    ro.observe(host);

    // Pause the animated loop while offscreen.
    let io: IntersectionObserver | null = null;
    if (animated) {
      io = new IntersectionObserver((entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (visible && !raf) {
          draw();
        } else if (!visible && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      });
      io.observe(host);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io?.disconnect();
    };
  }, [mono, reduced, source, cell, maxRadius, shape, invert, animate, paletteKey]);

  if (!mono) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn('block h-full w-full', className)}
    />
  );
}

/** Build a (nx, ny, phase) → luminance sampler from any supported source. */
function buildSampler(
  source: HTMLImageElement | LumFn | ImageData | undefined,
): (nx: number, ny: number, phase: number) => number {
  if (typeof source === 'function') {
    return (nx, ny, phase) => clamp01(source(nx + phase, ny));
  }
  if (source && 'data' in source) {
    const { data, width, height } = source;
    return (nx, ny) => {
      const px = Math.min(width - 1, Math.max(0, Math.floor(nx * width)));
      const py = Math.min(height - 1, Math.max(0, Math.floor(ny * height)));
      const i = (py * width + px) * 4;
      return luma(data[i], data[i + 1], data[i + 2]);
    };
  }
  if (source && typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
    const data = imageToData(source);
    if (data) {
      return (nx, ny) => {
        const px = Math.min(data.width - 1, Math.max(0, Math.floor(nx * data.width)));
        const py = Math.min(data.height - 1, Math.max(0, Math.floor(ny * data.height)));
        const i = (py * data.width + px) * 4;
        return luma(data.data[i], data.data[i + 1], data.data[i + 2]);
      };
    }
  }
  // No source: a gentle radial gradient so the primitive still reads as itself.
  return (nx, ny) => {
    const dx = nx - 0.5;
    const dy = ny - 0.5;
    return clamp01(Math.sqrt(dx * dx + dy * dy) * 1.6);
  };
}

function imageToData(img: HTMLImageElement): ImageData | null {
  try {
    const off = document.createElement('canvas');
    off.width = img.naturalWidth || img.width || 1;
    off.height = img.naturalHeight || img.height || 1;
    const octx = off.getContext('2d');
    if (!octx) return null;
    octx.drawImage(img, 0, 0, off.width, off.height);
    return octx.getImageData(0, 0, off.width, off.height);
  } catch {
    return null;
  }
}

/** Rec. 601 luma, normalized to 0..1. */
function luma(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
