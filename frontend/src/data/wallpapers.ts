import { Wallpaper } from '@/store/themeStore';

export const wallpapers: Wallpaper[] = [
  // DARK MODE WALLPAPERS
  {
    id: 'dark-mountain',
    name: 'Mountain Night',
    type: 'static',
    theme: 'dark',
    imageUrl: '/wallpapers/Wallpaper 4.png'
  },
  {
    id: 'dark-abstract',
    name: 'Dark Abstract',
    type: 'static',
    theme: 'dark',
    imageUrl: '/wallpapers/Wallpaper 6.png'
  },
  {
    id: 'dark-wall',
    name: 'Dark Minimalist',
    type: 'static',
    theme: 'dark',
    imageUrl: '/wallpapers/WAALL.png'
  },
  
  // LIGHT MODE WALLPAPERS
  {
    id: 'light-desert',
    name: 'Desert Dunes',
    type: 'static',
    theme: 'light',
    imageUrl: '/wallpapers/Wallpapar 9.png'
  },
  {
    id: 'light-lake',
    name: 'Peaceful Lake',
    type: 'static',
    theme: 'light',
    imageUrl: '/wallpapers/Wallpaper 10.png'
  },
  {
    id: 'light-mountains',
    name: 'Mountain Vista',
    type: 'static',
    theme: 'light',
    imageUrl: '/wallpapers/Wallpaper 11.png'
  }
];

export function getWallpapersForTheme(theme: 'light' | 'dark'): Wallpaper[] {
  return wallpapers.filter(w => w.theme === theme);
}

export function getDefaultWallpaper(theme: 'light' | 'dark'): Wallpaper {
  const themeWallpapers = getWallpapersForTheme(theme);
  return themeWallpapers[0];
}
