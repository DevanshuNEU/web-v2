'use client';

import { useTheme, type Palette } from '@/store/themeStore';

/**
 * usePalette — the single contract every palette-aware component branches on.
 *
 * The portfolio defaults to a premium black & white look ('mono'); the original
 * colorful theme is opt-in via "Fun" mode ('color'). Components that hold their
 * own hardcoded hues read this hook and choose neutral vs colored output:
 *
 *   const palette = usePalette();
 *   const mono = palette === 'mono';
 *
 * Or, when you only need the boolean:
 *
 *   const mono = useIsMono();
 *
 * Mono output must stay legible without color (glyph + weight, never hue alone);
 * the 'color' path should remain exactly today's look.
 */
export function usePalette(): Palette {
  return useTheme().palette;
}

export function useIsMono(): boolean {
  return useTheme().palette === 'mono';
}
