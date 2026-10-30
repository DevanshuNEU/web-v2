// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * The color palette is the default, and every visitor saved before version 1
 * is moved to it once, with the blurple accent. Choices made after that stick.
 */

const KEY = 'portfolio-os-theme';

async function freshStore() {
  vi.resetModules();
  return import('@/store/themeStore');
}

beforeEach(() => {
  localStorage.clear();
});

describe('migrateTheme', () => {
  it('moves a pre-v1 mono visitor to color with blurple, keeping mode and wallpaper', async () => {
    const { migrateTheme, BLURPLE } = await freshStore();
    const wallpaper = { id: 'dark-mountain', name: 'M', type: 'static', theme: 'dark' };
    const out = migrateTheme({ palette: 'mono', accentColor: '#FF9500', mode: 'light', wallpaper }, 0) as Record<string, unknown>;
    expect(out.palette).toBe('color');
    expect(out.accentColor).toBe(BLURPLE);
    expect(out.mode).toBe('light');
    expect(out.wallpaper).toEqual(wallpaper);
  });

  it('resets the accent of a pre-v1 color visitor to blurple', async () => {
    const { migrateTheme, BLURPLE } = await freshStore();
    const out = migrateTheme({ palette: 'color', accentColor: '#007AFF' }, 0) as Record<string, unknown>;
    expect(out.palette).toBe('color');
    expect(out.accentColor).toBe(BLURPLE);
  });
});

describe('themeStore defaults and persistence', () => {
  it('defaults to the color palette with the blurple accent', async () => {
    const { useThemeStore } = await freshStore();
    expect(useThemeStore.getState().palette).toBe('color');
    expect(useThemeStore.getState().accentColor).toBe('#635BFF');
  });

  it('migrates a stored pre-v1 mono blob on load', async () => {
    localStorage.setItem(KEY, JSON.stringify({ state: { palette: 'mono', accentColor: '#FF9500', mode: 'dark' }, version: 0 }));
    const { useThemeStore } = await freshStore();
    await useThemeStore.persist.rehydrate();
    expect(useThemeStore.getState().palette).toBe('color');
    expect(useThemeStore.getState().accentColor).toBe('#635BFF');
  });

  it('keeps a Mono choice made after the migration across reloads', async () => {
    const first = await freshStore();
    first.useThemeStore.getState().setPalette('mono');
    const saved = JSON.parse(localStorage.getItem(KEY)!);
    expect(saved.version).toBe(1);
    expect(saved.state.palette).toBe('mono');

    const second = await freshStore();
    await second.useThemeStore.persist.rehydrate();
    expect(second.useThemeStore.getState().palette).toBe('mono');
  });

  it('offers blurple as the first accent preset', async () => {
    const { ACCENT_COLORS } = await freshStore();
    expect(Object.keys(ACCENT_COLORS)[0]).toBe('blurple');
    expect(ACCENT_COLORS.blurple).toBe('#635BFF');
  });
});
