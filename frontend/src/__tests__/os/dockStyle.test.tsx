// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useOSStore } from '@/store/osStore';
import { useThemeStore } from '@/store/themeStore';
import { FLAVORS } from '@/lib/appTile';

vi.mock('@/components/os/Launchpad', () => ({ Launchpad: () => null }));
vi.mock('@/components/os/FirstVisitHint', () => ({ default: () => null }));

import Taskbar from '@/components/os/Taskbar';

/** The dock in the color palette: navy glass, running dots in the app's family color. */

const dock = () => document.querySelector<HTMLElement>('nav[aria-label="Dock"]')!;
const runningDot = (label: RegExp) =>
  [...document.querySelectorAll<HTMLElement>('button')]
    .find((b) => label.test(b.getAttribute('aria-label') ?? ''))!
    .querySelector<HTMLElement>('[data-running-dot]');

beforeEach(() => {
  localStorage.clear();
  useOSStore.setState({ windows: [], activeWindowId: null, nextZIndex: 1000, windowCounter: 1, isBooted: false });
  useThemeStore.setState({ palette: 'color', mode: 'dark' });
});

describe('dock (color palette)', () => {
  it('tints the glass navy in dark mode', () => {
    render(<Taskbar />);
    expect(dock().style.background).toBe('oklch(0.22 0.05 268 / 0.55)');
    expect(dock().style.boxShadow).toContain('#0d173840');
  });

  it('tints the glass a cool white in light mode', () => {
    useThemeStore.setState({ mode: 'light' });
    render(<Taskbar />);
    expect(dock().style.background).toBe('oklch(0.98 0.005 248 / 0.6)');
  });

  it('colors the running dot with the app family color', () => {
    useOSStore.getState().openWindow('about-me');
    render(<Taskbar />);
    expect(FLAVORS.chroma.back).toBe('#00d4ff');
    expect(runningDot(/^About Me, open/)!.style.background).toBe('rgb(0, 212, 255)');
  });

  it('pulses the Launchpad button in the accent color for first-time visitors', () => {
    render(<Taskbar />);
    const ring = document.querySelector<HTMLElement>('.animate-ping')!;
    expect(ring.style.background).toBe('rgb(var(--color-accent) / 0.35)');
  });

  it('leaves the mono dock as it was', () => {
    useThemeStore.setState({ palette: 'mono' });
    useOSStore.getState().openWindow('about-me');
    render(<Taskbar />);
    expect(dock().style.background).toBe('rgba(30, 30, 30, 0.5)');
    expect(runningDot(/^About Me, open/)!.className).toContain('bg-text/80');
  });
});
