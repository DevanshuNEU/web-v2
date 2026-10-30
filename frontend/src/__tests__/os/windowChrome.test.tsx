// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useOSStore } from '@/store/osStore';
import { useThemeStore } from '@/store/themeStore';
import Window from '@/components/os/Window';
import { ease } from '@/lib/motion';

/**
 * Window chrome in the Stripe register: layered navy-tinted shadows, no accent
 * ring, ringed traffic lights that go quiet on inactive windows.
 */

const ACTIVE_DARK =
  '0 0 0 1px oklch(1 0 0 / 0.06), 0 50px 100px -20px rgba(50,50,93,0.25), 0 30px 60px -30px rgba(0,0,0,0.5)';
const ACTIVE_LIGHT =
  '0 0 0 1px oklch(1 0 0 / 0.06), 0 50px 100px -20px rgba(50,50,93,0.25), 0 30px 60px -30px rgba(0,0,0,0.3)';
const INACTIVE = '0 30px 45px -30px rgba(50,50,93,0.25), 0 18px 36px -18px rgba(0,0,0,0.1)';

function Host() {
  const wins = useOSStore((s) => s.windows);
  return (
    <>
      {wins.map((w) => (
        <Window key={w.id} window={w}>
          <div />
        </Window>
      ))}
    </>
  );
}

const windows = () => [...document.querySelectorAll<HTMLElement>('[data-window]')];
const lights = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-traffic-light]')];
const norm = (s: string) => s.replace(/\s+/g, ' ').replace(/,\s*/g, ',');

beforeEach(() => {
  useOSStore.setState({ windows: [], activeWindowId: null, nextZIndex: 1000, windowCounter: 1, isBooted: false });
  useThemeStore.setState({ palette: 'color', mode: 'dark' });
});

describe('window chrome', () => {
  it('gives the active window the layered Stripe shadow and no accent ring (dark)', () => {
    useOSStore.getState().openWindow('about-me');
    render(<Host />);
    const shadow = windows()[0].style.boxShadow;
    expect(norm(shadow)).toBe(norm(ACTIVE_DARK));
    expect(shadow).not.toContain('--color-accent');
  });

  it('uses the lighter last layer in light mode', () => {
    useThemeStore.setState({ mode: 'light' });
    useOSStore.getState().openWindow('about-me');
    render(<Host />);
    expect(norm(windows()[0].style.boxShadow)).toBe(norm(ACTIVE_LIGHT));
  });

  it('gives inactive windows the soft shadow', () => {
    useOSStore.getState().openWindow('about-me');
    useOSStore.getState().openWindow('projects');
    render(<Host />);
    expect(norm(windows()[0].style.boxShadow)).toBe(norm(INACTIVE));
  });

  it('rings the traffic lights with the spec fills in the color palette', () => {
    useOSStore.getState().openWindow('about-me');
    render(<Host />);
    const [close, min, zoom] = lights(windows()[0]);
    expect(close.style.background).toBe('oklch(0.68 0.2 27)');
    expect(min.style.background).toBe('oklch(0.84 0.16 84)');
    expect(zoom.style.background).toBe('oklch(0.76 0.19 145)');
    expect(close.style.boxShadow).toContain('inset 0 0 0 0.5px');
    expect(close.style.transition).toBe('background-color 150ms cubic-bezier(0.25, 1, 0.5, 1)');
  });

  it('greys out the traffic lights of an inactive window and hides their glyphs', () => {
    useOSStore.getState().openWindow('about-me');
    useOSStore.getState().openWindow('projects');
    render(<Host />);
    const inactive = lights(windows()[0]);
    expect(inactive).toHaveLength(3);
    inactive.forEach((l) => {
      expect(l.style.background).toBe('oklch(0.55 0.015 260 / 0.45)');
      expect(l.querySelector('svg')).toBeNull();
    });
  });

  it('keeps the mono traffic lights as they were', () => {
    useThemeStore.setState({ palette: 'mono' });
    useOSStore.getState().openWindow('about-me');
    render(<Host />);
    const [close] = lights(windows()[0]);
    expect(close.className).toContain('bg-black/45');
    expect(close.style.background).toBe('');
  });

  it('exposes the Stripe easing curve', () => {
    expect(ease.stripe).toEqual([0.25, 1, 0.5, 1]);
  });
});
