// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { AnimatePresence, MotionGlobalConfig } from 'framer-motion';
import { useOSStore } from '@/store/osStore';
import Window from '@/components/os/Window';
import { registerDockIcon } from '@/lib/dockRegistry';
import { appRegistry } from '@/lib/appRegistry';
import { DEFAULT_MIN_SIZE, type ResizeDir } from '@/lib/windowGeometry';

/**
 * Edge and corner resize: live bounds go straight to the element's inline
 * style, and the store gets one setWindowBounds on release. Store traffic is
 * counted with `useOSStore.subscribe` (every notification).
 */

const VW = 1440;
const VH = 900;
const START = { x: 200, y: 100 };
const SIZE = { width: 600, height: 400 };
const MIN = appRegistry['about-me'].minSize ?? DEFAULT_MIN_SIZE;

const reset = () =>
  useOSStore.setState({
    windows: [],
    activeWindowId: null,
    nextZIndex: 1000,
    windowCounter: 1,
    isBooted: false,
  });

const flag = () => document.documentElement.hasAttribute('data-window-drag');

function openAboutMe(position = START, size = SIZE) {
  useOSStore.getState().openWindow('about-me');
  const id = useOSStore.getState().windows[0].id;
  useOSStore.setState((s) => ({
    windows: s.windows.map((w) => (w.id === id ? { ...w, position, size } : w)),
  }));
  return id;
}

const stored = () => useOSStore.getState().windows[0];

/** Renders the first window from the store, so commits re-render it like WindowManager does. */
function Host() {
  const win = useOSStore((s) => s.windows[0]);
  if (!win) return null;
  return (
    <Window window={win}>
      <div />
    </Window>
  );
}

/** Mirrors WindowManager: minimized windows drop out of AnimatePresence. */
function PresenceHost() {
  const win = useOSStore((s) => s.windows.find((w) => !w.isMinimized));
  return (
    <AnimatePresence>
      {win && (
        <Window key={win.id} window={win}>
          <div />
        </Window>
      )}
    </AnimatePresence>
  );
}

const windowEl = () => document.querySelector('[data-window]') as HTMLElement;
const handle = (dir: ResizeDir) => document.querySelector(`[data-resize="${dir}"]`) as HTMLElement;
const content = () => document.querySelector('.app-content') as HTMLElement;

/** Mount and wait for the open animation to land before any gesture. */
async function renderWindow(ui: React.ReactElement = <Host />) {
  const utils = render(ui);
  await waitFor(() => {
    expect(windowEl().style.opacity).toBe('1');
    expect(windowEl().style.transform).toBe('none');
  });
  return { ...utils, el: windowEl() };
}

function trackStore() {
  const counts = { notify: 0 };
  const unsub = useOSStore.subscribe(() => {
    counts.notify += 1;
  });
  return { counts, unsub };
}

const down = (el: Element, x: number, y: number, extra: Record<string, unknown> = {}) =>
  fireEvent.pointerDown(el, { button: 0, pointerId: 1, clientX: x, clientY: y, ...extra });
const move = (el: Element, x: number, y: number, pointerId = 1) =>
  fireEvent.pointerMove(el, { pointerId, clientX: x, clientY: y });
const up = (el: Element, x: number, y: number, pointerId = 1) =>
  fireEvent.pointerUp(el, { button: 0, pointerId, clientX: x, clientY: y });

const liveBounds = (el: HTMLElement) => ({
  left: el.style.left,
  top: el.style.top,
  width: el.style.width,
  height: el.style.height,
});

beforeEach(() => {
  reset();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: VW });
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: VH });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: VW });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: VH });
});

afterEach(() => {
  delete document.documentElement.dataset.windowDrag;
  MotionGlobalConfig.skipAnimations = true;
});

