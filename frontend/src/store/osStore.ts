import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appRegistry, getAppLabel } from '@/lib/appRegistry';
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

    const newWindow: WindowState = {
      id: windowId,
      title: label.windowTitle,
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      position: reg?.defaultPosition ?? { x: 100, y: 100 },
      size: reg?.defaultSize ?? { width: 600, height: 400 },
      zIndex: currentZIndex,
      appType,
      ...customProps,
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
    const currentZIndex = get().nextZIndex;

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
    }),
    {
      name: 'portfolio-os-windows', // localStorage key — session layout persistence
      // Boot state is intentionally NOT persisted: the boot sequence always
      // replays. Only the window layout is restored.
      partialize: (state) => ({
        windows: state.windows,
        activeWindowId: state.activeWindowId,
        nextZIndex: state.nextZIndex,
        windowCounter: state.windowCounter,
      }),
      // Drop any persisted window whose app no longer exists in the registry,
      // so a renamed/removed app can never wedge a restore.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<OSStore>;
        const windows = (p.windows ?? []).filter(
          (w) => !!appRegistry[w.appType]
        );
        return { ...current, ...p, windows, isBooted: false };
      },
    }
  )
);
