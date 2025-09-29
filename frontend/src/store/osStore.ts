import { create } from 'zustand';
import type { WindowState, AppType, DisplaySettings } from '../../../shared/types';

interface OSStore {
  // Window Management
  windows: WindowState[];
  activeWindowId: string | null;
  nextZIndex: number;
  windowCounter: number;
  
  // Display Settings
  displaySettings: DisplaySettings;
  
  // Window Actions
  openWindow: (appType: AppType, customProps?: Partial<WindowState>) => void;
  closeWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string) => void;
  updateWindowPosition: (windowId: string, position: { x: number; y: number }) => void;
  updateWindowSize: (windowId: string, size: { width: number; height: number }) => void;
  
  // Display Actions
  updateDisplaySettings: (settings: Partial<DisplaySettings>) => void;
  toggleTheme: () => void;
}

// Default window configurations for each app type
const defaultWindowConfigs: Record<AppType, Partial<WindowState>> = {
  'about-me': {
    title: 'About Me.app',
    size: { width: 600, height: 500 },
    position: { x: 100, y: 100 }
  },
  'projects': {
    title: 'My Projects',
    size: { width: 800, height: 600 },
    position: { x: 150, y: 120 }
  },
  'skills-dashboard': {
    title: 'Skills Dashboard.app',
    size: { width: 700, height: 550 },
    position: { x: 200, y: 140 }
  },
  'network-monitor': {
    title: 'Network Monitor.app',
    size: { width: 650, height: 500 },
    position: { x: 250, y: 160 }
  },
  'contact': {
    title: 'Contact.app',
    size: { width: 500, height: 400 },
    position: { x: 300, y: 180 }
  },
  'terminal': {
    title: 'Terminal.app',
    size: { width: 700, height: 450 },
    position: { x: 180, y: 200 }
  },
  'games': {
    title: 'Games.app',
    size: { width: 600, height: 500 },
    position: { x: 220, y: 160 }
  },
  'display-options': {
    title: 'Display Options',
    size: { width: 550, height: 450 },
    position: { x: 350, y: 200 }
  }
};

export const useOSStore = create<OSStore>((set, get) => ({
  // Initial State
  windows: [],
  activeWindowId: null,
  nextZIndex: 1000,
  windowCounter: 1,
  
  displaySettings: {
    theme: 'light',
    wallpaper: 'posthog-clean',
    animationsEnabled: true,
    soundEnabled: false,
    analyticsEnabled: true
  },

  // Window Actions
  openWindow: (appType: AppType, customProps = {}) => {
    const existingWindow = get().windows.find(w => w.appType === appType && w.isOpen);
    
    if (existingWindow) {
      // Focus existing window instead of creating new one
      get().focusWindow(existingWindow.id);
      return;
    }

    const windowId = `${appType}-${get().windowCounter}`;
    const defaultConfig = defaultWindowConfigs[appType];
    const currentZIndex = get().nextZIndex;
    
    const newWindow: WindowState = {
      id: windowId,
      title: defaultConfig.title || appType,
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      position: defaultConfig.position || { x: 100, y: 100 },
      size: defaultConfig.size || { width: 600, height: 400 },
      zIndex: currentZIndex,
      appType,
      ...customProps
    };

    set(state => ({
      windows: [...state.windows, newWindow],
      activeWindowId: windowId,
      nextZIndex: currentZIndex + 1,
      windowCounter: state.windowCounter + 1
    }));
  },

  closeWindow: (windowId: string) => {
    set(state => {
      const remainingWindows = state.windows.filter(w => w.id !== windowId);
      const newActiveId = remainingWindows.length > 0 
        ? remainingWindows[remainingWindows.length - 1].id 
        : null;
      
      return {
        windows: remainingWindows,
        activeWindowId: newActiveId
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
      nextZIndex: currentZIndex + 1
    }));
  },

  minimizeWindow: (windowId: string) => {
    set(state => ({
      windows: state.windows.map(window =>
        window.id === windowId
          ? { ...window, isMinimized: !window.isMinimized }
          : window
      ),
      activeWindowId: state.activeWindowId === windowId ? null : state.activeWindowId
    }));
  },

  maximizeWindow: (windowId: string) => {
    set(state => ({
      windows: state.windows.map(window =>
        window.id === windowId
          ? { ...window, isMaximized: !window.isMaximized }
          : window
      )
    }));
  },

  updateWindowPosition: (windowId: string, position: { x: number; y: number }) => {
    set(state => ({
      windows: state.windows.map(window =>
        window.id === windowId
          ? { ...window, position }
          : window
      )
    }));
  },

  updateWindowSize: (windowId: string, size: { width: number; height: number }) => {
    set(state => ({
      windows: state.windows.map(window =>
        window.id === windowId
          ? { ...window, size }
          : window
      )
    }));
  },

  // Display Actions
  updateDisplaySettings: (settings: Partial<DisplaySettings>) => {
    set(state => ({
      displaySettings: { ...state.displaySettings, ...settings }
    }));
  },

  toggleTheme: () => {
    set(state => ({
      displaySettings: {
        ...state.displaySettings,
        theme: state.displaySettings.theme === 'light' ? 'dark' : 'light'
      }
    }));
  }
}));
