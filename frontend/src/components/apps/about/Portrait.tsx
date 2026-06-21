'use client';

/**
 * Portrait — the clean, recognizable masthead photo for About Me.
 *
 * Replaces the Dither in the masthead with a deliberately framed editorial
 * portrait (the Dither component stays available for other apps). In the mono
 * palette the image is grayscale with gentle contrast; in the color ("Fun")
 * palette it renders in natural color. A lightweight inline-SVG fractal-noise
 * overlay adds ~4% film grain for editorial texture without obscuring the face.
 *
 * Framed with a hairline border. Fixed square box (width === height) so it never
 * layout-shifts; next/image fills the box. There is no animation here, so this
 * is reduced-motion neutral on its own — the masthead entrance stagger is
 * handled by the parent and gates on useReducedMotion().
 */

import Image from 'next/image';
import { useIsMono } from '@/hooks/usePalette';

/**
 * Tiny fractalNoise tile, encoded as a data-uri so it ships inline (no extra
 * request). Low alpha + soft-light blend reads as film grain, not static.
 */
const GRAIN_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export interface PortraitProps {
  src: string;
  alt: string;
  /** Square edge length in px. Used for both width and height (no CLS). */
  size: number;
  priority?: boolean;
}

export default function Portrait({ src, alt, size, priority }: PortraitProps) {
  const mono = useIsMono();

  return (
    <div
      className="relative shrink-0 overflow-hidden border border-border bg-surface"
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        priority={priority}
        sizes={`${size}px`}
        className="h-full w-full object-cover"
        style={mono ? { filter: 'grayscale(1) contrast(1.05)' } : undefined}
      />

      {/* Film-grain overlay — ~4% opacity, soft-light so it textures without
          darkening or hiding the face. Decorative only. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: GRAIN_DATA_URI,
          backgroundRepeat: 'repeat',
          opacity: 0.04,
          mixBlendMode: 'soft-light',
        }}
      />

      {/* Inner hairline frame — a thin inset ruling, monochrome via border color. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 border border-border/60"
      />
    </div>
  );
}
