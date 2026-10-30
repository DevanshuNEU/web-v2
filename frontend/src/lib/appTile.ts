/**
 * App tile system: the face every app icon wears, in both palettes.
 *
 * Color palette (direction A, "Product Glyphs"): every app sits on the same
 * deep navy tile and the color lives in a two-tone Phosphor glyph. Apps are
 * grouped into flavor families (Stripe's own dark-theme color pairs) so the
 * dock reads as a family, not a rainbow. Values come from
 * docs/research/2026-10-30-stripe-icons-and-color.md section 5.2.
 *
 * Mono palette: one graphite tile with a white glyph.
 *
 * CSS values live here as inline styles so gradients and shadows can never be
 * purged by Tailwind's JIT scanner.
 */

export type FlavorKey =
  | 'chroma'
  | 'cottonCandy'
  | 'pomegranate'
  | 'sunset'
  | 'sunburst'
  | 'lemonLime'
  | 'wintergreen'
  | 'overcast'
  | 'slate';

export interface Flavor {
  /** Flat fill of the glyph's back (duotone) layer. */
  back: string;
  /** Top stop of the glyph outline's vertical gradient. */
  top: string;
  /** Bottom stop of the glyph outline's vertical gradient. */
  bottom: string;
}

export const FLAVORS: Record<FlavorKey, Flavor> = {
  chroma: { back: '#00d4ff', top: '#ccffff', bottom: '#7a73ff' },
  cottonCandy: { back: '#ff80ff', top: '#fac7ff', bottom: '#0073e6' },
  pomegranate: { back: '#ff5996', top: '#ffdcf2', bottom: '#9966ff' },
  sunset: { back: '#ff80ff', top: '#ffeeb2', bottom: '#ffbb00' },
  sunburst: { back: '#ff7700', top: '#ffea9e', bottom: '#ffbb00' },
  lemonLime: { back: '#00d924', top: '#fff5ad', bottom: '#ffd848' },
  wintergreen: { back: '#00d924', top: '#cbffef', bottom: '#1df5e9' },
  overcast: { back: '#11efe3', top: '#b3ffff', bottom: '#0073e6' },
  slate: { back: '#b4d2eb', top: '#ecf6ff', bottom: '#7995ac' },
};

/** The navy tile's midpoint, the surface every flavor color must reach 3:1 against. */
export const TILE_MIDPOINT = '#19223f';

/** The color palette's tile: navy gradient, hairline, lit top edge, navy-tinted shadow. */
export const COLOR_TILE = {
  background: 'linear-gradient(180deg, oklch(0.30 0.05 268) 0%, oklch(0.22 0.06 268) 100%)',
  border: '1px solid oklch(1 0 0 / 0.08)',
  boxShadow: [
    'inset 0 1px 0 oklch(1 0 0 / 0.10)',
    '0 6px 12px -2px rgba(50,50,93,0.35)',
    '0 3px 7px -3px rgba(0,0,0,0.40)',
  ].join(', '),
} as const;

/** The mono palette's tile: near-flat graphite, hairline, restrained shadow. */
export const MONO_TILE = {
  background: 'linear-gradient(135deg, #2a2a2e 0%, #1c1c1f 100%)',
  border: '1px solid rgba(255, 255, 255, 0.10)',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.32), 0 1px 2px rgba(0, 0, 0, 0.18)',
} as const;
