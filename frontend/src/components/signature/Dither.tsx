'use client';

/**
 * Dither — ordered (Bayer) dithering of an image into strict ink/paper.
 *
 * Loads `src`, draws it to an offscreen canvas at `size`, reads the pixels, and
 * thresholds each one against a tiled Bayer matrix so the result is rendered
 * entirely in the active ink (`--color-text`) and paper (`--color-bg`) colors —
 * no gray, no hue. The ink/paper are read live from the theme so the output
 * tracks light/dark and palette changes.
 *
 * Mono hard-gate: in the 'color' (Fun) palette this is a plain <img> — no
 * dithering. If the canvas or image fails (SSR, decode error), it falls back to
 * a grayscale, high-contrast <img>. The dither result is memoized on
 * src+size+matrix+levels via the effect deps so it only recomputes when those
 * change. There is no animation here, so reduced motion is a no-op.
 */

import { useEffect, useRef, useState } from 'react';
import { useIsMono } from '@/hooks/usePalette';
import { cn } from '@/lib/utils';
import { getInk } from '@/lib/signature/ink';
import { bayerMatrix, ditherLuminance } from '@/lib/signature/bayer';

export interface DitherProps {
  src: string;
  alt: string;
  /** Longest-edge sample size in px. Smaller = chunkier dither. */
  size?: number;
  /** Bayer matrix order. */
  matrix?: 2 | 4 | 8;
  /** Quantization levels (2 = pure ink/paper). */
  levels?: number;
  /** Re-read ink when this changes (e.g. a palette key). */
  paletteKey?: string;
  priority?: boolean;
  className?: string;
}

export default function Dither({
  src,
  alt,
  size = 160,
  matrix = 4,
  levels = 2,
  paletteKey,
  priority,
  className,
}: DitherProps) {
  const mono = useIsMono();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!mono) return;
    setFailed(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setFailed(true);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';

    const render = () => {
      if (cancelled) return;
      try {
        const iw = img.naturalWidth || size;
        const ih = img.naturalHeight || size;
        const scale = size / Math.max(iw, ih);
        const w = Math.max(1, Math.round(iw * scale));
        const h = Math.max(1, Math.round(ih * scale));

        // Offscreen sample at target size.
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const octx = off.getContext('2d');
        if (!octx) throw new Error('no offscreen ctx');
        octx.drawImage(img, 0, 0, w, h);
        const pixels = octx.getImageData(0, 0, w, h);

        const ink = getInk(canvas.parentElement ?? canvas);
        const mat = bayerMatrix(matrix);
        const lvls = Math.max(2, Math.floor(levels));

        const out = ctx.createImageData(w, h);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const lum =
              (0.299 * pixels.data[i] +
                0.587 * pixels.data[i + 1] +
                0.114 * pixels.data[i + 2]) /
              255;
            const q = ditherLuminance(lum, x, y, mat, lvls);
            // q in 0..1 = paper..ink interpolation in the theme's two tones.
            const r = Math.round(ink.paper[0] + (ink.ink[0] - ink.paper[0]) * (1 - q));
            const g = Math.round(ink.paper[1] + (ink.ink[1] - ink.paper[1]) * (1 - q));
            const b = Math.round(ink.paper[2] + (ink.ink[2] - ink.paper[2]) * (1 - q));
            out.data[i] = r;
            out.data[i + 1] = g;
            out.data[i + 2] = b;
            out.data[i + 3] = 255;
          }
        }

        canvas.width = w;
        canvas.height = h;
        ctx.putImageData(out, 0, 0);
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    img.onload = render;
    img.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    img.src = src;
    // Cached images may already be complete.
    if (img.complete && img.naturalWidth > 0) render();

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [mono, src, size, matrix, levels, paletteKey]);

  // Color palette → plain image, never a dithered output.
  if (!mono) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} loading={priority ? 'eager' : 'lazy'} />;
  }

  // Canvas/image failure → grayscale high-contrast fallback image.
  if (failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        className={cn('grayscale contrast-150', className)}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={alt}
      className={cn('block h-full w-full [image-rendering:pixelated]', className)}
    />
  );
}
