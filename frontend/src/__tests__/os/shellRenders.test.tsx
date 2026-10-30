// @vitest-environment jsdom

import '../setup/dom';
import { Profiler, type ComponentType } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, fireEvent, waitFor } from '@testing-library/react';
import { useOSStore } from '@/store/osStore';
import { appRegistry, getAppLabel } from '@/lib/appRegistry';

/**
 * A window commit (position, size, zIndex) must not re-render the dock, menu
 * bar, app switcher or any app body. Each shell component sits in a Profiler;
 * its onRender fires on every commit of the component or a descendant, so a
 * silent spy after a position write means nothing under it re-rendered.
 * The "still re-renders" cases keep the spies honest: they prove a write that
 * does matter (minimize, open) reaches the component.
 */

const mocks = vi.hoisted(() => ({ appRenders: 0 }));

vi.mock('@/components/os/Launchpad', () => ({ Launchpad: () => null }));
vi.mock('@/components/os/FirstVisitHint', () => ({ default: () => null }));
vi.mock('@/components/os/TrayMenus', () => ({ WifiTray: () => null, BatteryTray: () => null }));

import Taskbar from '@/components/os/Taskbar';
import MenuBar from '@/components/os/MenuBar';
import AppSwitcher from '@/components/os/AppSwitcher';
import WindowManager from '@/components/os/WindowManager';

const reset = () =>
  useOSStore.setState({
    windows: [],
    activeWindowId: null,
    nextZIndex: 1000,
    windowCounter: 1,
    isBooted: false,
  });

function openAboutMe() {
  useOSStore.getState().openWindow('about-me');
  return useOSStore.getState().windows[0].id;
}

/** Renders `ui` inside a Profiler and returns the spy, cleared after mount. */
function profile(ui: React.ReactNode) {
  const spy = vi.fn();
  const utils = render(
    <Profiler id="shell" onRender={spy}>
      {ui}
    </Profiler>
  );
  spy.mockClear();
  return { spy, ...utils };
}

beforeEach(() => {
  reset();
  mocks.appRenders = 0;
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Taskbar', () => {
  it('does not re-render on a position, size or zIndex write, but does on minimize', () => {
    const id = openAboutMe();
    const { spy } = profile(<Taskbar />);

    act(() => useOSStore.getState().updateWindowPosition(id, { x: 5, y: 40 }));
    act(() => useOSStore.getState().updateWindowSize(id, { width: 500, height: 400 }));
    act(() => useOSStore.getState().focusWindow(id));
    act(() => useOSStore.getState().snapWindow(id, { x: 0, y: 28, width: 500, height: 600 }));
    expect(spy).not.toHaveBeenCalled();

    act(() => useOSStore.getState().minimizeWindow(id));
    expect(spy).toHaveBeenCalled();
  });

  it('adds an unpinned running app to the dock and drops it on close', () => {
    const { container } = render(<Taskbar />);
    const before = container.querySelectorAll('button').length;
    // Pick an app that is not pinned in the dock.
    const unpinned = (Object.keys(appRegistry) as (keyof typeof appRegistry)[]).find(
      (t) => !appRegistry[t].pinnedToDock
    )!;
    act(() => useOSStore.getState().openWindow(unpinned));
    expect(container.querySelectorAll('button').length).toBe(before + 1);
    act(() => useOSStore.getState().closeWindow(useOSStore.getState().windows[0].id));
    expect(container.querySelectorAll('button').length).toBe(before);
  });

  it('focuses the open window on a dock click and opens one otherwise', () => {
    const id = openAboutMe();
    useOSStore.getState().openWindow('projects');
    const { getByLabelText } = render(<Taskbar />);
    const zBefore = useOSStore.getState().windows.find((w) => w.id === id)!.zIndex;
    fireEvent.click(getByLabelText(new RegExp(`^${getAppLabel('about-me').title}`)));
    expect(useOSStore.getState().windows.find((w) => w.id === id)!.zIndex).toBeGreaterThan(zBefore);
    expect(useOSStore.getState().activeWindowId).toBe(id);

    // A pinned app with no window yet gets one opened and focused.
    expect(useOSStore.getState().windows.some((w) => w.appType === 'contact')).toBe(false);
    fireEvent.click(getByLabelText(new RegExp(`^${getAppLabel('contact').title}$`)));
    const opened = useOSStore.getState().windows.filter((w) => w.appType === 'contact');
    expect(opened).toHaveLength(1);
    expect(useOSStore.getState().activeWindowId).toBe(opened[0].id);
  });
});

