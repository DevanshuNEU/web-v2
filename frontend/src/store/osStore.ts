import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appRegistry, getAppLabel } from '@/lib/appRegistry';
import { fitWindow, type WindowBounds } from '@/lib/windowGeometry';
import type { WindowState, AppType } from '../../../shared/types';

interface OSStore {
  // Boot
  isBooted: boolean;
  setBooted: () => void;

  // Window Management
  windows: WindowState[];
  activeWindowId: string | null;
  nextZIndex: number;
  windowCounter: number;

  // Window Actions
  openWindow: (appType: AppType, customProps?: Partial<WindowState>) => void;
  closeWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string) => void;
  updateWindowPosition: (windowId: string, position: { x: number; y: number }) => void;
  updateWindowSize: (windowId: string, size: { width: number; height: number }) => void;
  snapWindow: (
    windowId: string,
    bounds: { x: number; y: number; width: number; height: number }
  ) => void;
  setWindowBounds: (windowId: string, bounds: WindowBounds) => void;
}

export const useOSStore = create<OSStore>()(
  persist(
    (set, get) => ({
  // Boot
  isBooted: false,
  setBooted: () => set({ isBooted: true }),

  // Initial State
  windows: [],
  activeWindowId: null,
  nextZIndex: 1000,
  windowCounter: 1,

  // Window Actions — reads defaults from appRegistry
  openWindow: (appType: AppType, customProps = {}) => {
    const existingWindow = get().windows.find(w => w.appType === appType && w.isOpen);

    if (existingWindow) {
      get().focusWindow(existingWindow.id);
      return;
    }

    const reg = appRegistry[appType];
    const label = getAppLabel(appType);
    const windowId = `${appType}-${get().windowCounter}`;
    const currentZIndex = get().nextZIndex;

    // Fit the requested size and position to the screen the window opens on,
    // so large defaults shrink on small screens and nothing opens off-screen.
    const size = customProps.size ?? reg?.defaultSize ?? { width: 600, height: 400 };
    const position = customProps.position ?? reg?.defaultPosition ?? { x: 100, y: 100 };
    const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
    const fit = vw > 0 && vh > 0
      ? fitWindow(size, position, vw, vh, reg?.minSize)
      : null;

    const newWindow: WindowState = {
      id: windowId,
      title: label.windowTitle,
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      zIndex: currentZIndex,
      appType,
      ...customProps,
      position: fit
        ? { x: fit.x, y: fit.y }
        : position === 'center' ? { x: 100, y: 100 } : position,
      size: fit ? { width: fit.width, height: fit.height } : size,
    };

    set(state => ({
      windows: [...state.windows, newWindow],
      activeWindowId: windowId,
      nextZIndex: currentZIndex + 1,
      windowCounter: state.windowCounter + 1,
    }));
  },

  closeWindow: (windowId: string) => {
    set(state => {
      const remainingWindows = state.windows.filter(w => w.id !== windowId);
      const newActiveId =
        remainingWindows.length > 0
          ? remainingWindows[remainingWindows.length - 1].id
          : null;

      return {
        windows: remainingWindows,
        activeWindowId: newActiveId,
      };
    });
  },

  focusWindow: (windowId: string) => {
    const { nextZIndex: currentZIndex, activeWindowId, windows } = get();

    // Already active, visible and on top: skip the set so a titlebar press does
    // not trigger a persist write or notify subscribers for nothing.
    const target = windows.find(w => w.id === windowId);
    if (
      target &&
      activeWindowId === windowId &&
      !target.isMinimized &&
      target.zIndex === currentZIndex - 1
    ) {
      return;
    }

    set(state => ({
      windows: state.windows.map(window =>
        window.id === windowId
          ? { ...window, zIndex: currentZIndex, isMinimized: false }
          : window
      ),
      activeWindowId: windowId,
      nextZIndex: currentZIndex + 1,
    }));
  },

  minimizeWindow: (windowId: string) => {
    set(state => ({
      windows: state.windows.map(window =>
        window.id === windowId
          ? { ...window, isMinimized: !window.isMinimized }
          : window
      ),
      activeWindowId:
        state.activeWindowId === windowId ? null : state.activeWindowId,
    }));
  },

  maximizeWindow: (windowId: string) => {
    set(state => ({
      windows: state.windows.map(window =>
        window.id === windowId
          ? { ...window, isMaximized: !window.isMaximized }
          : window
      ),
    }));
  },

  updateWindowPosition: (
    windowId: string,
    position: { x: number; y: number }
  ) => {
    set(state => ({
      windows: state.windows.map(window =>
        window.id === windowId ? { ...window, position } : window
      ),
    }));
  },

  updateWindowSize: (
    windowId: string,
    size: { width: number; height: number }
  ) => {
    set(state => ({
      windows: state.windows.map(window =>
        window.id === windowId ? { ...window, size } : window
      ),
    }));
  },

  // Snap a window to a computed half/quarter region and bring it to front.
  snapWindow: (windowId, bounds) => {
    const currentZIndex = get().nextZIndex;
    set(state => ({
      windows: state.windows.map(window =>
        window.id === windowId
          ? {
              ...window,
              position: { x: bounds.x, y: bounds.y },
              size: { width: bounds.width, height: bounds.height },
              isMaximized: false,
              zIndex: currentZIndex,
            }
          : window
      ),
      activeWindowId: windowId,
      nextZIndex: currentZIndex + 1,
    }));
  },

  // Commit position and size in one set, so a resize end costs a single
  // persist write instead of two.
  setWindowBounds: (windowId, bounds) => {
    set(state => ({
      windows: state.windows.map(window =>
        window.id === windowId
          ? {
              ...window,
              position: { x: bounds.x, y: bounds.y },
              size: { width: bounds.width, height: bounds.height },
            }
          : window
      ),
    }));
  },
    }),
    {
      name: 'portfolio-os-windows', // localStorage key — session layout persistence
      // Bump when the persisted shape changes; older blobs are discarded rather
      // than restored, so a stale layout can never crash a new build.
      version: 1,
      // Discard pre-v1 layouts cleanly (no noisy migrate warning, no restore).
      migrate: () => ({ windows: [], activeWindowId: null, nextZIndex: 1000, windowCounter: 1 }),
      // Boot state is intentionally NOT persisted here: page.tsx skips the
      // boot on a same-tab refresh via lib/bootSession. Only the window
      // layout is restored.
      partialize: (state) => ({
        windows: state.windows,
        activeWindowId: state.activeWindowId,
        nextZIndex: state.nextZIndex,
        windowCounter: state.windowCounter,
      }),
      // Defensive rehydration: validate every restored window and fail safe.
      // A malformed or stale persisted blob must never throw during boot or
      // hand a broken WindowState to an app. On any doubt, restore nothing.
      merge: (persisted, current) => {
        try {
          const p = (persisted ?? {}) as Partial<OSStore>;
          const windows = Array.isArray(p.windows)
            ? p.windows.filter(
                (w): w is WindowState =>
                  !!w &&
                  typeof w.id === 'string' &&
                  typeof w.appType === 'string' &&
                  !!appRegistry[w.appType as AppType] &&
                  !!w.position && typeof w.position.x === 'number' && typeof w.position.y === 'number' &&
                  !!w.size && typeof w.size.width === 'number' && typeof w.size.height === 'number'
              )
            : [];
          return { ...current, ...p, windows, isBooted: false };
        } catch {
          // Corrupt persisted state: ignore it, boot clean.
          return { ...current, isBooted: false };
        }
      },
    }
  )
);
