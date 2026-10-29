'use client';

import { useTheme } from '@/store/themeStore';

/**
 * Whether the phone wallpaper is light or dark, so text drawn straight on it
 * (icon labels, page dots, the Ask pill) can pick ink that reads. White labels
 * on the light Mountain Vista wallpaper measured 1.64:1; dark ink on it is
 * about 11:1. Falls back to the theme mode when a wallpaper suits both.
 */
export function useWallpaperTone(): 'light' | 'dark' {
  const { wallpaper, mode } = useTheme();
  const theme = wallpaper?.theme;
  const tone = theme === 'light' || theme === 'dark' ? theme : mode;
  return tone === 'light' ? 'light' : 'dark';
}