describe('MenuBar', () => {
  it('does not re-render on a position write, but does when another app opens', () => {
    const id = openAboutMe();
    const { spy } = profile(<MenuBar />);

    act(() => useOSStore.getState().updateWindowPosition(id, { x: 5, y: 40 }));
    expect(spy).not.toHaveBeenCalled();

    act(() => useOSStore.getState().openWindow('projects'));
    expect(spy).toHaveBeenCalled();
  });

  it('shows the active app name and clears it when that window is minimized', async () => {
    const id = openAboutMe();
    const { container } = render(<MenuBar />);
    const label = getAppLabel('about-me').windowTitle;
    expect(container.textContent).toContain(label);
    act(() => useOSStore.getState().minimizeWindow(id));
    await waitFor(() => expect(container.textContent).not.toContain(label));
  });
});

describe('AppSwitcher', () => {
  it('does not re-render on a position write', () => {
    const id = openAboutMe();
    const { spy } = profile(<AppSwitcher />);

    act(() => useOSStore.getState().updateWindowPosition(id, { x: 5, y: 40 }));
    act(() => useOSStore.getState().focusWindow(id));
    expect(spy).not.toHaveBeenCalled();
  });

  it('lists windows most recently used first at the moment it opens, Desktop last', () => {
    const a = openAboutMe();
    useOSStore.getState().openWindow('projects');
    const b = useOSStore.getState().windows.find((w) => w.appType === 'projects')!.id;
    useOSStore.getState().openWindow('skills-dashboard');
    const c = useOSStore.getState().windows.find((w) => w.appType === 'skills-dashboard')!.id;
    useOSStore.getState().focusWindow(a);
    useOSStore.getState().minimizeWindow(b);

    const { container } = render(<AppSwitcher />);
    const announced = () => container.querySelector('[aria-live]')!.textContent;
    const titleOf = (id: string) => useOSStore.getState().windows.find((w) => w.id === id)!.title;
    const press = () => act(() => void fireEvent.keyDown(document, { key: 'Tab', altKey: true }));

    // Order: a (focused, top), c (visible), b (minimized), Desktop. Opening
    // lands on the previous window, then each Tab walks down the list.
    press();
    expect(announced()).toBe(`Switch to ${titleOf(c)}`);
    press();
    expect(announced()).toBe(`Switch to ${titleOf(b)}`);
    press();
    expect(announced()).toBe('Switch to Desktop');
  });
});

describe('WindowManager', () => {
  it('re-renders window chrome on a position write but not the app body', () => {
    const original = appRegistry['about-me'].component;
    const Counting: ComponentType = () => {
      mocks.appRenders += 1;
      return <div data-testid="counting-app" />;
    };
    appRegistry['about-me'].component = Counting as unknown as typeof original;

    try {
      const id = openAboutMe();
      const { spy, getByTestId } = profile(<WindowManager />);
      expect(getByTestId('counting-app')).toBeInTheDocument();
      const baseline = mocks.appRenders;
      expect(baseline).toBeGreaterThan(0);

      act(() => useOSStore.getState().updateWindowPosition(id, { x: 5, y: 40 }));
      act(() => useOSStore.getState().updateWindowSize(id, { width: 500, height: 400 }));
      act(() => useOSStore.getState().focusWindow(id));

      // The chrome did re-render (the Profiler saw it), the app did not.
      expect(spy).toHaveBeenCalled();
      expect(mocks.appRenders).toBe(baseline);
    } finally {
      appRegistry['about-me'].component = original;
    }
  });
});
