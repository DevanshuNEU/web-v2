import { Wallpaper } from '@/store/themeStore';

// Curated wallpaper collection
export const wallpapers: Wallpaper[] = [
  // LIGHT MODE WALLPAPERS
  {
    id: 'gradient-flow-light',
    name: 'Gradient Flow',
    type: 'animated',
    theme: 'light',
    animatedConfig: {
      colors: ['#667eea', '#764ba2', '#f093fb'],
      speed: 15,
      pattern: 'mesh'
    }
  },
  {
    id: 'sunset-light',
    name: 'Sunset Vibes',
    type: 'animated',
    theme: 'light',
    animatedConfig: {
      colors: ['#ffecd2', '#fcb69f', '#ff9a9e'],
      speed: 18,
      pattern: 'mesh'
    }
  },
  {
    id: 'ocean-light',
    name: 'Ocean Breeze',
    type: 'animated',
    theme: 'light',
    animatedConfig: {
      colors: ['#a8edea', '#fed6e3', '#a8d8ea'],
      speed: 20,
      pattern: 'mesh'
    }
  },
  
  // DARK MODE WALLPAPERS
  {
    id: 'dark-matter',
    name: 'Dark Matter',
    type: 'animated',
    theme: 'dark',
    animatedConfig: {
      colors: ['#0f2027', '#203a43', '#2c5364'],
      speed: 20,
      pattern: 'mesh'
    }
  },
  {
    id: 'midnight-city',
    name: 'Midnight City',
    type: 'animated',
    theme: 'dark',
    animatedConfig: {
      colors: ['#232526', '#414345', '#1e3c72'],
      speed: 16,
      pattern: 'mesh'
    }
  },
  {
    id: 'purple-dream',
    name: 'Purple Dream',
    type: 'animated',
    theme: 'dark',
    animatedConfig: {
      colors: ['#1e1e2e', '#2d2d44', '#5b21b6'],
      speed: 22,
      pattern: 'mesh'
    }
  }
];

// Get wallpapers for specific theme
export function getWallpapersForTheme(theme: 'light' | 'dark' | 'both'): Wallpaper[] {
  return wallpapers.filter(w => w.theme === theme || w.theme === 'both');
}

// Get default wallpaper for theme
export function getDefaultWallpaper(theme: 'light' | 'dark'): Wallpaper {
  const themeWallpapers = getWallpapersForTheme(theme);
  return themeWallpapers[0] || wallpapers[0];
}
