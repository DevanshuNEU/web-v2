// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { useOSStore } from '@/store/osStore';
import Window from '@/components/os/Window';
import { useWindowDrag } from '@/hooks/useWindowDrag';
import { AnimatePresence, MotionGlobalConfig } from 'framer-motion';
import { registerDockIcon } from '@/lib/dockRegistry';

/**
 * Titlebar drag: pointer-captured, moved on x/y MotionValues, committed to the
 * store once on release. Store traffic is counted with `useOSStore.subscribe`
 * (every notification) and by position reference changes (position writes).
 */

const VW = 1440;
const VH = 900;
const START = { x: 200, y: 100 };
const SIZE = { width: 600, height: 400 };

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

/** Renders the window from the store, so commits re-render it like WindowManager does. */
function Host() {
  const win = useOSStore((s) => s.windows[0]);
  if (!win) return null;
  return (
    <Window window={win}>
      <div />
    </Window>
  );
}

const titlebar = () => screen.getByText(stored().title).closest('div.cursor-move') as HTMLElement;
const windowEl = () => document.querySelector('[data-window]') as HTMLElement;

/**
 * Mount and wait for the open animation to land. With skipAnimations Motion
 * applies the final keyframe in the next frame, outside any animation that
 * `stop()` can cancel, so a drag started before then would be overwritten.
 */
async function renderWindow() {
  const utils = render(<Host />);
  await waitFor(() => {
    expect(windowEl().style.opacity).toBe('1');
    expect(windowEl().style.transform).toBe('none');
  });
  return { ...utils, bar: titlebar(), el: windowEl() };
}

/** Counts every store notification and every write that changed a position. */
function trackStore() {
  const counts = { notify: 0, positionWrites: 0 };
  const unsub = useOSStore.subscribe((s, prev) => {
    counts.notify += 1;
    if (s.windows[0]?.position !== prev.windows[0]?.position) counts.positionWrites += 1;
  });
  return { counts, unsub };
}

const down = (el: Element, x: number, y: number, extra: Record<string, unknown> = {}) =>
  fireEvent.pointerDown(el, { button: 0, pointerId: 1, clientX: x, clientY: y, ...extra });
const move = (el: Element, x: number, y: number, pointerId = 1) =>
  fireEvent.pointerMove(el, { pointerId, clientX: x, clientY: y });
const up = (el: Element, x: number, y: number, pointerId = 1) =>
  fireEvent.pointerUp(el, { button: 0, pointerId, clientX: x, clientY: y });

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
});

