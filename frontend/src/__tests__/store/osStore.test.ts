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
