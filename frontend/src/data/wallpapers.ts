import type { Wallpaper } from '@/store/themeStore';

export const wallpapers: Wallpaper[] = [
  // -------------------------------------------------------------------------
  // DARK, static
  // -------------------------------------------------------------------------
  {
    id: 'dark-mountain',
    name: 'Mountain Night',
    type: 'static',
    theme: 'dark',
    imageUrl: '/wallpapers/dark-mountainNight.png',
    thumbnail: '/wallpapers/dark-mountainNight.png',
  },
  {
    id: 'dark-abstract',
    name: 'Dark Abstract',
    type: 'static',
    theme: 'dark',
    imageUrl: '/wallpapers/dark-abstract.png',
    thumbnail: '/wallpapers/dark-abstract.png',
  },
  {
    id: 'dark-minimalist',
    name: 'Dark Minimalist',
    type: 'static',
    theme: 'dark',
    imageUrl: '/wallpapers/dark-minimilist.png',
    thumbnail: '/wallpapers/dark-minimilist.png',
  },

  // -------------------------------------------------------------------------
  // DARK, animated. previewUrl is a real still of the running wallpaper
  // (public/wallpapers/previews), used for the Preferences thumbnail only.
  // -------------------------------------------------------------------------
  {
    id: 'dark-signal-grid',
    name: 'Signal Grid',
    type: 'animated',
    theme: 'dark',
    thumbnail: 'linear-gradient(135deg,#07091a 0%,#1a0a2e 50%,#0a1a1f 100%)',
    previewUrl: '/wallpapers/previews/dark-signal-grid.jpg',
    animatedConfig: { colors: ['#f97316', '#06b6d4', '#8b5cf6'], speed: 1, pattern: 'grid' },
  },
  {
    id: 'dark-particles',
    name: 'Neural Network',
    type: 'animated',
    theme: 'dark',
    thumbnail: 'linear-gradient(135deg,#0a0a1a 0%,#1a1a3a 50%,#0a1a2a 100%)',
    previewUrl: '/wallpapers/previews/dark-particles.jpg',
    animatedConfig: { colors: ['#4facfe', '#00f2fe'], speed: 1, pattern: 'particles' },
  },
  {
    id: 'dark-starfield',
    name: 'Deep Space',
    type: 'animated',
    theme: 'dark',
    thumbnail: 'radial-gradient(circle at center,#1a1a3a 0%,#04040f 100%)',
    previewUrl: '/wallpapers/previews/dark-starfield.jpg',
    animatedConfig: { colors: ['#ffffff', '#aaaaff'], speed: 2.5, pattern: 'starfield' },
  },
  {
    id: 'dark-aurora',
    name: 'Aurora',
    type: 'animated',
    theme: 'dark',
    thumbnail: 'linear-gradient(135deg,#0d1b2a 0%,#1b2838 30%,#0d2b1a 70%,#1a0d2b 100%)',
    previewUrl: '/wallpapers/previews/dark-aurora.jpg',
    animatedConfig: { colors: ['#00d4aa', '#7b2ff7', '#0080ff'], speed: 8, pattern: 'mesh' },
  },

  // -------------------------------------------------------------------------
  // LIGHT, static
  // -------------------------------------------------------------------------
  {
    id: 'light-desert',
    name: 'Desert Dunes',
    type: 'static',
    theme: 'light',
    imageUrl: '/wallpapers/light-dessert.png',
    thumbnail: '/wallpapers/light-dessert.png',
  },
  {
    id: 'light-abstract',
    name: 'Light Abstract',
    type: 'static',
    theme: 'light',
    imageUrl: '/wallpapers/light-abstract.png',
    thumbnail: '/wallpapers/light-abstract.png',
  },
  {
    id: 'light-mountains',
    name: 'Mountain Vista',
    type: 'static',
    theme: 'light',
    imageUrl: '/wallpapers/light-mountainVista.png',
    thumbnail: '/wallpapers/light-mountainVista.png',
  },

  // -------------------------------------------------------------------------
  // LIGHT, animated
  // -------------------------------------------------------------------------
  {
    id: 'light-gradient',
    name: 'Pastel Dream',
    type: 'animated',
    theme: 'light',
    thumbnail: 'linear-gradient(135deg,#ffecd2 0%,#fcb69f 30%,#a1c4fd 70%,#c2e9fb 100%)',
    previewUrl: '/wallpapers/previews/light-gradient.jpg',
    animatedConfig: { colors: ['#fcb69f', '#a1c4fd', '#ffecd2', '#c2e9fb'], speed: 5, pattern: 'mesh' },
  },
  {
    id: 'light-particles',
    name: 'Floating Dots',
    type: 'animated',
    theme: 'light',
    thumbnail: 'linear-gradient(135deg,#f8f9fa 0%,#e9ecef 100%)',
    previewUrl: '/wallpapers/previews/light-particles.jpg',
    animatedConfig: { colors: ['#007AFF'], speed: 1, pattern: 'particles' },
  },
];

export function getWallpapersForTheme(theme: 'light' | 'dark'): Wallpaper[] {
  return wallpapers.filter(w => w.theme === theme);
}

/** The wallpaper a theme shows until the visitor picks one (matches themeStore). */
const DEFAULT_ID = { dark: 'dark-signal-grid', light: 'light-mountains' } as const;

export function getDefaultWallpaper(theme: 'light' | 'dark'): Wallpaper {
  return wallpapers.find(w => w.id === DEFAULT_ID[theme]) ?? getWallpapersForTheme(theme)[0];
}