describe('window titlebar drag', () => {
  it('moves 1:1 and commits once on release', async () => {
    openAboutMe();
    const { bar, el } = await renderWindow();
    const { counts, unsub } = trackStore();

    down(bar, 400, 100);
    expect(flag()).toBe(true);
    move(bar, 420, 110);
    move(bar, 450, 130);
    move(bar, 500, 160);

    expect(stored().position).toEqual(START);
    expect(counts.notify).toBe(0);
    // The offset reaches the DOM as a transform, not as left/top.
    await waitFor(() => expect(el.style.transform).toContain('translateX(100px)'));
    expect(el.style.transform).toContain('translateY(60px)');
    expect(el.style.left).toBe(`${START.x}px`);

    up(bar, 500, 160);
    unsub();

    expect(stored().position).toEqual({ x: START.x + 100, y: START.y + 60 });
    expect(counts.notify).toBe(1);
    expect(counts.positionWrites).toBe(1);
    expect(flag()).toBe(false);
    // x/y return to 0 so left/top alone place the window.
    await waitFor(() => expect(el.style.transform).not.toContain('translateX(100px)'));
    expect(el.style.left).toBe(`${START.x + 100}px`);
  });

  it('no write when the pointer did not move', async () => {
    openAboutMe();
    const { bar } = await renderWindow();
    const { counts, unsub } = trackStore();

    down(bar, 400, 100);
    up(bar, 400, 100);
    unsub();

    expect(counts.positionWrites).toBe(0);
    expect(counts.notify).toBe(0);
    expect(flag()).toBe(false);
  });

  it('right button does not drag', async () => {
    openAboutMe();
    const { bar } = await renderWindow();

    down(bar, 400, 100, { button: 2 });
    expect(flag()).toBe(false);
    move(bar, 500, 200);
    up(bar, 500, 200);

    expect(stored().position).toEqual(START);
    expect(Element.prototype.setPointerCapture).not.toHaveBeenCalled();
  });

  it('drag does not start from a traffic light', async () => {
    openAboutMe();
    await renderWindow();
    const close = screen.getByRole('button', { name: `Close ${stored().title}` });

    down(close, 30, 100);

    expect(flag()).toBe(false);
    expect(Element.prototype.setPointerCapture).not.toHaveBeenCalled();
  });

  it('pointercancel ends the drag', async () => {
    openAboutMe();
    const { bar } = await renderWindow();

    down(bar, 400, 100);
    move(bar, 450, 120);
    fireEvent.pointerCancel(bar, { pointerId: 1, clientX: 450, clientY: 120 });

    expect(stored().position).toEqual({ x: START.x + 50, y: START.y + 20 });
    expect(flag()).toBe(false);

    const { counts, unsub } = trackStore();
    move(bar, 700, 300);
    up(bar, 700, 300);
    unsub();
    expect(counts.notify).toBe(0);
    expect(stored().position).toEqual({ x: START.x + 50, y: START.y + 20 });
  });

  it('lostpointercapture ends the drag', async () => {
    openAboutMe();
    const { bar } = await renderWindow();

    down(bar, 400, 100);
    move(bar, 450, 120);
    fireEvent.lostPointerCapture(bar, { pointerId: 1 });

    expect(stored().position).toEqual({ x: START.x + 50, y: START.y + 20 });
    expect(flag()).toBe(false);

    const { counts, unsub } = trackStore();
    move(bar, 700, 300);
    up(bar, 700, 300);
    unsub();
    expect(counts.notify).toBe(0);
  });

  it('unmount mid-drag clears the gesture flag', async () => {
    openAboutMe();
    const { bar, unmount } = await renderWindow();

    down(bar, 400, 100);
    move(bar, 450, 120);
    expect(flag()).toBe(true);
    unmount();

    expect(flag()).toBe(false);
  });

  it('ignored while maximized', async () => {
    const id = openAboutMe();
    useOSStore.getState().maximizeWindow(id);
    const { bar } = await renderWindow();

    down(bar, 400, 100);
    expect(flag()).toBe(false);
    move(bar, 500, 200);
    up(bar, 500, 200);

    expect(stored().position).toEqual(START);
    expect(Element.prototype.setPointerCapture).not.toHaveBeenCalled();
  });

  it('second pointer is ignored', async () => {
    openAboutMe();
    const { bar } = await renderWindow();
    const { counts, unsub } = trackStore();

    down(bar, 400, 100, { pointerId: 1 });
    move(bar, 900, 500, 2);
    // A second pointer lifting must not end the captured drag either.
    up(bar, 900, 500, 2);
    expect(flag()).toBe(true);
    up(bar, 400, 100, 1);
    unsub();

    expect(stored().position).toEqual(START);
    expect(counts.positionWrites).toBe(0);
    expect(flag()).toBe(false);
  });

  it('double-click still maximizes without a position write', async () => {
    openAboutMe();
    const { bar } = await renderWindow();
    const { counts, unsub } = trackStore();

    down(bar, 400, 100);
    up(bar, 400, 100);
    down(bar, 400, 100);
    up(bar, 400, 100);
    fireEvent.doubleClick(bar, { clientX: 400, clientY: 100 });
    unsub();

    expect(stored().isMaximized).toBe(true);
    expect(counts.positionWrites).toBe(0);
    expect(flag()).toBe(false);
  });

  it('snap on release', async () => {
    openAboutMe();
    const { bar } = await renderWindow();

    down(bar, 400, 100);
    move(bar, 700, 400);
    move(bar, 4, 400);
    // The preview shows while the pointer sits in the left zone.
    expect(document.querySelector('[data-snap-preview]')).not.toBeNull();
    up(bar, 4, 400);

    expect(document.querySelector('[data-snap-preview]')).toBeNull();
    await waitFor(() => expect(stored().position).toEqual({ x: 0, y: 28 }));
    expect(stored().size).toEqual({ width: Math.round(VW / 2), height: VH - 28 - 74 });
  });

  it('no snap if the drag never left the zone', async () => {
    openAboutMe({ x: 0, y: 300 });
    const { bar } = await renderWindow();

    down(bar, 4, 400);
    move(bar, 6, 420);
    expect(document.querySelector('[data-snap-preview]')).toBeNull();
    up(bar, 6, 420);

    // Give a pending frame.postRender a chance to run before asserting.
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(stored().size).toEqual(SIZE);
    expect(stored().position).toEqual({ x: 2, y: 320 });
  });
});

