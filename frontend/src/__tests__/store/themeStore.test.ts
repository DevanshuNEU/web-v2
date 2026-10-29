import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore, defaultWallpaperFor } from '@/store/themeStore';
import { wallpapers, getDefaultWallpaper } from '@/data/wallpapers';

/**
 * Switching theme must not throw away the wallpaper the visitor picked.
 * Each theme remembers its own pick; a theme with no pick shows its default.
 */

const byId = (id: string) => wallpapers.find((w) => w.id === id)!;

beforeEach(() => {
  useThemeStore.setState({
    mode: 'dark',
    wallpaper: defaultWallpaperFor('dark'),
    wallpaperByMode: {},
  });
});

describe('themeStore wallpaper memory', () => {
  it('keeps the chosen dark wallpaper across a Light and back to Dark round trip', () => {
    const { setWallpaper, setMode } = useThemeStore.getState();
    setWallpaper(byId('dark-mountain'));
    setMode('light');
    expect(useThemeStore.getState().wallpaper?.id).toBe('light-mountains');
    setMode('dark');
    expect(useThemeStore.getState().wallpaper?.id).toBe('dark-mountain');
  });

  it('remembers a pick per theme', () => {
    const s = useThemeStore.getState();
    s.setWallpaper(byId('dark-aurora'));
    s.setMode('light');
    s.setWallpaper(byId('light-desert'));
    s.setMode('dark');
    expect(useThemeStore.getState().wallpaper?.id).toBe('dark-aurora');
    s.setMode('light');
    expect(useThemeStore.getState().wallpaper?.id).toBe('light-desert');
  });

  it('toggleMode goes through the same memory', () => {
    const s = useThemeStore.getState();
    s.setWallpaper(byId('dark-starfield'));
    s.toggleMode();
    expect(useThemeStore.getState().mode).toBe('light');
    s.toggleMode();
    expect(useThemeStore.getState().wallpaper?.id).toBe('dark-starfield');
  });

  it('keeps a pick saved before wallpaperByMode existed', () => {
    // An older persisted state: a chosen wallpaper, no per-mode map.
    useThemeStore.setState({ mode: 'dark', wallpaper: byId('dark-abstract'), wallpaperByMode: {} });
    const s = useThemeStore.getState();
    s.setMode('light');
    s.setMode('dark');
    expect(useThemeStore.getState().wallpaper?.id).toBe('dark-abstract');
  });

  it('defaults agree between the store and data/wallpapers', () => {
    expect(getDefaultWallpaper('dark').id).toBe(defaultWallpaperFor('dark').id);
    expect(getDefaultWallpaper('light').id).toBe(defaultWallpaperFor('light').id);
  });
});
