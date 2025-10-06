import { Wallpaper } from '@/store/themeStore';

export const wallpapers: Wallpaper[] = [
  // DARK MODE WALLPAPERS
  {
    id: 'dark-mountain',
    name: 'Mountain Night',
    type: 'static',
    theme: 'dark',
    imageUrl: '/wallpapers/dark-mountainNight.png'
  },
  {
    id: 'dark-abstract',
    name: 'Dark Abstract',
    type: 'static',
    theme: 'dark',
    imageUrl: '/wallpapers/dark-abstract.png'
  },
  {
    id: 'dark-minimalist',
    name: 'Dark Minimalist',
    type: 'static',
    theme: 'dark',
    imageUrl: '/wallpapers/dark-minimilist.png'
  },
  
  // LIGHT MODE WALLPAPERS
  {
    id: 'light-desert',
    name: 'Desert Dunes',
    type: 'static',
    theme: 'light',
    imageUrl: '/wallpapers/light-dessert.png'
  },
  {
    id: 'light-abstract',
    name: 'Light Abstract',
    type: 'static',
    theme: 'light',
    imageUrl: '/wallpapers/light-abstract.png'
  },
  {
    id: 'light-mountains',
    name: 'Mountain Vista',
    type: 'static',
    theme: 'light',
    imageUrl: '/wallpapers/light-mountainVista.png'
  }
];

export function getWallpapersForTheme(theme: 'light' | 'dark'): Wallpaper[] {
  return wallpapers.filter(w => w.theme === theme);
}

export function getDefaultWallpaper(theme: 'light' | 'dark'): Wallpaper {
  const themeWallpapers = getWallpapersForTheme(theme);
  return themeWallpapers[0];
}
