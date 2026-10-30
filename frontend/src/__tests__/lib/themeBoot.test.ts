// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest';
import { THEME_BOOT_SCRIPT } from '@/lib/themeBoot';

/**
 * The boot script runs before first paint. It must pick the same palette and
 * accent the store will settle on, so nothing flashes after hydration.
 */

const KEY = 'portfolio-os-theme';
const root = document.documentElement;

function boot(blob?: unknown) {
  if (blob !== undefined) localStorage.setItem(KEY, JSON.stringify(blob));
  new Function(THEME_BOOT_SCRIPT)();
}

beforeEach(() => {
  localStorage.clear();
  root.className = '';
  delete root.dataset.palette;
  root.removeAttribute('style');
});

describe('THEME_BOOT_SCRIPT', () => {
  it('paints dark and color for a first-time visitor', () => {
    boot();
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.dataset.palette).toBe('color');
  });

  it('paints color for a pre-v1 mono visitor (the store will migrate them)', () => {
    boot({ state: { palette: 'mono', mode: 'dark' }, version: 0 });
    expect(root.dataset.palette).toBe('color');
  });

  it('paints mono for a visitor who chose mono after the migration', () => {
    boot({ state: { palette: 'mono', mode: 'light' }, version: 1 });
    expect(root.dataset.palette).toBe('mono');
    expect(root.classList.contains('dark')).toBe(false);
  });

  it('applies a stored custom accent before paint', () => {
    boot({ state: { palette: 'color', accentColor: '#FF9500', mode: 'dark' }, version: 1 });
    expect(root.style.getPropertyValue('--color-accent')).toBe('255 149 0');
    expect(root.style.getPropertyValue('--primary')).toBe('255 149 0');
    expect(root.style.getPropertyValue('--ring')).toBe('255 149 0');
  });

  it('leaves the blurple default to the stylesheet', () => {
    boot({ state: { palette: 'color', accentColor: '#635BFF', mode: 'dark' }, version: 1 });
    expect(root.style.getPropertyValue('--color-accent')).toBe('');
  });

  it('ignores a pre-v1 accent, since the store resets it to blurple', () => {
    boot({ state: { palette: 'color', accentColor: '#FF9500' }, version: 0 });
    expect(root.style.getPropertyValue('--color-accent')).toBe('');
  });

  it('falls back to dark and color on a corrupt blob', () => {
    localStorage.setItem(KEY, '{not json');
    new Function(THEME_BOOT_SCRIPT)();
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.dataset.palette).toBe('color');
  });
});
