'use client';

import { useEffect } from 'react';
import { useTheme } from '@/store/themeStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode, accentColor, wallpaperTint } = useTheme();
  
  useEffect(() => {
    // Update dark mode class
    const root = document.documentElement;
    
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Update CSS variables for accent color
    const rgb = hexToRgb(accentColor);
    if (rgb) {
      root.style.setProperty('--color-accent', `${rgb.r} ${rgb.g} ${rgb.b}`);
      root.style.setProperty('--primary', `${rgb.r} ${rgb.g} ${rgb.b}`);
      root.style.setProperty('--ring', `${rgb.r} ${rgb.g} ${rgb.b}`);
    }
    
    // Update wallpaper tint if available
    if (wallpaperTint) {
      const tintRgb = hexToRgb(wallpaperTint);
      if (tintRgb) {
        root.style.setProperty('--wallpaper-tint', `${tintRgb.r} ${tintRgb.g} ${tintRgb.b}`);
      }
    }
  }, [mode, accentColor, wallpaperTint]);
  
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
