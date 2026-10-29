// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest';
import { useOSStore } from '@/store/osStore';

const reset = () =>
  useOSStore.setState({
    windows: [],
    activeWindowId: null,
    nextZIndex: 1000,
    windowCounter: 1,
    isBooted: false,
  });

describe('osStore.snapWindow', () => {
  beforeEach(reset);

  it('applies the snapped bounds, clears maximize, and brings the window to front', () => {
    const store = useOSStore.getState();
    store.openWindow('about-me');

    const id = useOSStore.getState().windows[0].id;
    const zBefore = useOSStore.getState().nextZIndex;

    // Maximize first so we can prove snap clears it.
    useOSStore.getState().maximizeWindow(id);
    expect(useOSStore.getState().windows[0].isMaximized).toBe(true);

    useOSStore.getState().snapWindow(id, { x: 0, y: 28, width: 500, height: 712 });

    const win = useOSStore.getState().windows[0];
    expect(win.position).toEqual({ x: 0, y: 28 });
    expect(win.size).toEqual({ width: 500, height: 712 });
    expect(win.isMaximized).toBe(false);
    expect(win.zIndex).toBe(zBefore);
    expect(useOSStore.getState().activeWindowId).toBe(id);
    expect(useOSStore.getState().nextZIndex).toBe(zBefore + 1);
  });

  it('leaves other windows untouched', () => {
    const store = useOSStore.getState();
    store.openWindow('about-me');
    store.openWindow('projects');

    const [a, b] = useOSStore.getState().windows;
    const bPosBefore = { ...b.position };

    useOSStore.getState().snapWindow(a.id, { x: 0, y: 28, width: 500, height: 712 });

    const bAfter = useOSStore.getState().windows.find((w) => w.id === b.id)!;
    expect(bAfter.position).toEqual(bPosBefore);
  });
});

describe('osStore.openWindow sizing', () => {
  beforeEach(reset);

  const setViewport = (w: number, h: number) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: h });
  };

  it('opens About Me large and centered on a 1440x900 screen', () => {
    setViewport(1440, 900);
    useOSStore.getState().openWindow('about-me');
    const win = useOSStore.getState().windows[0];
    expect(win.size).toEqual({ width: 1040, height: 720 });
    expect(win.position).toEqual({ x: 200, y: 67 });
  });

  it('shrinks every default window to fit a 1280x720 screen', () => {
    setViewport(1280, 720);
    const apps = ['about-me', 'projects', 'analytics', 'resume', 'browser', 'help'] as const;
    apps.forEach((app) => useOSStore.getState().openWindow(app));
    for (const win of useOSStore.getState().windows) {
      expect(win.position.x).toBeGreaterThanOrEqual(0);
      expect(win.position.y).toBeGreaterThanOrEqual(28);
      expect(win.position.x + win.size.width).toBeLessThanOrEqual(1280);
      expect(win.position.y + win.size.height).toBeLessThanOrEqual(720 - 60);
    }
  });

  it('keeps a custom position when it fits', () => {
    setViewport(1440, 900);
    useOSStore.getState().openWindow('resume', { position: { x: 280, y: 60 } });
    expect(useOSStore.getState().windows[0].position).toEqual({ x: 280, y: 60 });
  });
});

describe('osStore.updateWindowSize', () => {
  beforeEach(reset);

  it('sets only the target window size', () => {
    useOSStore.getState().openWindow('about-me');
    useOSStore.getState().openWindow('projects');
    const [a, b] = useOSStore.getState().windows;
    useOSStore.getState().updateWindowSize(a.id, { width: 500, height: 420 });
    const after = useOSStore.getState().windows;
    expect(after[0].size).toEqual({ width: 500, height: 420 });
    expect(after[1].size).toEqual(b.size);
  });
});
