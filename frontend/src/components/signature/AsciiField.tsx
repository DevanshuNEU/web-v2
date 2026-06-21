'use client';

/**
 * AsciiField — render a source as selectable monospace ASCII art.
 *
 * Accepts a ready-made luminance grid, a multi-line string (rendered verbatim),
 * or an image (downsampled to a luminance grid then mapped through a glyph
 * ramp). Output is a real <pre> of text in `--font-geist-mono` using
 * `currentColor`, so it is selectable, accessible, and adapts to the theme ink
 * with zero JS recoloring.
 *
 * Mono hard-gate: in the 'color' (Fun) palette the ASCII conversion is skipped
 * and the raw text source is shown plainly (or nothing for non-text sources) —
 * the generative look stays in the mono brand register. No animation, so
 * reduced motion is a no-op; the field is fully static.
 */

import { useEffect, useState } from 'react';
import { useIsMono } from '@/hooks/usePalette';
import { cn } from '@/lib/utils';
import { asciiFromGrid, lumToChar, DEFAULT_RAMP } from '@/lib/signature/ascii';

export interface AsciiFieldProps {
  source: string | number[][] | HTMLImageElement;
  /** Light→dark glyph ramp. */
  ramp?: string;
  /** Target column count when downsampling an image. */
  cols?: number;
  /** Element tag — defaults to a selectable <pre>. */
  as?: 'pre' | 'div';
  /** Re-read theme on change (cosmetic; currentColor adapts anyway). */
  paletteKey?: string;
  className?: string;
}

export default function AsciiField({
  source,
  ramp = DEFAULT_RAMP,
  cols,
  as = 'pre',
  paletteKey,
  className,
}: AsciiFieldProps) {
  const mono = useIsMono();

  // Static, synchronous text for string/grid sources; image sources resolve in
  // an effect (they need a canvas to sample). The grid/string path runs on the
  // server too, so SSR matches the client.
  const initial = computeStaticText(source, ramp, mono);
  const [text, setText] = useState<string>(initial);

  useEffect(() => {
    setText(computeStaticText(source, ramp, mono));
    if (!mono) return;
    if (typeof source === 'string' || Array.isArray(source)) return;
    if (typeof HTMLImageElement === 'undefined' || !(source instanceof HTMLImageElement)) return;

    const grid = imageToLumGrid(source, cols ?? 80);
    if (grid) setText(asciiFromGrid(grid, ramp).join('\n'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mono, source, ramp, cols, paletteKey]);

  const common = {
    'aria-hidden': true as const,
    className: cn(
      'whitespace-pre font-[family-name:var(--font-geist-mono)] leading-none [color:currentColor] select-text',
      className,
    ),
  };

  if (as === 'div') {
    return <div {...common}>{text}</div>;
  }
  return <pre {...common}>{text}</pre>;
}

/** String → verbatim; grid → ascii; image → placeholder until effect resolves. */
function computeStaticText(
  source: string | number[][] | HTMLImageElement,
  ramp: string,
  mono: boolean,
): string {
  if (typeof source === 'string') return source;
  if (Array.isArray(source)) {
    // In the color palette, a numeric grid has no plain text form → empty.
    return mono ? asciiFromGrid(source, ramp).join('\n') : '';
  }
  return '';
}

/** Downsample an image to a `cols`-wide luminance grid (aspect-correct rows). */
function imageToLumGrid(img: HTMLImageElement, cols: number): number[][] | null {
  try {
    const iw = img.naturalWidth || img.width || 1;
    const ih = img.naturalHeight || img.height || 1;
    // Monospace cells are ~2x taller than wide; halve rows so output isn't squashed.
    const rows = Math.max(1, Math.round((cols * (ih / iw)) / 2));
    const off = document.createElement('canvas');
    off.width = cols;
    off.height = rows;
    const ctx = off.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, cols, rows);
    const { data } = ctx.getImageData(0, 0, cols, rows);
    const grid: number[][] = [];
    for (let y = 0; y < rows; y++) {
      const row: number[] = [];
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        row.push((0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255);
      }
      grid.push(row);
    }
    return grid;
  } catch {
    return null;
  }
}

// Re-export for callers that want the single-glyph mapping inline.
export { lumToChar };
