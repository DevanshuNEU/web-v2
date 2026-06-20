'use client';

import { useEffect } from 'react';
import { useTheme } from '@/store/themeStore';

// Graphite foreground per mode — the accent in mono palette resolves to the
// text color so every accent consumer renders premium black & white.
const MONO_ACCENT = {
  light: { r: 29, g: 29, b: 31 },   // #1d1d1f — matches --color-text (light)
  dark: { r: 245, g: 245, b: 247 }, // #f5f5f7 — matches --color-text (dark)
} as const;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode, palette, accentColor, wallpaperTint } = useTheme();

  useEffect(() => {
    // Update dark mode class
    const root = document.documentElement;

    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Expose the palette for CSS-level branching ([data-palette="mono"]).
    root.dataset.palette = palette;

    // Resolve the accent. In mono, the single accent var becomes graphite, so
    // all ~20 accent consumers cascade to black & white. In color, inject the
    // chosen accent exactly as before.
    const accentRgb =
      palette === 'mono' ? MONO_ACCENT[mode] : hexToRgb(accentColor);
    if (accentRgb) {
      const triple = `${accentRgb.r} ${accentRgb.g} ${accentRgb.b}`;
      root.style.setProperty('--color-accent', triple);
      root.style.setProperty('--primary', triple);
      root.style.setProperty('--ring', triple);
    }

    // Wallpaper tint: neutralized to graphite in mono, the wallpaper's own
    // tint in color.
    if (palette === 'mono') {
      const t = MONO_ACCENT[mode];
      root.style.setProperty('--wallpaper-tint', `${t.r} ${t.g} ${t.b}`);
    } else if (wallpaperTint) {
      const tintRgb = hexToRgb(wallpaperTint);
      if (tintRgb) {
        root.style.setProperty('--wallpaper-tint', `${tintRgb.r} ${tintRgb.g} ${tintRgb.b}`);
      }
    }
  }, [mode, palette, accentColor, wallpaperTint]);

  return <>{children}</>;
}

// Helper function to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  if (hex.length !== 6) {
    return null;
  }
  
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}