describe('window resize', () => {
  it('se: live bounds on the element during the move, one commit on release', async () => {
    openAboutMe();
    const { el } = await renderWindow();
    const h = handle('se');
    const { counts, unsub } = trackStore();

    down(h, 800, 500);
    expect(flag()).toBe(true);
    expect(content().className).toContain('pointer-events-none');
    expect(content().className).toContain('select-none');
    move(h, 850, 530);
    expect(el.style.width).toBe('650px');
    expect(el.style.height).toBe('430px');
    move(h, 900, 560);

    expect(stored().size).toEqual(SIZE);
    expect(stored().position).toEqual(START);
    expect(counts.notify).toBe(0);
    expect(liveBounds(el)).toEqual({ left: '200px', top: '100px', width: '700px', height: '460px' });

    up(h, 900, 560);
    unsub();

    expect(stored().size).toEqual({ width: SIZE.width + 100, height: SIZE.height + 60 });
    expect(stored().position).toEqual(START);
    expect(counts.notify).toBe(1);
    expect(flag()).toBe(false);
    expect(content().className).not.toContain('pointer-events-none');
    // The commit renders the same values the resize left on the element.
    expect(liveBounds(el)).toEqual({ left: '200px', top: '100px', width: '700px', height: '460px' });
  });

  it('nw: moves the origin and shrinks, in one notification', async () => {
    openAboutMe();
    const { el } = await renderWindow();
    const h = handle('nw');
    const { counts, unsub } = trackStore();

    down(h, 200, 100);
    move(h, 240, 120);
    expect(liveBounds(el)).toEqual({ left: '240px', top: '120px', width: '560px', height: '380px' });
    expect(counts.notify).toBe(0);
    up(h, 240, 120);
    unsub();

    expect(stored().position).toEqual({ x: START.x + 40, y: START.y + 20 });
    expect(stored().size).toEqual({ width: SIZE.width - 40, height: SIZE.height - 20 });
    expect(counts.notify).toBe(1);
  });

  it('w: stops at the min width when dragged far right', async () => {
    openAboutMe();
    const { el } = await renderWindow();
    const h = handle('w');

    down(h, 200, 300);
    move(h, 1300, 300);
    expect(el.style.width).toBe(`${MIN.width}px`);
    up(h, 1300, 300);

    expect(stored().size).toEqual({ width: MIN.width, height: SIZE.height });
    expect(stored().position).toEqual({ x: START.x + SIZE.width - MIN.width, y: START.y });
  });

  it('commits whole pixels for fractional pointer coordinates', async () => {
    openAboutMe();
    await renderWindow();
    const h = handle('e');

    down(h, 800.4, 300);
    move(h, 850.9, 300);
    up(h, 850.9, 300);

    expect(stored().size).toEqual({ width: 651, height: SIZE.height });
  });

  it('no movement: zero writes', async () => {
    openAboutMe();
    await renderWindow();
    const h = handle('se');
    const { counts, unsub } = trackStore();

    down(h, 800, 500);
    up(h, 800, 500);
    unsub();

    expect(counts.notify).toBe(0);
    expect(flag()).toBe(false);
  });

  it('a move that ends back at the start writes nothing', async () => {
    openAboutMe();
    await renderWindow();
    const h = handle('se');
    const { counts, unsub } = trackStore();

    down(h, 800, 500);
    move(h, 850, 530);
    move(h, 800, 500);
    up(h, 800, 500);
    unsub();

    expect(counts.notify).toBe(0);
  });

  it('right button does not resize', async () => {
    openAboutMe();
    await renderWindow();
    const h = handle('se');

    down(h, 800, 500, { button: 2 });
    expect(flag()).toBe(false);
    move(h, 900, 560);
    up(h, 900, 560);

    expect(stored().size).toEqual(SIZE);
    expect(Element.prototype.setPointerCapture).not.toHaveBeenCalled();
  });

  it('an unrelated store update mid-resize keeps the live bounds', async () => {
    openAboutMe();
    const { el } = await renderWindow();
    const h = handle('se');

    down(h, 800, 500);
    move(h, 900, 560);
    // Another window opens and this one gets a new object (z-order change),
    // so Window re-renders with its stored size still unchanged.
    act(() => {
      useOSStore.getState().openWindow('projects');
      useOSStore.setState((s) => ({
        windows: s.windows.map((w, i) => (i === 0 ? { ...w, zIndex: w.zIndex - 1 } : w)),
      }));
    });
    expect(stored().size).toEqual(SIZE);
    expect(el.style.width).toBe('700px');
    expect(el.style.height).toBe('460px');

    move(h, 920, 570);
    up(h, 920, 570);
    expect(stored().size).toEqual({ width: 720, height: 470 });
    expect(el.style.width).toBe('720px');
  });

  it('pointercancel commits once and ends the resize', async () => {
    openAboutMe();
    await renderWindow();
    const h = handle('e');

    down(h, 800, 300);
    move(h, 850, 300);
    fireEvent.pointerCancel(h, { pointerId: 1, clientX: 850, clientY: 300 });
    expect(stored().size).toEqual({ width: 650, height: SIZE.height });
    expect(flag()).toBe(false);

    const { counts, unsub } = trackStore();
    move(h, 1000, 300);
    up(h, 1000, 300);
    fireEvent.lostPointerCapture(h, { pointerId: 1 });
    unsub();
    expect(counts.notify).toBe(0);
    expect(stored().size).toEqual({ width: 650, height: SIZE.height });
  });

  it('lostpointercapture commits once and ends the resize', async () => {
    openAboutMe();
    await renderWindow();
    const h = handle('s');

    down(h, 500, 500);
    move(h, 500, 540);
    fireEvent.lostPointerCapture(h, { pointerId: 1 });
    expect(stored().size).toEqual({ width: SIZE.width, height: 440 });
    expect(flag()).toBe(false);

    const { counts, unsub } = trackStore();
    up(h, 500, 600);
    unsub();
    expect(counts.notify).toBe(0);
  });

  it('second pointer is ignored', async () => {
    openAboutMe();
    const { el } = await renderWindow();
    const h = handle('se');

    down(h, 800, 500, { pointerId: 1 });
    move(h, 1000, 700, 2);
    expect(el.style.width).toBe(`${SIZE.width}px`);
    up(h, 1000, 700, 2);
    expect(flag()).toBe(true);
    // A second press on another handle does not restart the session either.
    down(handle('nw'), 200, 100, { pointerId: 2 });
    move(h, 850, 530, 1);
    up(h, 850, 530, 1);

    expect(stored().size).toEqual({ width: 650, height: 430 });
    expect(stored().position).toEqual(START);
    expect(flag()).toBe(false);
  });

  it('unmount mid-resize clears the gesture flag', async () => {
    openAboutMe();
    const { unmount } = await renderWindow();
    const h = handle('se');

    down(h, 800, 500);
    move(h, 850, 530);
    expect(flag()).toBe(true);
    unmount();

    expect(flag()).toBe(false);
  });

  it('maximize mid-resize ends the gesture and keeps what was resized for restore', async () => {
    openAboutMe();
    await renderWindow();
    const h = handle('se');

    down(h, 800, 500);
    move(h, 850, 530);
    act(() => useOSStore.getState().maximizeWindow(stored().id));

    expect(flag()).toBe(false);
    expect(stored().size).toEqual({ width: 650, height: 430 });
    expect(content().className).not.toContain('pointer-events-none');
  });

  it('drag tests still see the titlebar move untouched by resize state', async () => {
    openAboutMe();
    const { el } = await renderWindow();
    const bar = screen.getByText(stored().title).closest('div.cursor-move') as HTMLElement;

    down(bar, 400, 100);
    move(bar, 450, 120);
    up(bar, 450, 120);

    expect(stored().position).toEqual({ x: 250, y: 120 });
    expect(stored().size).toEqual(SIZE);
    expect(el.style.width).toBe(`${SIZE.width}px`);
  });
});