describe('drag during the open animation', () => {
  afterEach(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  it('grabbing mid-rise stops the spring and keeps the window under the pointer', async () => {
    MotionGlobalConfig.skipAnimations = false;
    openAboutMe();
    render(<Host />);
    const bar = titlebar();
    const el = windowEl();
    // Mounted with initial y 30; the rise to 0 has been started but not ticked.
    expect(el.style.transform).toContain('translateY(30px)');

    down(bar, 400, 100);
    move(bar, 450, 100);
    // Long enough for the open spring to have moved y if it were still running.
    await act(() => new Promise((r) => setTimeout(r, 150)));
    expect(el.style.transform).toContain('translateX(50px)');
    expect(el.style.transform).toContain('translateY(30px)');
    up(bar, 450, 100);

    expect(stored().position).toEqual({ x: START.x + 50, y: START.y + 30 });
  });

  // Stands in for an in-flight open rise: jsdom cannot drive a real Motion
  // spring reliably, so the hook's x/y hold a non-zero offset at pointerdown.
  it('drag start includes the in-flight x/y, so the window does not jump', () => {
    openAboutMe();
    let hook: ReturnType<typeof useWindowDrag> | null = null;
    function Harness() {
      const win = useOSStore((s) => s.windows[0]);
      hook = useWindowDrag(win);
      return <div data-testid="bar" {...hook.titlebarProps} />;
    }
    render(<Harness />);
    const bar = screen.getByTestId('bar');

    act(() => {
      hook!.x.set(-12.4);
      hook!.y.set(18.6);
    });

    down(bar, 400, 100);
    // Nothing moved yet: the window holds its in-flight spot.
    expect(hook!.x.get()).toBe(-12.4);
    expect(hook!.y.get()).toBe(18.6);
    move(bar, 450, 110);
    // Whole pixels: 200 - 12.4 + 50 = 237.6 -> 238, 100 + 18.6 + 10 = 128.6 -> 129.
    expect(hook!.x.get()).toBe(38);
    expect(hook!.y.get()).toBe(29);
    up(bar, 450, 110);

    expect(stored().position).toEqual({ x: 238, y: 129 });
    expect(hook!.x.get()).toBe(0);
    expect(hook!.y.get()).toBe(0);
  });

  it('a snap bumps layoutKey in the same render that applies the snapped bounds', async () => {
    openAboutMe();
    const renders: { key: number; width: number }[] = [];
    function Harness() {
      const win = useOSStore((s) => s.windows[0]);
      const drag = useWindowDrag(win);
      renders.push({ key: drag.layoutKey, width: win.size.width });
      return <div data-testid="bar" {...drag.titlebarProps} />;
    }
    render(<Harness />);
    const bar = screen.getByTestId('bar');

    down(bar, 400, 100);
    move(bar, 700, 400);
    move(bar, 4, 400);
    up(bar, 4, 400);
    await waitFor(() => expect(stored().size.width).toBe(Math.round(VW / 2)));

    // layoutDependency must change in the commit where the size changes, or
    // Motion would not measure and the snap would jump instead of animate.
    const snapped = renders.filter((r) => r.width === Math.round(VW / 2));
    expect(snapped.length).toBeGreaterThan(0);
    expect(snapped.every((r) => r.key === 1)).toBe(true);
  });
});

describe('presses that must not touch x/y', () => {
  afterEach(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

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

  it('a click during the open rise leaves the open animation running', async () => {
    MotionGlobalConfig.skipAnimations = false;
    openAboutMe();
    render(<Host />);
    const bar = titlebar();
    const el = windowEl();
    expect(el.style.transform).toContain('translateY(30px)');
    const { counts, unsub } = trackStore();

    down(bar, 400, 100);
    up(bar, 400, 100);
    expect(flag()).toBe(false);

    await waitFor(() => expect(el.style.transform).toBe('none'), { timeout: 3000 });
    unsub();
    expect(counts.positionWrites).toBe(0);
    expect(stored().position).toEqual(START);
  });

  it('a press during the close animation is ignored and the window is still removed', async () => {
    openAboutMe();
    render(<PresenceHost />);
    await waitFor(() => expect(windowEl().style.opacity).toBe('1'));
    const bar = titlebar();

    MotionGlobalConfig.skipAnimations = false;
    act(() => useOSStore.getState().closeWindow(stored().id));
    expect(windowEl()).not.toBeNull();
    down(bar, 400, 100);
    move(bar, 450, 120);
    expect(flag()).toBe(false);
    expect(Element.prototype.setPointerCapture).not.toHaveBeenCalled();

    await waitFor(() => expect(document.querySelector('[data-window]')).toBeNull(), { timeout: 3000 });
  });

  it('a press during the genie minimize is ignored and the minimize still commits', async () => {
    const unregister = registerDockIcon('about-me', () => new DOMRect(700, 840, 48, 48));
    try {
      openAboutMe();
      render(<PresenceHost />);
      await waitFor(() => expect(windowEl().style.opacity).toBe('1'));
      const bar = titlebar();

      MotionGlobalConfig.skipAnimations = false;
      fireEvent.click(screen.getByRole('button', { name: `Minimize ${stored().title}` }));
      down(bar, 400, 100);
      move(bar, 450, 120);
      expect(flag()).toBe(false);
      expect(Element.prototype.setPointerCapture).not.toHaveBeenCalled();

      await waitFor(() => expect(stored().isMinimized).toBe(true), { timeout: 3000 });
      expect(stored().position).toEqual(START);
    } finally {
      unregister();
    }
  });

  it('a store minimize mid-drag commits the last drag position, not the exit offset', async () => {
    openAboutMe();
    render(<PresenceHost />);
    await waitFor(() => expect(windowEl().style.opacity).toBe('1'));
    const bar = titlebar();

    down(bar, 400, 100);
    move(bar, 450, 100);
    MotionGlobalConfig.skipAnimations = false;
    // recruiterTour minimizes through the store directly.
    act(() => useOSStore.getState().minimizeWindow(stored().id));
    // Moves during the exit are ignored; the exit owns x/y now.
    move(bar, 700, 300);

    await waitFor(() => expect(document.querySelector('[data-window]')).toBeNull(), { timeout: 3000 });
    expect(flag()).toBe(false);
    expect(stored().position).toEqual({ x: START.x + 50, y: START.y });
  });

  it('a store minimize mid-press with no move writes no position', async () => {
    openAboutMe();
    render(<PresenceHost />);
    await waitFor(() => expect(windowEl().style.opacity).toBe('1'));
    const bar = titlebar();
    const { counts, unsub } = trackStore();

    down(bar, 400, 100);
    MotionGlobalConfig.skipAnimations = false;
    act(() => useOSStore.getState().minimizeWindow(stored().id));

    await waitFor(() => expect(document.querySelector('[data-window]')).toBeNull(), { timeout: 3000 });
    unsub();
    expect(flag()).toBe(false);
    expect(counts.positionWrites).toBe(0);
    expect(stored().position).toEqual(START);
  });

  it('releasing a drag after the close started does not cancel the exit', async () => {
    openAboutMe();
    render(<PresenceHost />);
    await waitFor(() => expect(windowEl().style.opacity).toBe('1'));
    const bar = titlebar();

    down(bar, 400, 100);
    move(bar, 450, 100);
    MotionGlobalConfig.skipAnimations = false;
    act(() => useOSStore.getState().closeWindow(stored().id));
    up(bar, 450, 100);
    expect(flag()).toBe(false);

    await waitFor(() => expect(document.querySelector('[data-window]')).toBeNull(), { timeout: 3000 });
  });
});