describe('resize while the window is leaving', () => {
  it('a press during the close animation is ignored and the window is still removed', async () => {
    openAboutMe();
    await renderWindow(<PresenceHost />);
    const h = handle('se');

    MotionGlobalConfig.skipAnimations = false;
    act(() => useOSStore.getState().closeWindow(stored().id));
    expect(windowEl()).not.toBeNull();
    down(h, 800, 500);
    move(h, 900, 560);
    expect(flag()).toBe(false);
    expect(Element.prototype.setPointerCapture).not.toHaveBeenCalled();

    await waitFor(() => expect(document.querySelector('[data-window]')).toBeNull(), { timeout: 3000 });
  });

  it('a press during the genie minimize is ignored and the minimize still commits', async () => {
    const unregister = registerDockIcon('about-me', () => new DOMRect(700, 840, 48, 48));
    try {
      openAboutMe();
      await renderWindow(<PresenceHost />);
      const h = handle('se');

      MotionGlobalConfig.skipAnimations = false;
      fireEvent.click(screen.getByRole('button', { name: `Minimize ${stored().title}` }));
      down(h, 800, 500);
      move(h, 900, 560);
      expect(flag()).toBe(false);
      expect(Element.prototype.setPointerCapture).not.toHaveBeenCalled();

      await waitFor(() => expect(stored().isMinimized).toBe(true), { timeout: 3000 });
      expect(stored().size).toEqual(SIZE);
    } finally {
      unregister();
    }
  });

  it('a store minimize mid-resize commits what was resized, not later moves', async () => {
    openAboutMe();
    await renderWindow(<PresenceHost />);
    const h = handle('se');

    down(h, 800, 500);
    move(h, 850, 530);
    MotionGlobalConfig.skipAnimations = false;
    act(() => useOSStore.getState().minimizeWindow(stored().id));
    // Moves during the exit are ignored.
    move(h, 1000, 700);

    await waitFor(() => expect(document.querySelector('[data-window]')).toBeNull(), { timeout: 3000 });
    expect(flag()).toBe(false);
    expect(stored().size).toEqual({ width: 650, height: 430 });
  });

  it('a store close mid-resize writes nothing and clears the flag', async () => {
    openAboutMe();
    await renderWindow(<PresenceHost />);
    const h = handle('se');

    down(h, 800, 500);
    move(h, 850, 530);
    MotionGlobalConfig.skipAnimations = false;
    act(() => useOSStore.getState().closeWindow(stored().id));
    const { counts, unsub } = trackStore();

    await waitFor(() => expect(document.querySelector('[data-window]')).toBeNull(), { timeout: 3000 });
    unsub();
    expect(flag()).toBe(false);
    expect(counts.notify).toBe(0);
  });
});
